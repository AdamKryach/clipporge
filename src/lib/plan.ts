// Billing plans & credit/usage limits
// These values are the source of truth used to enforce feature gates.

export type PlanId = "free" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // USD
  videosPerMonth: number;
  maxVideoMinutes: number;
  maxClipLengthSec: number;
  hdExports: boolean;
  watermarkFree: boolean;
  priorityProcessing: boolean;
  maxConcurrentJobs: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    videosPerMonth: 3,
    maxVideoMinutes: 10,
    maxClipLengthSec: 90,
    hdExports: false,
    watermarkFree: false,
    priorityProcessing: false,
    maxConcurrentJobs: 1,
    features: [
      "3 videos / month",
      "Up to 10 minutes per video",
      "Up to 90s clips",
      "Watermarked exports",
      "Standard captions",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 24,
    videosPerMonth: 50,
    maxVideoMinutes: 120,
    maxClipLengthSec: 600,
    hdExports: true,
    watermarkFree: true,
    priorityProcessing: false,
    maxConcurrentJobs: 3,
    features: [
      "50 videos / month",
      "Up to 2 hours per video",
      "No watermark",
      "HD exports",
      "All caption styles",
      "Karaoke captions",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price: 79,
    videosPerMonth: 500,
    maxVideoMinutes: 360,
    maxClipLengthSec: 600,
    hdExports: true,
    watermarkFree: true,
    priorityProcessing: true,
    maxConcurrentJobs: 8,
    features: [
      "500 videos / month",
      "Up to 6 hours per video",
      "Priority processing",
      "Team seats",
      "API access",
      "Custom watermark",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export function getPlan(id?: string | null): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}

export interface UsageSummary {
  plan: Plan;
  videosThisMonth: number;
  clipsThisMonth: number;
  exportsThisMonth: number;
  videosRemaining: number;
  month: string;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}