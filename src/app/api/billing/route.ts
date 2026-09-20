import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { setPlan, billingProvider } from "@/lib/billing";
import { getPlan, PLANS, PLAN_ORDER, PlanId } from "@/lib/plan";

const schema = z.object({ plan: z.enum(["free", "pro", "business"]) });

/**
 * Change the user's plan. In "mock" billing mode this applies the change
 * directly so credits/limits can be tested end-to-end. In "stripe" mode it
 * creates a checkout session and awaits confirmation via webhook.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  const plan = parsed.data.plan;

  const provider = billingProvider();
  try {
    const checkout = await provider.createCheckout(user.id, plan);
    if (checkout.url.startsWith("/settings/billing?mock_checkout=1")) {
      // mock mode: apply immediately
      await setPlan(user.id, plan);
      return NextResponse.json({ ok: true, applied: true, plan });
    }
    return NextResponse.json({ ok: true, applied: false, url: checkout.url, plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Billing error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    plans: PLAN_ORDER.map((id) => PLANS[id]),
    current: subscription?.plan ?? "free",
    billingProvider: process.env.BILLING_PROVIDER || "mock",
  });
}