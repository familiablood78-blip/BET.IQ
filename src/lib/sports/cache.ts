/**
 * BetIQ Sports Data — Caching & Resilience Layer
 *
 * Provides TTL-based caching, exponential-backoff retry, and rate limiting
 * for all sports data provider calls.
 */

// ─── TTL Cache ────────────────────────────────────────────────────────────────

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  private hits = 0;
  private misses = 0;

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    return { hits: this.hits, misses: this.misses, size: this.store.size };
  }

  /** Evict expired entries — call periodically to prevent memory buildup */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// ─── Retry Logic ──────────────────────────────────────────────────────────────

export interface RetryOptions {
  attempts?: number;      // default 3
  baseDelayMs?: number;   // default 500
  maxDelayMs?: number;    // default 5000
  factor?: number;        // default 2 (exponential)
}

/**
 * Execute a function with exponential-backoff retry.
 * Returns the result on success, or throws the last error after all retries fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 5000;
  const factor = opts.factor ?? 2;

  let lastError: Error = new Error("Unknown error");

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < attempts - 1) {
        const delay = Math.min(baseDelayMs * Math.pow(factor, i), maxDelayMs);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

export class RateLimiter {
  private calls: number[] = [];

  constructor(
    private maxCallsPerWindow: number = 30,
    private windowMs: number = 60_000,
  ) {}

  /**
   * Check if a call is allowed. If not, returns the ms to wait.
   * If allowed, records the call and returns 0 (can proceed immediately).
   */
  check(): number {
    const now = Date.now();
    // Evict expired call timestamps
    this.calls = this.calls.filter((t) => now - t < this.windowMs);

    if (this.calls.length >= this.maxCallsPerWindow) {
      const oldest = this.calls[0];
      return this.windowMs - (now - oldest) + 50; // add 50ms buffer
    }

    this.calls.push(now);
    return 0;
  }

  /** Wait until a call is allowed, then proceed */
  async wait(): Promise<void> {
    const waitMs = this.check();
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs));
      // Re-check to record the call
      this.check();
    }
  }

  reset(): void {
    this.calls = [];
  }

  available(): number {
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxCallsPerWindow - this.calls.length);
  }
}

// ─── Shared Instances ─────────────────────────────────────────────────────────

/** 30-second TTL for odds data (changes frequently) */
export const oddsCache = new TtlCache<any>(30_000);

/** 5-minute TTL for player/team stats (changes less frequently) */
export const statsCache = new TtlCache<any>(300_000);

/** 1-minute TTL for game schedules */
export const gamesCache = new TtlCache<any>(60_000);

/** Global rate limiter: 30 calls per 60-second window */
export const rateLimiter = new RateLimiter(30, 60_000);
