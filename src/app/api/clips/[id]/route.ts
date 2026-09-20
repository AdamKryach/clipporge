import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as fs } from "fs";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma, toPlain, absPath } from "@/lib/db";
import { renderClip, safeExtension } from "@/lib/ffmpeg";
import path from "path";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clip = await prisma.clip.findFirst({
    where: { id: params.id, userId: user.id },
    include: { video: true, segments: { orderBy: { index: "asc" } }, project: { include: { sourceVideo: true } } },
  });
  if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  return NextResponse.json({ clip: toPlain(clip) });
}

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  captionStyle: z.string().optional(),
  captionPosition: z.enum(["top", "bottom"]).optional(),
  captionFontSize: z.number().int().min(12).max(72).optional(),
  titleOverlay: z.boolean().optional(),
  watermarkText: z.string().nullable().optional(),
  autoZoom: z.boolean().optional(),
  captionTexts: z.array(z.object({ index: z.number().int(), text: z.string().max(500) })).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clip = await prisma.clip.findFirst({ where: { id: params.id, userId: user.id }, include: { project: { include: { sourceVideo: true } } } });
  if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  const updateData: any = {};
  if (d.title !== undefined) updateData.title = d.title;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.aspectRatio !== undefined) updateData.aspectRatio = d.aspectRatio;
  if (d.captionStyle !== undefined) updateData.captionStyle = d.captionStyle;
  if (d.captionPosition !== undefined) updateData.captionPosition = d.captionPosition;
  if (d.captionFontSize !== undefined) updateData.captionFontSize = d.captionFontSize;
  if (d.titleOverlay !== undefined) updateData.titleOverlay = d.titleOverlay;
  if (d.watermarkText !== undefined) updateData.watermarkText = d.watermarkText;
  if (d.autoZoom !== undefined) updateData.autoZoom = d.autoZoom;

  // timestamps & re-render
  const source = clip.project?.sourceVideo;
  let startSec = clip.startSec;
  let endSec = clip.endSec;
  if (d.startSec !== undefined) startSec = d.startSec;
  if (d.endSec !== undefined) endSec = d.endSec;
  if (d.startSec !== undefined || d.endSec !== undefined) {
    if (endSec <= startSec) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    updateData.startSec = startSec;
    updateData.endSec = endSec;
    updateData.durationSec = endSec - startSec;
    updateData.status = "processing";
  }

  const updated = await prisma.clip.update({ where: { id: clip.id }, data: updateData });

  // caption text edits
  if (d.captionTexts && d.captionTexts.length) {
    for (const c of d.captionTexts) {
      await prisma.clipSegment.updateMany({
        where: { clipId: clip.id, index: c.index },
        data: { text: c.text },
      });
    }
  }

  // re-render if timestamps or visual settings changed and we have a source
  const sourceVideo = clip.project?.sourceVideo;
  if (sourceVideo && (d.startSec !== undefined || d.endSec !== undefined || d.aspectRatio !== undefined || d.captionStyle !== undefined || d.captionPosition !== undefined || d.captionFontSize !== undefined || d.titleOverlay !== undefined || d.watermarkText !== undefined || d.autoZoom !== undefined)) {
    try {
      const srcAbs = absPath(sourceVideo.storagePath);
      const segments = await prisma.clipSegment.findMany({ where: { clipId: clip.id }, orderBy: { index: "asc" } });
      const fileName = `clip-${clip.id.slice(0, 8)}-${Date.now()}${safeExtension(sourceVideo.originalName)}`;
      const relPath = `users/${user.id}/projects/${clip.projectId}/${fileName}`;
      await fs.mkdir(absPath(path.dirname(relPath)), { recursive: true });
      await renderClip(srcAbs, absPath(relPath), {
        start: startSec,
        end: endSec,
        aspectRatio: d.aspectRatio ?? (clip.aspectRatio as any),
        captions: segments.map((s) => ({ start: s.startSec, end: s.endSec, text: s.text })),
        captionStyle: d.captionStyle ?? clip.captionStyle,
        captionPosition: d.captionPosition ?? (clip.captionPosition as any),
        captionFontSize: d.captionFontSize ?? clip.captionFontSize,
        title: d.title ?? clip.title,
        titleOverlay: d.titleOverlay ?? clip.titleOverlay,
        watermark: (d.watermarkText !== undefined ? d.watermarkText : clip.watermarkText) ?? undefined,
        autoZoom: d.autoZoom ?? clip.autoZoom,
      });
      let clipVideoId = clip.videoId;
      if (clip.videoId) {
        await prisma.video.update({ where: { id: clip.videoId }, data: { storagePath: relPath } });
      } else {
        const cv = await prisma.video.create({
          data: { projectId: clip.projectId, userId: user.id, originalName: fileName, storagePath: relPath, mimeType: "video/mp4", kind: "clip", durationSec: endSec - startSec, width: 0, height: 0, processedByClipId: clip.id },
        });
        clipVideoId = cv.id;
      }
      await prisma.clip.update({ where: { id: clip.id }, data: { status: "ready", videoId: clipVideoId } });
      updateData.status = "ready";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Render failed";
      await prisma.clip.update({ where: { id: clip.id }, data: { status: "failed" } });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const final = await prisma.clip.findUnique({ where: { id: clip.id }, include: { video: true, segments: { orderBy: { index: "asc" } } } });
  return NextResponse.json({ clip: toPlain(final) });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clip = await prisma.clip.findFirst({ where: { id: params.id, userId: user.id } });
  if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  await prisma.clip.delete({ where: { id: clip.id } });
  return NextResponse.json({ ok: true });
}