// Minimal in-memory fixed-window rate limiter.
//
// NOTE: This is a single-process placeholder (per docs/06 "Rate Limiting: TBD").
// It is not shared across server instances and the bucket map grows unbounded.
// Replace with a distributed store (e.g. Redis) before multi-instance deploy.

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}
