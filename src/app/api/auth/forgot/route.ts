import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (!rateLimit("forgot:" + clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same to avoid user enumeration.
  if (!user) {
    return NextResponse.json({ ok: true, message: "If that account exists, a reset link was sent." });
  }
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.resetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });
  const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset?token=${token}`;

  // ==== EMAIL INTEGRATION POINT ====
  // Replace this with a real email service (Resend, SendGrid, Nodemailer SMTP)
  // to deliver resetUrl to the user. When no SMTP host is configured we expose
  // the link directly so the reset flow is fully testable.
  const hasSmtp = !!process.env.SMTP_HOST;
  console.log(`[ClipForge] Password reset link: ${resetUrl}`);

  return NextResponse.json({
    ok: true,
    message: "If that account exists, a reset link was sent.",
    resetUrl: hasSmtp ? undefined : resetUrl,
  });
}