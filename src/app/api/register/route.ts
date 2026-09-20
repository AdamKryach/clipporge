import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureSettings, ensureSubscription } from "@/lib/billing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  if (!rateLimit("register:" + clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash,
    },
  });
  await Promise.all([ensureSubscription(user.id), ensureSettings(user.id)]);
  return NextResponse.json({ ok: true }, { status: 201 });
}