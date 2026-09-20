import { prisma } from "./db";
import { getPlan, PLANS, PlanId, currentMonth } from "./plan";

/** Ensure every user has a subscription row + sensible defaults. */
export async function ensureSubscription(userId: string) {
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: {
        userId,
        plan: "free",
        videoLimitMonthly: PLANS.free.videosPerMonth,
        maxVideoMinutes: PLANS.free.maxVideoMinutes,
        maxClipLengthSec: PLANS.free.maxClipLengthSec,
        hdExports: PLANS.free.hdExports,
        watermarkFree: PLANS.free.watermarkFree,
        priorityProcessing: PLANS.free.priorityProcessing,
      },
    });
  }
  return sub;
}

/** Ensure default settings row. */
export async function ensureSettings(userId: string) {
  let s = await prisma.userSettings.findUnique({ where: { userId } });
  if (!s) {
    s = await prisma.userSettings.create({
      data: {
        userId,
        defaultClipLength: 30,
        defaultAspectRatio: "9:16",
        captionStyle: "clean",
        captionPosition: "bottom",
        captionFontSize: 18,
        showTitleOverlay: true,
        autoZoom: true,
        notifications: true,
      },
    });
  }
  return s;
}

export interface Usage {
  plan: string;
  videosThisMonth: number;
  clipsThisMonth: number;
  exportsThisMonth: number;
  videosRemaining: number;
  maxVideos: number;
  month: string;
}

/** Count usage for the current month and return remaining credits. */
export async function getUsage(userId: string): Promise<Usage> {
  const sub = await ensureSubscription(userId);
  const month = currentMonth();
  const agg = await prisma.usageRecord.aggregate({
    where: { userId, month },
    _sum: { amount: true },
  });
  const videosThisMonth = agg._sum.amount ?? 0;
  const plan = getPlan(sub.plan);
  return {
    plan: sub.plan,
    videosThisMonth,
    clipsThisMonth: 0,
    exportsThisMonth: 0,
    videosRemaining: Math.max(0, plan.videosPerMonth - videosThisMonth),
    maxVideos: plan.videosPerMonth,
    month,
  };
}

/** Records a usage event, returns false if it would exceed the plan cap. */
export async function consumeUsage(
  userId: string,
  kind: "video" | "clip" | "export",
  amount = 1
): Promise<boolean> {
  const sub = await ensureSubscription(userId);
  const plan = getPlan(sub.plan);
  const month = currentMonth();
  const used = await prisma.usageRecord.aggregate({
    where: { userId, month, kind: "video" },
    _sum: { amount: true },
  });
  const totalUsed = used._sum.amount ?? 0;
  if (kind === "video" && totalUsed + amount > plan.videosPerMonth) {
    return false;
  }
  await prisma.usageRecord.create({
    data: { userId, kind, amount, month },
  });
  return true;
}

/**
 * Billing provider interface.
 * ClipForge ships with a `mock` provider so the whole billing + credit flow
 * can be exercised end-to-end with no external keys. To go live, set
 * BILLING_PROVIDER=stripe and implement these using Stripe checkout + webhooks
 * (the integration points are marked below).
 */
export interface BillingProvider {
  createCheckout(userId: string, plan: PlanId): Promise<{ url: string }>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
}

const mockProvider: BillingProvider = {
  async createCheckout() {
    // MOCK: simulates redirecting to a payment page.
    return { url: "/settings/billing?mock_checkout=1" };
  },
  async cancelSubscription() {
    return true;
  },
};

const stripeProvider: BillingProvider = {
  async createCheckout(userId, plan) {
    // ==== STRIPE INTEGRATION POINT ====
    // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({ ... });
    // return { url: session.url };
    throw new Error(
      "Stripe is not configured. Set BILLING_PROVIDER=mock or configure STRIPE_SECRET_KEY."
    );
  },
  async cancelSubscription(subscriptionId) {
    // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    // await stripe.subscriptions.cancel(subscriptionId);
    return true;
  },
};

export function billingProvider(): BillingProvider {
  const which = process.env.BILLING_PROVIDER || "mock";
  return which === "stripe" ? stripeProvider : mockProvider;
}

/** Change a user's plan (admin/checkout path). */
export async function setPlan(userId: string, plan: PlanId) {
  const p = getPlan(plan);
  const sub = await ensureSubscription(userId);
  const update = {
    plan,
    videoLimitMonthly: p.videosPerMonth,
    maxVideoMinutes: p.maxVideoMinutes,
    maxClipLengthSec: p.maxClipLengthSec,
    hdExports: p.hdExports,
    watermarkFree: p.watermarkFree,
    priorityProcessing: p.priorityProcessing,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
  if (sub.id) {
    await prisma.subscription.update({ where: { id: sub.id }, data: update });
  }
  return prisma.subscription.findUnique({ where: { userId } });
}