export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * In-memory sliding-window limiter. Protects skills (and the network calls
 * behind them) from runaway loops or abusive command bursts.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit = 12,
    private readonly windowMs = 60_000,
  ) {}

  check(key: string): RateLimitDecision {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      return { allowed: false, retryAfterMs: this.windowMs - (now - recent[0]) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key?: string) {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}
