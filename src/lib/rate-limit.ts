const buckets = new Map<string, number[]>();

/**
 * Minimal in-memory sliding-window rate limiter.
 * Returns true if the request is allowed, false if it exceeds the limit.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (process.env.RATE_LIMIT_ENABLED !== "true") return true;
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}