/**
 * BetIQ Sports Data Provider — entry point
 *
 * Usage:
 *   import { sports } from "~/lib/sports";
 *   const players = await sports.searchPlayers("LeBron");
 *
 * Provider selection (checked in order):
 *   SPORTS_PROVIDER="mock"     → MockDataProvider (development)
 *   SPORTS_PROVIDER="real"     → RealApiProvider (generic API)
 *   SPORTS_PROVIDER="odds-api" → TheOddsApiProvider (The Odds API)
 *   Default: realApiProvider if SPORTS_API_KEY is set, else mockDataProvider
 *
 * All providers are transparently wrapped with:
 *   - Retry (3 attempts, exponential backoff)
 *   - TTL caching (30s odds, 5min stats, 1min games)
 *   - Rate limiting (30 calls/min global)
 *   - Graceful degradation to mock data on failure
 */
import type { SportsDataProvider } from "./provider";
import { mockDataProvider } from "./mock-provider";
import { realApiProvider } from "./real-api-provider";
import { oddsApiProvider } from "./odds-api-provider";
import { oddsCache, statsCache, gamesCache, rateLimiter, withRetry } from "./cache";
import type {
  Player, Game, Odds, Prop, Injury, PlayerStats,
} from "./types";

export type { SportsDataProvider } from "./provider";
export type * from "./types";
export { SUPPORTED_LEAGUES } from "./types";
export type { Player, Game, Odds, Prop, Injury, PlayerStats, League } from "./types";
export { oddsCache, statsCache, gamesCache, rateLimiter, withRetry } from "./cache";

// ─── Cache Key Helpers ─────────────────────────────────────────────────────────

function cacheKey(method: string, ...args: unknown[]): string {
  return `${method}:${args.map((a) => String(a ?? "_")).join(":")}`;
}

// ─── Cached Provider Wrapper ───────────────────────────────────────────────────

/**
 * Wraps a sports data provider with retry logic, TTL caching, rate limiting,
 * and automatic fallback to mock data on failure.
 */
function wrapProvider(provider: SportsDataProvider, fallback: SportsDataProvider): SportsDataProvider {
  const CACHE_ODDS = oddsCache;
  const CACHE_STATS = statsCache;
  const CACHE_GAMES = gamesCache;
  const RL = rateLimiter;

  return {
    name: `${provider.name} (cached)`,

    async searchPlayers(query, sport) {
      const key = cacheKey("searchPlayers", query, sport);
      const cached = CACHE_STATS.get(key);
      if (cached) return cached as Player[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.searchPlayers(query, sport));
        CACHE_STATS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} searchPlayers failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.searchPlayers(query, sport);
      }
    },

    async getPlayerStats(playerId, sport) {
      const key = cacheKey("getPlayerStats", playerId, sport);
      const cached = CACHE_STATS.get(key);
      if (cached) return cached as PlayerStats | null;

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getPlayerStats(playerId, sport));
        CACHE_STATS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getPlayerStats failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getPlayerStats(playerId, sport);
      }
    },

    async getPlayerProps(eventId, playerId, sport) {
      const key = cacheKey("getPlayerProps", eventId, playerId, sport);
      const cached = CACHE_ODDS.get(key);
      if (cached) return cached as Prop[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getPlayerProps(eventId, playerId, sport));
        CACHE_ODDS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getPlayerProps failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getPlayerProps(eventId, playerId, sport);
      }
    },

    async getGameProps(eventId, sport) {
      const key = cacheKey("getGameProps", eventId, sport);
      const cached = CACHE_ODDS.get(key);
      if (cached) return cached as Prop[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getGameProps(eventId, sport));
        CACHE_ODDS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getGameProps failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getGameProps(eventId, sport);
      }
    },

    async getGameOdds(eventId, sport) {
      const key = cacheKey("getGameOdds", eventId, sport);
      const cached = CACHE_ODDS.get(key);
      if (cached) return cached as Odds[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getGameOdds(eventId, sport));
        CACHE_ODDS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getGameOdds failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getGameOdds(eventId, sport);
      }
    },

    async getLeagueOdds(sport, date) {
      const key = cacheKey("getLeagueOdds", sport, date);
      const cached = CACHE_ODDS.get(key);
      if (cached) return cached as Odds[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getLeagueOdds(sport, date));
        CACHE_ODDS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getLeagueOdds failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getLeagueOdds(sport, date);
      }
    },

    async getGames(sport, date) {
      const key = cacheKey("getGames", sport, date);
      const cached = CACHE_GAMES.get(key);
      if (cached) return cached as Game[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getGames(sport, date));
        CACHE_GAMES.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getGames failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getGames(sport, date);
      }
    },

    async getFeaturedGames() {
      const key = cacheKey("getFeaturedGames");
      const cached = CACHE_GAMES.get(key);
      if (cached) return cached as Game[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getFeaturedGames());
        CACHE_GAMES.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getFeaturedGames failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getFeaturedGames();
      }
    },

    async getInjuries(sport, team) {
      const key = cacheKey("getInjuries", sport, team);
      const cached = CACHE_STATS.get(key);
      if (cached) return cached as Injury[];

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getInjuries(sport, team));
        CACHE_STATS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getInjuries failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getInjuries(sport, team);
      }
    },

    async getPlayerProjections(sport, date) {
      const key = cacheKey("getPlayerProjections", sport, date);
      const cached = CACHE_STATS.get(key);
      if (cached) return cached as Array<{ playerId: string; playerName: string; stats: Record<string, number> }>;

      try {
        await RL.wait();
        const result = await withRetry(() => provider.getPlayerProjections(sport, date));
        CACHE_STATS.set(key, result);
        return result;
      } catch (err) {
        console.warn(`[BetIQ] ${provider.name} getPlayerProjections failed, falling back to mock:`, err instanceof Error ? err.message : err);
        return fallback.getPlayerProjections(sport, date);
      }
    },
  };
}

// ─── Provider Resolution ──────────────────────────────────────────────────────

function resolveProvider(): SportsDataProvider {
  const force = process.env.SPORTS_PROVIDER?.toLowerCase();

  let rawProvider: SportsDataProvider;

  if (force === "mock") {
    return mockDataProvider;
  }
  if (force === "odds-api") {
    rawProvider = oddsApiProvider;
  } else if (force === "real") {
    rawProvider = realApiProvider;
  } else if (process.env.SPORTS_API_KEY) {
    rawProvider = realApiProvider;
  } else if (process.env.ODDS_API_KEY) {
    rawProvider = oddsApiProvider;
  } else {
    return mockDataProvider;
  }

  // Wrap the real provider with caching, retry, rate limiting, and fallback to mock
  return wrapProvider(rawProvider, mockDataProvider);
}

export const sports: SportsDataProvider = resolveProvider();

if (process.env.NODE_ENV !== "production") {
  console.log(`[BetIQ] Sports data provider: ${sports.name}`);
}
