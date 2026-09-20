import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getOwnedProject } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { runAnalysisPipeline, clipOptionsFrom } from "@/lib/pipeline";
import { ensureSubscription } from "@/lib/billing";
import { getPlan } from "@/lib/plan";
import { probeMedia } from "@/lib/ffmpeg";
import { absPath } from "@/lib/db";

const schema = z.object({
  numClips: z.number().int().min(1).max(10).optional(),
  clipLength: z.number().int().min(5).max(600).optional(),
  style: z.string().optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await getOwnedProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!project.sourceVideoId) return NextResponse.json({ error: "No source video uploaded" }, { status: 400 });
  if (project.status === "processing" || project.status === "running") {
    return NextResponse.json({ error: "Project is already processing" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const opts = clipOptionsFrom({
    numClips: parsed.success ? parsed.data.numClips : undefined,
    clipLength: parsed.success ? parsed.data.clipLength : undefined,
    style: parsed.success ? parsed.data.style : undefined,
    aspectRatio: parsed.success ? parsed.data.aspectRatio : undefined,
  });

  // plan enforcement: clip length must be within plan max
  const sub = await ensureSubscription(user.id);
  const plan = getPlan(sub.plan);
  const maxLen = plan.maxClipLengthSec;
  if (opts.clipLength > maxLen) {
    return NextResponse.json({ error: `Your ${plan.name} plan supports clips up to ${maxLen}s.` }, { status: 403 });
  }

  // refresh duration on the video
  const video = await prisma.video.findUnique({ where: { id: project.sourceVideoId } });
  let durationSec = video?.durationSec ?? 30;
  if (video && !video.durationSec) {
    try {
      const info = await probeMedia(absPath(video.storagePath));
      durationSec = info.durationSec;
      await prisma.video.update({ where: { id: video.id }, data: { durationSec, width: info.width, height: info.height } });
    } catch {}
  }
  opts.durationSec = durationSec;

  const job = await prisma.processingJob.create({
    data: {
      projectId: project.id,
      userId: user.id,
      type: "analyze",
      stage: "queued",
      status: "queued",
      meta: JSON.stringify({ opts }),
    },
  });
  await prisma.project.update({ where: { id: project.id }, data: { status: "processing", error: null } });

  // update project settings with chosen options for rendering consistency
  await prisma.projectSettings.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, numClips: opts.numClips, clipLength: opts.clipLength, style: opts.style, aspectRatio: opts.aspectRatio },
    update: { numClips: opts.numClips, clipLength: opts.clipLength, style: opts.style, aspectRatio: opts.aspectRatio },
  });

  // Run pipeline in the background so the request returns immediately.
  void runAnalysisPipeline(job.id, project.id, project.sourceVideoId, opts).catch((e) => {
    console.error("Pipeline failed:", e);
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}