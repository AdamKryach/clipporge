import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma, absPath } from "@/lib/db";
import { createZip } from "@/lib/zip";
import { ensureSubscription } from "@/lib/billing";
import { getPlan } from "@/lib/plan";
import { renderClip } from "@/lib/ffmpeg";

/**
 * Export all clips of a project, optionally re-rendered at a target
 * resolution (e.g. 1080 / 720). Returns a single zip of MP4 files.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: user.id },
    include: { clips: { include: { video: true } }, sourceVideo: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const ready = project.clips.filter((c) => c.status === "ready" && (c.video?.storagePath || c.outputPath));
  if (!ready.length) return NextResponse.json({ error: "No finished clips to export" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const resolution = (body as any)?.resolution === 720 ? 720 : 1080;

  // plan gate: HD only on pro/business
  const sub = await ensureSubscription(user.id);
  const plan = getPlan(sub.plan);
  if (resolution === 1080 && !plan.hdExports) {
    return NextResponse.json({ error: `HD (1080p) exports require the ${plan.name} plan.` }, { status: 403 });
  }

  const files: { name: string; data: Uint8Array }[] = [];
  for (const clip of ready) {
    const storage = clip.video?.storagePath || clip.outputPath!;
    let data: Buffer;
    if (resolution === 1080) {
      data = await fs.readFile(absPath(storage));
    } else {
      // re-render at 720p
      const src = absPath(project.sourceVideo?.storagePath || storage);
      const tmpOut = path.join("/tmp", `export-${clip.id}-${Date.now()}.mp4`);
      await renderClip(src, tmpOut, {
        start: clip.startSec,
        end: clip.endSec,
        aspectRatio: (clip.aspectRatio as any) ?? "9:16",
        width: 720,
      });
      data = await fs.readFile(tmpOut);
    }
    const safeName = (clip.title || "clip").replace(/[^a-z0-9-_ ]/gi, "_").replace(/\s+/g, "_");
    files.push({ name: `${safeName}.mp4`, data });
  }

  const zip = createZip(files);
  const projectName = (project.name || "project").replace(/[^a-z0-9-_ ]/gi, "_").replace(/\s+/g, "_");
  return new NextResponse(new Blob([new Uint8Array(zip)]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${projectName}-clips.zip"`,
    },
  });
}