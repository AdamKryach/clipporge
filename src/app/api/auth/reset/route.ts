import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid token or password" }, { status: 400 });

  const record = await prisma.resetToken.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.resetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);
  return NextResponse.json({ ok: true });
}