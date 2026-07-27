/**
 * BetIQ Sports Data Provider Interface
 *
 * All sports data providers (MockDataProvider, TheOddsApiProvider, etc.)
 * must implement this interface. This allows swapping providers with a
 * single configuration change.
 */
import type { Player, Game, Odds, Prop, Injury, PlayerStats, League } from "./types";

export interface SportsDataProvider {
  name: string;

  /** Search for players by name query */
  searchPlayers(query: string, sport?: League): Promise<Player[]>;

  /** Get detailed stats for a specific player */
  getPlayerStats(playerId: string, sport: League): Promise<PlayerStats | null>;

  /** Get player prop lines for an event */
  getPlayerProps(eventId: string, playerId: string, sport: League): Promise<Prop[]>;

  /** Get all available props for a game */
  getGameProps(eventId: string, sport: League): Promise<Prop[]>;

  /** Get odds for a specific game */
  getGameOdds(eventId: string, sport: League): Promise<Odds[]>;

  /** Get odds for all games in a league on a given date */
  getLeagueOdds(sport: League, date?: string): Promise<Odds[]>;

  /** Get upcoming/active games */
  getGames(sport: League, date?: string): Promise<Game[]>;

  /** Get games across multiple leagues (for dashboard) */
  getFeaturedGames(): Promise<Game[]>;

  /** Get current injury reports */
  getInjuries(sport: League, team?: string): Promise<Injury[]>;

  /** Get player stat projections for upcoming games */
  getPlayerProjections(sport: League, date?: string): Promise<Array<{
    playerId: string;
    playerName: string;
    stats: Record<string, number>;
  }>>;
}