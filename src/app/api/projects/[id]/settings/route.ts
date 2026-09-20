import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

const schema = z.object({
  numClips: z.number().int().min(1).max(10).optional(),
  clipLength: z.number().int().min(5).max(600).optional(),
  style: z.string().optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  captionsEnabled: z.boolean().optional(),
  captionStyle: z.string().optional(),
  captionPosition: z.enum(["top", "bottom"]).optional(),
  captionFontSize: z.number().int().min(12).max(72).optional(),
  showTitleOverlay: z.boolean().optional(),
  watermarkText: z.string().nullable().optional(),
  autoZoom: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findFirst({ where: { id: params.id, userId: user.id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  const data: any = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v;
  }
  const settings = await prisma.projectSettings.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, ...data },
    update: data,
  });
  return NextResponse.json({ settings });
}