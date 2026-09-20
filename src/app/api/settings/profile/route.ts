import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name.trim() } });
  return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } });
}