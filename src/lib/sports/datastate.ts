/**
 * BetIQ — Production Data State model (WS1b §1, §11, §12)
 *
 * Exactly seven states. AVAILABLE means fresh, provider-verified data only.
 * UNVERIFIED and STALE_CACHED are NEVER eligible for EV analysis. DEMO is
 * explicitly isolated from production and never reaches the EV engine.
 * No mock / synthetic / fallback / fabricated / random / demo data may ever be
 * converted into AVAILABLE.
 */
export const DataState = {
  AVAILABLE: "AVAILABLE",
  EMPTY: "EMPTY",
  TEMPORARILY_UNAVAILABLE: "TEMPORARILY_UNAVAILABLE",
  NOT_SUPPORTED: "NOT_SUPPORTED",
  DEMO: "DEMO",
  UNVERIFIED: "UNVERIFIED",
  STALE_CACHED: "STALE_CACHED",
} as const;

export type DataState = (typeof DataState)[keyof typeof DataState];

export const DATA_STATES: readonly DataState[] = [
  DataState.AVAILABLE,
  DataState.EMPTY,
  DataState.TEMPORARILY_UNAVAILABLE,
  DataState.NOT_SUPPORTED,
  DataState.DEMO,
  DataState.UNVERIFIED,
  DataState.STALE_CACHED,
];

/** Type guard: is `v` one of the seven DataState values (not a forgery). */
export function isDataState(v: unknown): v is DataState {
  return typeof v === "string" && (DATA_STATES as readonly string[]).includes(v);
}

/**
 * The ONLY states that may ever pass provider-verified data. DEMO, UNVERIFIED,
 * STALE_CACHED (and any state not in the set) can never reach EV execution.
 */
export function isEligibleForEvAnalysis(state: unknown): boolean {
  return state === DataState.AVAILABLE;
}

/**
 * Result envelope for every provider capability and production data surface.
 * `state` is provably one of the seven states; `data` is only present when the
 * state meaningfully carries it (AVAILABLE/EMPTY/DEMO). `retrievedAt` is the
 * provider/verification timestamp used for freshness — it is never rewritten
 * merely because a cached value was read.
 */
export interface DataResult<T> {
  state: DataState;
  data?: T;
  /** ISO-8601 timestamp of original retrieval/verification. Never refreshed on read. */
  retrievedAt?: string;
  /** Machine-readable reason, for observability only (e.g. "ODDS_API 503"). */
  reason?: string;
}

export function ok<T>(data: T, retrievedAt?: string): DataResult<T> {
  return { state: DataState.AVAILABLE, data, retrievedAt };
}

export function empty<T = undefined>(retrievedAt?: string): DataResult<T> {
  return { state: DataState.EMPTY, data: undefined, retrievedAt };
}

export function temporarilyUnavailable<T = undefined>(reason?: string): DataResult<T> {
  return { state: DataState.TEMPORARILY_UNAVAILABLE, reason };
}

export function notSupported<T = undefined>(reason?: string): DataResult<T> {
  return { state: DataState.NOT_SUPPORTED, reason };
}

export function demo<T>(data: T, retrievedAt?: string): DataResult<T> {
  return { state: DataState.DEMO, data, retrievedAt };
}

export function unverified<T = undefined>(reason?: string): DataResult<T> {
  return { state: DataState.UNVERIFIED, reason };
}

export function staleCached<T>(data: T, retrievedAt?: string): DataResult<T> {
  return { state: DataState.STALE_CACHED, data, retrievedAt };
}
