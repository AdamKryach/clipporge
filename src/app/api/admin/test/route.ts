import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-helpers";

/**
 * Verifies whether a given integration key is actually configured on the
 * server (never returns the value — just a boolean) so the admin page can
 * report real connection status.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const which = (body as any)?.which;

  if (which === "openai") {
    const configured = !!process.env.OPENAI_API_KEY;
    return NextResponse.json({ ok: configured, message: configured ? "OpenAI Whisper key is configured" : "No OpenAI key configured (offline engine active)" });
  }
  if (which === "stripe") {
    const configured = !!process.env.STRIPE_SECRET_KEY;
    return NextResponse.json({ ok: configured, message: configured ? "Stripe key is configured" : "Stripe not configured (mock billing active)" });
  }
  return NextResponse.json({ error: "Unknown integration" }, { status: 400 });
}