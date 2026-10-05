/**
 * Lightweight, dependency-free sliding-window rate limiter.
 *
 * Designed for the admin authentication endpoints where a full Redis/Upstash
 * integration would be overkill. State lives in a module-scoped `Map`, so it
 * is shared across requests served by the same Node process. It is
 * intentionally best-effort: on serverless platforms with multiple isolated
 * instances each instance keeps its own counters. That is still enough to
 * stop rapid, single-client brute-force / OTP-spam from one IP or against one
 * email.
 *
 * Every window is a rolling window: only timestamps newer than
 * `now - windowMs` are retained, so there is no fixed reset boundary an
 * attacker can time their bursts around.
 */
export class SlidingWindowRateLimiter {
  /** key -> ascending list of event timestamps (ms). */
  private readonly buckets = new Map<string, number[]>();

  /**
   * @param limit     Maximum number of events permitted inside the window.
   * @param windowMs  Rolling window size in milliseconds.
   * @param maxKeys   Hard cap on tracked keys; oldest keys are evicted first
   *                  to bound memory usage under sustained abuse.
   */
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000
  ) {}

  private prune(key: string, now: number): number[] {
    const cutoff = now - this.windowMs;
    const existing = this.buckets.get(key);
    if (!existing || existing.length === 0) return [];
    // Timestamps are appended in order, so the first fresh index bounds the rest.
    let firstFresh = 0;
    while (firstFresh < existing.length && existing[firstFresh] <= cutoff) {
      firstFresh += 1;
    }
    if (firstFresh === 0) return existing;
    const fresh = existing.slice(firstFresh);
    if (fresh.length === 0) this.buckets.delete(key);
    else this.buckets.set(key, fresh);
    return fresh;
  }

  /** Number of events currently inside the window for `key`. */
  count(key: string, now: number = Date.now()): number {
    return this.prune(key, now).length;
  }

  /** True once `key` has reached the configured limit inside the window. */
  isLimited(key: string, now: number = Date.now()): boolean {
    return this.prune(key, now).length >= this.limit;
  }

  /**
   * Milliseconds until the caller may retry. Returns 0 when the key is not
   * currently limited.
   */
  retryAfterMs(key: string, now: number = Date.now()): number {
    const fresh = this.prune(key, now);
    if (fresh.length < this.limit) return 0;
    return Math.max(0, fresh[0] + this.windowMs - now);
  }

  /** Records one event for `key` and returns the post-record count. */
  record(key: string, now: number = Date.now()): number {
    const fresh = this.prune(key, now);
    fresh.push(now);
    this.buckets.set(key, fresh);
    this.evictOverflow();
    return fresh.length;
  }

  /** Clears all recorded events for `key` (e.g. after a successful login). */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  private evictOverflow(): void {
    if (this.buckets.size <= this.maxKeys) return;
    const excess = this.buckets.size - this.maxKeys;
    let removed = 0;
    for (const key of this.buckets.keys()) {
      this.buckets.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

/**
 * Best-effort client IP extraction from common proxy headers.
 * Falls back to "unknown" so a limiter still functions (keyed globally) when
 * no forwarding header is present.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const first = vercelIp.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
