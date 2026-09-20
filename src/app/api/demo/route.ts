import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma, absPath } from "@/lib/db";
import { ensureDemoVideo } from "@/lib/demo";
import { probeMedia } from "@/lib/ffmpeg";
import { runAnalysisPipeline, clipOptionsFrom } from "@/lib/pipeline";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * "Try Demo": bundles a generated sample video and runs the full clipping
 * pipeline so users can test the entire workflow without uploading a file.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit("demo:" + user.id, 3, 60_000)) {
    return NextResponse.json({ error: "Too many demo runs. Try again soon." }, { status: 429 });
  }

  const relPath = `users/${user.id}/demo/sample.mp4`;
  const outAbs = await ensureDemoVideo(relPath);
  const info = await probeMedia(outAbs);

  const project = await prisma.project.create({
    data: { userId: user.id, name: "Demo Project", status: "processing" },
  });
  const video = await prisma.video.create({
    data: {
      projectId: project.id,
      userId: user.id,
      originalName: "sample-demo.mp4",
      storagePath: relPath,
      mimeType: "video/mp4",
      sizeBytes: BigInt(0),
      durationSec: info.durationSec,
      width: info.width,
      height: info.height,
      kind: "demo",
    },
  });
  await prisma.project.update({ where: { id: project.id }, data: { sourceVideoId: video.id } });

  const body = await req.json().catch(() => ({}));
  const opts = clipOptionsFrom({
    numClips: (body as any)?.numClips,
    clipLength: (body as any)?.clipLength,
    style: (body as any)?.style,
    aspectRatio: (body as any)?.aspectRatio,
    durationSec: info.durationSec,
  });

  const job = await prisma.processingJob.create({
    data: { projectId: project.id, userId: user.id, type: "analyze", stage: "queued", status: "queued", meta: JSON.stringify({ opts, demo: true }) },
  });
  void runAnalysisPipeline(job.id, project.id, video.id, opts).catch((e) => console.error("Demo pipeline failed:", e));

  return NextResponse.json({ ok: true, projectId: project.id, jobId: job.id }, { status: 201 });
}