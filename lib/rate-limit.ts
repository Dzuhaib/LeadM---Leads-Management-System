type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  __leadmRateLimit?: Map<string, Bucket>;
};

const buckets =
  globalForRateLimit.__leadmRateLimit ?? new Map<string, Bucket>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.__leadmRateLimit = buckets;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(limit - bucket.count, 0),
    retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function rateLimitKey(userId: string, action: string) {
  return `${userId}:${action}`;
}
