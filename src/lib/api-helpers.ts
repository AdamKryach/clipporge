import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { NextResponse } from "next/server";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(message = "Bad request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Ensure a project belongs to the user, else 404. */
export async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      sourceVideo: true,
      videos: { orderBy: { createdAt: "asc" } },
      clips: {
        orderBy: { createdAt: "asc" },
        include: { video: true, segments: { orderBy: { index: "asc" } } },
      },
      transcript: true,
      settings: true,
      jobs: { orderBy: { createdAt: "desc" } },
    },
  });
}