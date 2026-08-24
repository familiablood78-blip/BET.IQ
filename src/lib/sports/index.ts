/**
 * BetIQ Sports Data Provider — entry point (WS1b §1, §2, §11, §12)
 *
 * Provider selection (checked in order):
 *   SPORTS_PROVIDER="mock"     → MockDataProvider (DEMO — explicitly isolated,
 *                                labeled DEMO by the honest facade; never
 *                                production analysis / EV input)
 *   SPORTS_PROVIDER="odds-api" → TheOddsApiProvider (The Odds API)
 *   SPORTS_PROVIDER="real"     → RealApiProvider (generic API — currently a STUB)
 *   default (dev, no keys)     → MockDataProvider (DEMO)
 *   default (PRODUCTION, no configured keys) → unconfigured provider → every
 *                                call is TEMPORARILY_UNAVAILABLE ("no provider
 *                                configured"). NEVER silent mock.
 *
 * SILENT MOCK FALLBACK IS REMOVED (WS1b §2). wrapProvider no longer takes a
 * fallback; a provider failure propagates as an honest DataState through the
 * `sportsData` facade. No capability may manufacture data from nothing.
 *
 * Honest states (WS1b §11): provider failure ⇒ TEMPORARILY_UNAVAILABLE /
 * NOT_SUPPORTED / EMPTY / UNVERIFIED / STALE_CACHED — never AVAILABLE.
 * Multi-provider failover is only permitted when the secondary independently
 * supplies valid data through the same validation + identity pipeline.
 */
import type { SportsDataProvider } from "./provider";
import { mockDataProvider } from "./mock-provider";
import { realApiProvider } from "./real-api-provider";
import { oddsApiProvider } from "./odds-api-provider";
import { gamesCache, oddsCache, rateLimiter, statsCache, withRetry } from "./cache";
import {
  DataState,
  type DataResult,
  demo as demoResult,
  empty as emptyResult,
  notSupported,
  ok as okResult,
  temporarilyUnavailable,
} from "./datastate";
import type { Game, Injury, League, Odds, Player, PlayerStats, Prop, RawProviderProp } from "./types";

export { DataState, DATA_STATES } from "./datastate";
export type { DataResult } from "./datastate";
export { isEligibleForEvAnalysis } from "./datastate";

export {
  resolveCanonicalPlayer,
  resolveCanonicalEvent,
  assertPlayerInEvent,
  registerCanonicalPlayer,
  registerCanonicalEvent,
  EntityResolutionError,
  isTeamSport,
} from "./entity-resolution";
export {
  validateLiveProp,
  validateOrThrow,
  verifyAnalysisEligible,
  AnalysisEligibleProp,
  FRESHNESS_BOUNDARY_MS,
  marketIdentity,
  MARKET_RULES,
} from "./live-props-validator";
export { calculateEv, EvEngineError } from "./ev-engine";
export {
  normalizeOddsApiProps,
  pairOddsApiMarket,
  parsePlayerSideOutcome,
  ODDS_API_SPORT_KEY_MAP,
  ODDS_API_MARKET_STAT_TYPE,
} from "./provider-normalization";

export type { SportsDataProvider } from "./provider";
export type { Player, Game, Odds, Prop, Injury, PlayerStats, League, RawProviderProp, PropSide, PropOutcome, ResolvedProviderProp } from "./types";
export { SUPPORTED_LEAGUES } from "./types";

// ─── Provider errors ───────────────────────────────────────────────────────────

export class ProviderError extends Error {
  readonly kind: "http_4xx" | "http_5xx" | "timeout" | "rate_limit" | "unconfigured" | "provider_failure";
  constructor(kind: ProviderError["kind"], message: string) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
  }
}

// ─── Cache key helpers ─────────────────────────────────────────────────────────

function cacheKey(method: string, ...args: unknown[]): string {
  return `${method}:${args.map((a) => String(a ?? "_")).join(":")}`;
}

/**
 * Fail-closed wrapper: retry + TTL cache + rate limiting. On provider failure
 * the error propagates (honest) — there is NO fallback provider anymore.
 */
function wrapProvider(provider: SportsDataProvider): SportsDataProvider {
  const pick = (kind: "odds" | "stats" | "games") =>
    kind === "odds" ? oddsCache : kind === "stats" ? statsCache : gamesCache;

  return {
    name: `${provider.name} (cached, fail-closed)`,

    async searchPlayers(query, sport) {
      const key = cacheKey("searchPlayers", query, sport);
      const cached = statsCache.get(key) as Player[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.searchPlayers(query, sport));
        statsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "searchPlayers");
      }
    },

    async getPlayerStats(playerId, sport) {
      const key = cacheKey("getPlayerStats", playerId, sport);
      const cached = statsCache.get(key) as PlayerStats | null | undefined;
      if (cached !== undefined) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getPlayerStats(playerId, sport));
        statsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getPlayerStats");
      }
    },

    async getPlayerProps(eventId, playerId, sport) {
      const key = cacheKey("getPlayerProps", eventId, playerId, sport);
      const cached = pick("odds").get(key) as Prop[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getPlayerProps(eventId, playerId, sport));
        oddsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getPlayerProps");
      }
    },

    async getGameProps(eventId, sport) {
      const key = cacheKey("getGameProps", eventId, sport);
      const cached = oddsCache.get(key) as Prop[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getGameProps(eventId, sport));
        oddsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getGameProps");
      }
    },

    async getGameOdds(eventId, sport) {
      const key = cacheKey("getGameOdds", eventId, sport);
      const cached = oddsCache.get(key) as Odds[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getGameOdds(eventId, sport));
        oddsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getGameOdds");
      }
    },

    async getLeagueOdds(sport, date) {
      const key = cacheKey("getLeagueOdds", sport, date);
      const cached = oddsCache.get(key) as Odds[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getLeagueOdds(sport, date));
        oddsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getLeagueOdds");
      }
    },

    async getGames(sport, date) {
      const key = cacheKey("getGames", sport, date);
      const cached = gamesCache.get(key) as Game[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getGames(sport, date));
        gamesCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getGames");
      }
    },

    async getFeaturedGames() {
      const key = cacheKey("getFeaturedGames");
      const cached = gamesCache.get(key) as Game[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getFeaturedGames());
        gamesCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getFeaturedGames");
      }
    },

    async getInjuries(sport, team) {
      const key = cacheKey("getInjuries", sport, team);
      const cached = statsCache.get(key) as Injury[] | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getInjuries(sport, team));
        statsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getInjuries");
      }
    },

    async getPlayerProjections(sport, date) {
      const key = cacheKey("getPlayerProjections", sport, date);
      const cached = statsCache.get(key) as Array<{ playerId: string; playerName: string; stats: Record<string, number> }> | undefined;
      if (cached) return cached;
      try {
        await rateLimiter.wait();
        const result = await withRetry(() => provider.getPlayerProjections(sport, date));
        statsCache.set(key, result);
        return result;
      } catch (err) {
        throw classifyError(err, "getPlayerProjections");
      }
    },
  };
}

/** Map provider failures to honest DataStates at the facade boundary. */
function classifyError(err: unknown, method: string): ProviderError {
  if (err instanceof ProviderError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const upper = msg.toUpperCase();
  if (/\b4\d\d\b/.test(msg) || /\b4[0-9][0-9]\b/.test(upper)) return new ProviderError("http_4xx", `${method}: ${msg}`);
  if (/\b5\d\d\b/.test(msg)) return new ProviderError("http_5xx", `${method}: ${msg}`);
  if (/timeout|timed out|abort|ETIMEDOUT/i.test(msg)) return new ProviderError("timeout", `${method}: ${msg}`);
  if (/rate|limit|429|quota/i.test(msg)) return new ProviderError("rate_limit", `${method}: ${msg}`);
  if (/not set|no provider|unconfigured/i.test(msg)) return new ProviderError("unconfigured", `${method}: ${msg}`);
  return new ProviderError("provider_failure", `${method}: ${msg}`);
}

// ─── Capability registry (WS1b §11 — honest capability states) ─────────────────

export type ProviderKind = "mock" | "odds-api" | "real" | "unconfigured";
type Capability = "demo" | "supported" | "not-supported" | "stub";

const CAPABILITIES: Record<ProviderKind, Record<string, Capability>> = {
  mock: {
    searchPlayers: "demo", getPlayerStats: "demo", getPlayerProps: "demo", getGameProps: "demo",
    getGameOdds: "demo", getLeagueOdds: "demo", getGames: "demo", getFeaturedGames: "demo",
    getInjuries: "demo", getPlayerProjections: "demo",
  },
  "odds-api": {
    searchPlayers: "not-supported", getPlayerStats: "not-supported",
    getPlayerProps: "supported", getGameProps: "supported", getGameOdds: "supported",
    getLeagueOdds: "supported", getGames: "supported", getFeaturedGames: "supported",
    getInjuries: "not-supported", getPlayerProjections: "not-supported",
  },
  real: {
    searchPlayers: "stub", getPlayerStats: "stub", getPlayerProps: "stub", getGameProps: "stub",
    getGameOdds: "stub", getLeagueOdds: "stub", getGames: "stub", getFeaturedGames: "stub",
    getInjuries: "stub", getPlayerProjections: "stub",
  },
  unconfigured: {
    // Route to the unconfiguredProvider, which throws an "unconfigured"
    // ProviderError → the facade maps it to TEMPORARILY_UNAVAILABLE (pending
    // configuration). NOT_SUPPORTED is wrong here: the capability exists, it
    // is just not configured yet.
    searchPlayers: "supported", getPlayerStats: "supported", getPlayerProps: "supported",
    getGameProps: "supported", getGameOdds: "supported", getLeagueOdds: "supported",
    getGames: "supported", getFeaturedGames: "supported", getInjuries: "supported",
    getPlayerProjections: "supported",
  },
};

// ─── Provider resolution (no silent mock fallback) ─────────────────────────────

function resolveProviderConfig(): { provider: SportsDataProvider; kind: ProviderKind } {
  const force = process.env.SPORTS_PROVIDER?.toLowerCase();
  if (force === "mock") return { provider: mockDataProvider, kind: "mock" };
  if (force === "odds-api" || process.env.ODDS_API_KEY) return { provider: oddsApiProvider, kind: "odds-api" };
  if (force === "real" || process.env.SPORTS_API_KEY) return { provider: realApiProvider, kind: "real" };
  if (process.env.NODE_ENV === "production") return { provider: unconfiguredProvider, kind: "unconfigured" };
  // Development without keys: DEMO data is allowed but always labeled DEMO by the facade.
  return { provider: mockDataProvider, kind: "mock" };
}

/** Production-visible "no provider configured" — every call honestly unavailable. */
const unconfiguredProvider: SportsDataProvider = {
  name: "UnconfiguredProvider",
  async searchPlayers(): Promise<Player[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getPlayerStats(): Promise<PlayerStats | null> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getPlayerProps(): Promise<Prop[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getGameProps(): Promise<Prop[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getGameOdds(): Promise<Odds[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getLeagueOdds(): Promise<Odds[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getGames(): Promise<Game[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getFeaturedGames(): Promise<Game[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getInjuries(): Promise<Injury[]> { throw new ProviderError("unconfigured", "no sports data provider configured"); },
  async getPlayerProjections(): Promise<Array<{ playerId: string; playerName: string; stats: Record<string, number> }>> {
    throw new ProviderError("unconfigured", "no sports data provider configured");
  },
};

const resolvedConfig = resolveProviderConfig();
/** Backwards-compatible fail-closed provider surface (throws on provider failure — never mock). */
export const sports: SportsDataProvider = resolvedConfig.kind === "mock"
  ? mockDataProvider
  : resolvedConfig.kind === "unconfigured"
    ? unconfiguredProvider
    : wrapProvider(resolvedConfig.provider);

export const activeProviderKind: ProviderKind = resolvedConfig.kind;

// ─── Honest DataState facade (WS1b §1 / §11 / §12) ─────────────────────────────

function runData<T>(method: string, capability: Capability, call: () => Promise<T>): Promise<DataResult<T>> {
  if (capability === "stub") {
    return Promise.resolve(temporarilyUnavailable<T>(`provider method ${method} is a stub — not implemented`));
  }
  if (capability === "not-supported") {
    return Promise.resolve(notSupported<T>(`provider does not support ${method}`));
  }
  return safelyCall(method, call);
}

async function safelyCall<T>(method: string, call: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const value = await call();
    if (value === null) return emptyResult<T>();
    if (Array.isArray(value) && value.length === 0) return emptyResult<T>();
    return okResult<T>(value, new Date().toISOString());
  } catch (err) {
    const pe = err instanceof ProviderError ? err : classifyError(err, method);
    if (pe.kind === "http_4xx") return temporarilyUnavailable<T>(`${method}: provider returned HTTP 4xx`);
    if (pe.kind === "http_5xx") return temporarilyUnavailable<T>(`${method}: provider returned HTTP 5xx`);
    if (pe.kind === "timeout") return temporarilyUnavailable<T>(`${method}: provider timeout`);
    if (pe.kind === "rate_limit") return temporarilyUnavailable<T>(`${method}: provider rate limit`);
    if (pe.kind === "unconfigured") return temporarilyUnavailable<T>(`${method}: no provider configured`);
    return temporarilyUnavailable<T>(`${method}: provider failure`);
  }
}

/**
 * Honest facade over a provider. Every consumer gates production decisions on
 * the returned DataState. DEMO data is returned WITH the DEMO label and must
 * never be persisted as production or enter EV execution.
 * Factory form lets tests inject fake providers and capability maps.
 */
export function createSportsDataFacade(
  provider: SportsDataProvider,
  kind: ProviderKind,
  capabilities: Record<string, Capability> = CAPABILITIES[kind],
) {
  return {
    kind: (): ProviderKind => kind,

    async searchPlayers(query: string, sport?: League): Promise<DataResult<Player[]>> {
      if (kind === "mock") {
        const players = await provider.searchPlayers(query, sport);
        return okDemo<Player[]>(players);
      }
      return runDataFacade("searchPlayers", capabilities, () => provider.searchPlayers(query, sport));
    },

    async getGames(sport: League, date?: string): Promise<DataResult<Game[]>> {
      if (kind === "mock") {
        const games = await provider.getGames(sport, date);
        return okDemo<Game[]>(games);
      }
      return runDataFacade("getGames", capabilities, () => provider.getGames(sport, date));
    },

    async getGameProps(eventId: string, sport: League): Promise<DataResult<Prop[]>> {
      if (kind === "mock") {
        const props = await provider.getGameProps(eventId, sport);
        return okDemo<Prop[]>(props);
      }
      return runDataFacade("getGameProps", capabilities, () => provider.getGameProps(eventId, sport));
    },

    async getPlayerProps(eventId: string, playerId: string, sport: League): Promise<DataResult<RawProviderProp[]>> {
      if (kind === "mock") {
        const props = await provider.getPlayerProps(eventId, playerId, sport);
        return okDemo<RawProviderProp[]>(propsToRaw(props));
      }
      const res = await runDataFacade("getPlayerProps", capabilities, () => provider.getPlayerProps(eventId, playerId, sport));
      if (res.state !== DataState.AVAILABLE || !res.data) return res as DataResult<RawProviderProp[]>;
      return okResult<RawProviderProp[]>(propsToRaw(res.data), res.retrievedAt);
    },

    async getGameOdds(eventId: string, sport: League): Promise<DataResult<Odds[]>> {
      if (kind === "mock") {
        const odds = await provider.getGameOdds(eventId, sport);
        return okDemo<Odds[]>(odds);
      }
      return runDataFacade("getGameOdds", capabilities, () => provider.getGameOdds(eventId, sport));
    },

    async getLeagueOdds(sport: League, date?: string): Promise<DataResult<Odds[]>> {
      if (kind === "mock") {
        const odds = await provider.getLeagueOdds(sport, date);
        return okDemo<Odds[]>(odds);
      }
      return runDataFacade("getLeagueOdds", capabilities, () => provider.getLeagueOdds(sport, date));
    },

    async getFeaturedGames(): Promise<DataResult<Game[]>> {
      if (kind === "mock") {
        const games = await provider.getFeaturedGames();
        return okDemo<Game[]>(games);
      }
      return runDataFacade("getFeaturedGames", capabilities, () => provider.getFeaturedGames());
    },

    async getPlayerStats(playerId: string, sport: League): Promise<DataResult<PlayerStats | null>> {
      if (kind === "mock") {
        const stats = await provider.getPlayerStats(playerId, sport);
        return okDemo<PlayerStats | null>(stats);
      }
      return runDataFacade("getPlayerStats", capabilities, () => provider.getPlayerStats(playerId, sport));
    },

    async getInjuries(sport: League, team?: string): Promise<DataResult<Injury[]>> {
      if (kind === "mock") {
        const injuries = await provider.getInjuries(sport, team);
        return okDemo<Injury[]>(injuries);
      }
      return runDataFacade("getInjuries", capabilities, () => provider.getInjuries(sport, team));
    },

    async getPlayerProjections(sport: League, date?: string): Promise<DataResult<Array<{ playerId: string; playerName: string; stats: Record<string, number> }>>> {
      if (kind === "mock") {
        const projections = await provider.getPlayerProjections(sport, date);
        return okDemo(projections);
      }
      return runDataFacade("getPlayerProjections", capabilities, () => provider.getPlayerProjections(sport, date));
    },
  };
}

/** DEMO-labeled result (isolated from production analysis / EV). */
function okDemo<T>(data: T): DataResult<T> {
  return demoResult<T>(data, new Date().toISOString());
}

async function runDataFacade<T>(method: string, capabilities: Record<string, Capability>, call: () => Promise<T>): Promise<DataResult<T>> {
  const cap = capabilities[method] ?? "not-supported";
  if (cap === "stub") return temporarilyUnavailable<T>(`provider method ${method} is a stub — not implemented`);
  if (cap === "not-supported") return notSupported<T>(`provider does not support ${method}`);
  try {
    const value = await call();
    if (value === null) return emptyResult<T>();
    if (Array.isArray(value) && value.length === 0) return emptyResult<T>();
    return okResult<T>(value, new Date().toISOString());
  } catch (err) {
    const pe = err instanceof ProviderError ? err : classifyError(err, method);
    switch (pe.kind) {
      case "http_4xx": return temporarilyUnavailable<T>(`${method}: provider returned HTTP 4xx`);
      case "http_5xx": return temporarilyUnavailable<T>(`${method}: provider returned HTTP 5xx`);
      case "timeout": return temporarilyUnavailable<T>(`${method}: provider timeout`);
      case "rate_limit": return temporarilyUnavailable<T>(`${method}: provider rate limit`);
      case "unconfigured": return temporarilyUnavailable<T>(`${method}: no provider configured`);
      default: return temporarilyUnavailable<T>(`${method}: provider failure`);
    }
  }
}

/** The production facade over the resolved provider. */
export const sportsData = createSportsDataFacade(sports, activeProviderKind);

// ─── Prop shape conversion (Prop ⇄ RawProviderProp) ────────────────────────────

function propsToRaw(props: Prop[]): RawProviderProp[] {
  const raw: RawProviderProp[] = [];
  for (const p of props) {
    const over = Number.isFinite(p.overOdds) ? p.overOdds : Number.NaN;
    const under = Number.isFinite(p.underOdds) ? p.underOdds : Number.NaN;
    raw.push({
      provider: p.provider ?? "unknown",
      providerEventId: p.providerEventId ?? p.eventId,
      providerPlayerId: p.providerPlayerId ?? "",
      sport: p.sport,
      market: p.market ?? p.propType,
      statType: p.statType ?? p.propType,
      period: p.period ?? "game",
      playerName: p.playerName,
      team: undefined,
      sportsbook: p.sportsbook,
      outcomes: [
        { side: "over", line: p.line, odds: over },
        { side: "under", line: p.line, odds: under },
      ],
      retrievalTimestamp: p.retrievalTimestamp ?? p.lastUpdated,
    });
  }
  return raw;
}

function mockPropsToRaw(props: Prop[], sport: League): DataResult<RawProviderProp[]> {
  return demoResult<RawProviderProp[]>(propsToRaw(props), new Date().toISOString());
}

if (process.env.NODE_ENV !== "production") {
  console.log(`[BetIQ] Sports data provider: ${sports.name} (${activeProviderKind})`);
}