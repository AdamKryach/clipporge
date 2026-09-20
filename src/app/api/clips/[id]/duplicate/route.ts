import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clip = await prisma.clip.findFirst({
    where: { id: params.id, userId: user.id },
    include: { video: true, segments: { orderBy: { index: "asc" } } },
  });
  if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });

  const copy = await prisma.clip.create({
    data: {
      projectId: clip.projectId,
      userId: user.id,
      videoId: clip.videoId,
      title: `${clip.title} (copy)`,
      description: clip.description,
      hashtags: clip.hashtags,
      startSec: clip.startSec,
      endSec: clip.endSec,
      durationSec: clip.durationSec,
      engagementScore: clip.engagementScore,
      tags: clip.tags,
      status: "ready",
      aspectRatio: clip.aspectRatio,
      captionStyle: clip.captionStyle,
      captionPosition: clip.captionPosition,
      captionFontSize: clip.captionFontSize,
      titleOverlay: clip.titleOverlay,
      watermarkText: clip.watermarkText,
      autoZoom: clip.autoZoom,
      outputPath: clip.outputPath,
    },
  });
  if (clip.segments.length) {
    await prisma.clipSegment.createMany({
      data: clip.segments.map((s, i) => ({ clipId: copy.id, text: s.text, startSec: s.startSec, endSec: s.endSec, index: i })),
    });
  }
  return NextResponse.json({ clip: copy }, { status: 201 });
}