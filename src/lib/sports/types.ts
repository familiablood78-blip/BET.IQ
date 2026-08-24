/**
 * BetIQ Sports Data Types
 *
 * Standard types used across the entire sports data provider system.
 * All providers must map their data into these types.
 */

export type League =
  | "NFL" | "NBA" | "MLB" | "NHL"
  | "PGA" | "UFC" | "Soccer" | "Tennis"
  | "CollegeFootball" | "CollegeBasketball";

export const SUPPORTED_LEAGUES: League[] = [
  "NFL", "NBA", "MLB", "NHL",
  "PGA", "UFC", "Soccer", "Tennis",
  "CollegeFootball", "CollegeBasketball",
];

export interface Player {
  id: string;
  name: string;
  sport: League;
  team: string;
  position: string;
  number?: number;
  injuryStatus?: "Active" | "Questionable" | "Out" | "IR";
  height?: string;
  weight?: number;
  age?: number;
  photoUrl?: string;
}

export interface Game {
  id: string;
  sport: League;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  startTime: string; // ISO 8601
  status: "scheduled" | "live" | "final" | "postponed" | "canceled";
  venue?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  period?: string;
  clock?: string;
}

export interface Odds {
  id: string;
  sport: League;
  eventId: string;
  sportsbook: string;
  homeOdds: number;  // American odds
  awayOdds: number;
  homeSpread?: number;
  awaySpread?: number;
  overUnder?: number;
  lastUpdated: string; // ISO 8601
}

export interface Prop {
  id: string;
  sport: League;
  eventId: string;
  playerId: string;
  playerName: string;
  propType: string; // e.g. "points", "assists", "passing_yards", "home_runs"
  line: number;
  overOdds: number;  // American odds
  underOdds: number;
  sportsbook: string;
  lastUpdated: string; // ISO 8601
  // ---- WS1b provenance (every live prop carries these in production) ----
  provider?: string;            // providerId, e.g. "odds-api" | "sportradar"
  providerEventId?: string;     // provider's event id
  canonicalEventId?: string;    // BetIQ canonical event id
  providerPlayerId?: string;    // provider's player id
  canonicalPlayerId?: string;   // BetIQ canonical player id
  market?: string;              // e.g. "player_points", "player_birdies"
  statType?: string;            // e.g. "points", "birdies", "passing_yards"
  period?: string;              // e.g. "game", "round", "match", "regulation"
  side?: PropSide;              // when representing a single side
  retrievalTimestamp?: string;  // ISO 8601, when the data was retrieved/verified (never refreshed on read)
}

/** One side of an over/under market. */
export type PropSide = "over" | "under";

export interface PropOutcome {
  side: PropSide;
  /** The numeric line, e.g. 23.5 points. Must be finite. */
  line: number;
  /** American odds, e.g. -110. Must be finite, non-zero, |odds| >= 100. */
  odds: number;
}

/**
 * A provider-originated prop BEFORE canonical resolution / validation.
 * Carries the full provenance required by WS1b §3. Nothing in this interface
 * is trusted: `canonical*` fields are absent or unverified until the entity
 * resolver and LivePropsValidator have run.
 */
export interface RawProviderProp {
  provider: string;
  providerEventId: string;
  providerPlayerId: string;
  sport: League;
  league?: string;
  market: string;
  statType: string;
  period: string;
  playerName: string;
  team?: string;
  eventName?: string; // home @ away / participants, secondary evidence only
  sportsbook: string;
  /** Exactly two outcomes (one over, one under) are required. */
  outcomes: PropOutcome[];
  /** ISO 8601 retrieval timestamp from the provider fetch. */
  retrievalTimestamp: string;
}

/**
 * A prop whose provider provenance has passed provider validation AND
 * canonical entity resolution, and is ready for the LivePropsValidator.
 * Canonical IDs are REQUIRED here — unknown/contradictory identities fail
 * closed in the resolver before this shape is produced.
 */
export interface ResolvedProviderProp extends RawProviderProp {
  canonicalEventId: string;
  canonicalPlayerId: string;
  canonicalPlayerName: string;
}

export interface Injury {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  sport: League;
  injuryType: string;
  status: "Active" | "Questionable" | "Out" | "IR" | "Doubtful" | "Probable";
  date: string; // ISO 8601
  description?: string;
}

export interface PlayerStats {
  playerId: string;
  season: number;
  sport: League;
  averages: Record<string, number>;
  totals: Record<string, number>;
  recentGames: GameLogEntry[];
  homeAwaySplits: {
    home: Record<string, number>;
    away: Record<string, number>;
  };
}

export interface GameLogEntry {
  date: string;
  opponent: string;
  isHome: boolean;
  minutes: number;
  stats: Record<string, number>;
  plusMinus?: number;
  result?: "W" | "L";
}