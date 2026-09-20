import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const src = await prisma.project.findFirst({ where: { id: params.id, userId: user.id } });
  if (!src) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: `${src.name} (copy)`,
      status: "draft",
      totalClips: 0,
    },
  });
  const settings = await prisma.projectSettings.findUnique({ where: { projectId: src.id } });
  await prisma.projectSettings.create({
    data: {
      projectId: project.id,
      numClips: settings?.numClips ?? 5,
      clipLength: settings?.clipLength ?? 30,
      style: settings?.style ?? "auto",
      aspectRatio: settings?.aspectRatio ?? "9:16",
      captionsEnabled: settings?.captionsEnabled ?? true,
      captionStyle: settings?.captionStyle ?? "modern",
      captionPosition: settings?.captionPosition ?? "bottom",
      captionFontSize: settings?.captionFontSize ?? 18,
      showTitleOverlay: settings?.showTitleOverlay ?? true,
      watermarkText: settings?.watermarkText,
      autoZoom: settings?.autoZoom ?? true,
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}