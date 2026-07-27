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
 */
import type { SportsDataProvider } from "./provider";
import { mockDataProvider } from "./mock-provider";
import { realApiProvider } from "./real-api-provider";
import { oddsApiProvider } from "./odds-api-provider";

export type { SportsDataProvider } from "./provider";
export type * from "./types";
export { SUPPORTED_LEAGUES } from "./types";
export type { Player, Game, Odds, Prop, Injury, PlayerStats, League } from "./types";

function resolveProvider(): SportsDataProvider {
  const force = process.env.SPORTS_PROVIDER?.toLowerCase();
  if (force === "mock") return mockDataProvider;
  if (force === "odds-api") return oddsApiProvider;
  if (force === "real") return realApiProvider;

  // Auto-detect: use real API if key is set
  const hasSportsKey = Boolean(process.env.SPORTS_API_KEY);
  if (hasSportsKey) return realApiProvider;

  // If ODDS_API_KEY is set, use The Odds API
  const hasOddsKey = Boolean(process.env.ODDS_API_KEY);
  if (hasOddsKey) return oddsApiProvider;

  return mockDataProvider;
}

export const sports: SportsDataProvider = resolveProvider();

if (process.env.NODE_ENV !== "production") {
  console.log(`[BetIQ] Sports data provider: ${sports.name}`);
}