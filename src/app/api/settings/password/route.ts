import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const ok = await bcrypt.compare(parsed.data.currentPassword, full.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}