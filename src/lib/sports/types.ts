/**
 * BetIQ Sports Data Types
 *
 * Standard types used across the entire sports data provider system.
 * All providers must map their data into these types.
 */

export type League =
  | "NFL" | "NBA" | "MLB" | "NHL"
  | "PGA" | "UFC" | "Soccer"
  | "CollegeFootball" | "CollegeBasketball";

export const SUPPORTED_LEAGUES: League[] = [
  "NFL", "NBA", "MLB", "NHL",
  "PGA", "UFC", "Soccer",
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