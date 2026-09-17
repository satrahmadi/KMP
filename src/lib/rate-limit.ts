/**
 * In-memory sliding-window limiter for login attempts (FR-3 AC: "percobaan login
 * gagal berulang ... dibatasi"). Good enough for a single-process dev/demo build;
 * swap for a shared store (Redis) behind a real deployment with multiple instances.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
