import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const search = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const date = url.searchParams.get("date") || "";
  const minClips = Number(url.searchParams.get("minClips") || "0");

  const where: any = { userId: user.id };
  if (search) where.name = { contains: search };
  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    const end = new Date(d.getTime() + 24 * 3600 * 1000);
    where.createdAt = { gte: d, lt: end };
  }
  if (minClips > 0) where.totalClips = { gte: minClips };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      sourceVideo: { select: { id: true, storagePath: true, durationSec: true } },
      _count: { select: { clips: true, videos: true } },
    },
    take: 100,
  });
  return NextResponse.json({ projects });
}

const createSchema = z.object({
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  const name = parsed.success && parsed.data.name ? parsed.data.name : `Project ${new Date().toLocaleDateString()}`;
  const project = await prisma.project.create({
    data: { userId: user.id, name, status: "draft" },
  });
  await prisma.projectSettings.create({ data: { projectId: project.id } });
  return NextResponse.json({ project }, { status: 201 });
}