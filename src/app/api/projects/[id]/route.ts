import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getOwnedProject } from "@/lib/api-helpers";
import { prisma, toPlain } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await getOwnedProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ project: toPlain(project) });
}

const renameSchema = z.object({ name: z.string().min(1).max(80) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await getOwnedProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ project: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await getOwnedProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await prisma.project.delete({ where: { id: project.id } });
  return NextResponse.json({ ok: true });
}