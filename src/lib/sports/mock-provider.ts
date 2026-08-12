/**
 * BetIQ Mock Data Provider
 *
 * Provides realistic mock data for development and testing.
 * Used when SPORTS_API_KEY is not set in the environment.
 * This same shape is used by the real API provider — just swap the config.
 */
import type { SportsDataProvider } from "./provider";
import type { Player, Game, Odds, Prop, Injury, PlayerStats, League } from "./types";

const mockPlayers: Player[] = [
  // NBA
  { id: "nba-001", name: "LeBron James", sport: "NBA", team: "Los Angeles Lakers", position: "SF", number: 23, injuryStatus: "Active" },
  { id: "nba-002", name: "Stephen Curry", sport: "NBA", team: "Golden State Warriors", position: "PG", number: 30, injuryStatus: "Questionable" },
  { id: "nba-003", name: "Luka Dončić", sport: "NBA", team: "Dallas Mavericks", position: "PG", number: 77, injuryStatus: "Active" },
  { id: "nba-004", name: "Giannis Antetokounmpo", sport: "NBA", team: "Milwaukee Bucks", position: "PF", number: 34, injuryStatus: "Active" },
  { id: "nba-005", name: "Nikola Jokić", sport: "NBA", team: "Denver Nuggets", position: "C", number: 15, injuryStatus: "Active" },
  { id: "nba-006", name: "Joel Embiid", sport: "NBA", team: "Philadelphia 76ers", position: "C", number: 21, injuryStatus: "Out" },
  { id: "nba-007", name: "Shai Gilgeous-Alexander", sport: "NBA", team: "Oklahoma City Thunder", position: "PG", number: 2, injuryStatus: "Active" },
  // NFL
  { id: "nfl-001", name: "Patrick Mahomes", sport: "NFL", team: "Kansas City Chiefs", position: "QB", number: 15, injuryStatus: "Active" },
  { id: "nfl-002", name: "Travis Kelce", sport: "NFL", team: "Kansas City Chiefs", position: "TE", number: 87, injuryStatus: "Active" },
  { id: "nfl-003", name: "Tyreek Hill", sport: "NFL", team: "Miami Dolphins", position: "WR", number: 10, injuryStatus: "Active" },
  { id: "nfl-004", name: "Christian McCaffrey", sport: "NFL", team: "San Francisco 49ers", position: "RB", number: 23, injuryStatus: "Questionable" },
  // MLB
  { id: "mlb-001", name: "Aaron Judge", sport: "MLB", team: "New York Yankees", position: "RF", number: 99, injuryStatus: "Active" },
  { id: "mlb-002", name: "Shohei Ohtani", sport: "MLB", team: "Los Angeles Dodgers", position: "DH", number: 17, injuryStatus: "Active" },
  // NHL
  { id: "nhl-001", name: "Connor McDavid", sport: "NHL", team: "Edmonton Oilers", position: "C", number: 97, injuryStatus: "Active" },
  { id: "nhl-002", name: "Auston Matthews", sport: "NHL", team: "Toronto Maple Leafs", position: "C", number: 34, injuryStatus: "Active" },
  // Soccer
  { id: "soc-001", name: "Christian Pulisic", sport: "Soccer", team: "AC Milan", position: "LW", number: 11, injuryStatus: "Active" },
  { id: "soc-002", name: "Lionel Messi", sport: "Soccer", team: "Inter Miami", position: "FW", number: 10, injuryStatus: "Active" },
  // PGA
  { id: "pga-001", name: "Rory McIlroy", sport: "PGA", team: "Northern Ireland", position: "Pro Golfer", injuryStatus: "Active" },
  { id: "pga-002", name: "Scottie Scheffler", sport: "PGA", team: "United States", position: "Pro Golfer", injuryStatus: "Active" },
  { id: "pga-003", name: "Jon Rahm", sport: "PGA", team: "Spain", position: "Pro Golfer", injuryStatus: "Active" },
  { id: "pga-004", name: "Xander Schauffele", sport: "PGA", team: "United States", position: "Pro Golfer", injuryStatus: "Active" },
  { id: "pga-005", name: "Collin Morikawa", sport: "PGA", team: "United States", position: "Pro Golfer", injuryStatus: "Active" },
];

const mockGames: Game[] = [
  { id: "g-001", sport: "NBA", homeTeam: "Los Angeles Lakers", awayTeam: "Boston Celtics", homeScore: 112, awayScore: 108, startTime: "2026-07-14T19:30:00Z", status: "final", venue: "Crypto.com Arena" },
  { id: "g-002", sport: "NBA", homeTeam: "Golden State Warriors", awayTeam: "Denver Nuggets", homeScore: 118, awayScore: 114, startTime: "2026-07-14T20:00:00Z", status: "live", period: "Q4", clock: "3:22", venue: "Chase Center" },
  { id: "g-003", sport: "NBA", homeTeam: "Dallas Mavericks", awayTeam: "Milwaukee Bucks", startTime: "2026-07-15T19:30:00Z", status: "scheduled", venue: "American Airlines Center" },
  { id: "g-004", sport: "NBA", homeTeam: "Oklahoma City Thunder", awayTeam: "Philadelphia 76ers", startTime: "2026-07-15T20:00:00Z", status: "scheduled", venue: "Paycom Center" },
  { id: "g-005", sport: "NFL", homeTeam: "Kansas City Chiefs", awayTeam: "San Francisco 49ers", startTime: "2026-09-10T20:20:00Z", status: "scheduled", venue: "Arrowhead Stadium" },
  { id: "g-006", sport: "MLB", homeTeam: "New York Yankees", awayTeam: "Los Angeles Dodgers", homeScore: 5, awayScore: 3, startTime: "2026-07-14T19:05:00Z", status: "final", venue: "Yankee Stadium" },
  { id: "g-007", sport: "NHL", homeTeam: "Edmonton Oilers", awayTeam: "Toronto Maple Leafs", startTime: "2026-07-15T19:00:00Z", status: "scheduled", venue: "Rogers Place" },
  { id: "g-008", sport: "Soccer", homeTeam: "Inter Miami", awayTeam: "LA Galaxy", startTime: "2026-07-15T19:30:00Z", status: "scheduled", venue: "DRV PNK Stadium" },
];

const mockOdds: Odds[] = [
  { id: "o-001", sport: "NBA", eventId: "g-003", sportsbook: "DraftKings", homeOdds: -110, awayOdds: -110, homeSpread: -3.5, awaySpread: 3.5, overUnder: 224.5, lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "o-002", sport: "NBA", eventId: "g-004", sportsbook: "DraftKings", homeOdds: -120, awayOdds: +100, homeSpread: -2, awaySpread: 2, overUnder: 218.5, lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "o-003", sport: "NFL", eventId: "g-005", sportsbook: "DraftKings", homeOdds: -150, awayOdds: +130, homeSpread: -3, awaySpread: 3, overUnder: 47.5, lastUpdated: "2026-09-01T12:00:00Z" },
];

const mockProps: Prop[] = [
  { id: "p-001", sport: "NBA", eventId: "g-003", playerId: "nba-003", playerName: "Luka Dončić", propType: "Points", line: 31.5, overOdds: -110, underOdds: -110, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "p-002", sport: "NBA", eventId: "g-003", playerId: "nba-003", playerName: "Luka Dončić", propType: "Assists", line: 8.5, overOdds: -115, underOdds: -105, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "p-003", sport: "NBA", eventId: "g-003", playerId: "nba-003", playerName: "Luka Dončić", propType: "Rebounds", line: 9.5, overOdds: -110, underOdds: -110, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "p-004", sport: "NBA", eventId: "g-003", playerId: "nba-004", playerName: "Giannis Antetokounmpo", propType: "Points", line: 30.5, overOdds: -110, underOdds: -110, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "p-005", sport: "NBA", eventId: "g-003", playerId: "nba-004", playerName: "Giannis Antetokounmpo", propType: "Rebounds", line: 11.5, overOdds: -120, underOdds: +100, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "p-006", sport: "NFL", eventId: "g-005", playerId: "nfl-001", playerName: "Patrick Mahomes", propType: "Passing Yards", line: 285.5, overOdds: -110, underOdds: -110, sportsbook: "DraftKings", lastUpdated: "2026-09-01T12:00:00Z" },
  { id: "p-007", sport: "NFL", eventId: "g-005", playerId: "nfl-001", playerName: "Patrick Mahomes", propType: "Touchdowns", line: 2.5, overOdds: +120, underOdds: -150, sportsbook: "DraftKings", lastUpdated: "2026-09-01T12:00:00Z" },
  { id: "p-008", sport: "NFL", eventId: "g-005", playerId: "nfl-002", playerName: "Travis Kelce", propType: "Receiving Yards", line: 75.5, overOdds: -110, underOdds: -110, sportsbook: "DraftKings", lastUpdated: "2026-09-01T12:00:00Z" },
  { id: "p-009", sport: "MLB", eventId: "g-006", playerId: "mlb-001", playerName: "Aaron Judge", propType: "Home Runs", line: 0.5, overOdds: +180, underOdds: -220, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
  { id: "p-010", sport: "MLB", eventId: "g-006", playerId: "mlb-001", playerName: "Aaron Judge", propType: "Total Bases", line: 1.5, overOdds: -110, underOdds: -110, sportsbook: "DraftKings", lastUpdated: "2026-07-14T12:00:00Z" },
];

const mockInjuries: Injury[] = [
  { id: "i-001", playerId: "nba-002", playerName: "Stephen Curry", team: "Golden State Warriors", sport: "NBA", injuryType: "Knee Soreness", status: "Questionable", date: "2026-07-14", description: "Right knee soreness — day-to-day" },
  { id: "i-002", playerId: "nba-006", playerName: "Joel Embiid", team: "Philadelphia 76ers", sport: "NBA", injuryType: "Knee", status: "Out", date: "2026-07-14", description: "Left knee meniscus recovery" },
  { id: "i-003", playerId: "nfl-004", playerName: "Christian McCaffrey", team: "San Francisco 49ers", sport: "NFL", injuryType: "Calf Strain", status: "Questionable", date: "2026-07-14", description: "Right calf strain — limited in practice" },
];

function getPlayerStatsMock(playerId: string, _sport: League): PlayerStats | null {
  const player = mockPlayers.find(p => p.id === playerId);
  if (!player) return null;

  return {
    playerId,
    season: 2026,
    sport: _sport,
    averages: { points: 25.3, rebounds: 7.1, assists: 6.8, fieldGoalPct: 0.512 },
    totals: { points: 1771, rebounds: 497, assists: 476, gamesPlayed: 70 },
    recentGames: [
      { date: "2026-07-10", opponent: "BKN", isHome: true, minutes: 36, stats: { points: 32, rebounds: 8, assists: 6 }, plusMinus: +12, result: "W" },
      { date: "2026-07-08", opponent: "MIL", isHome: false, minutes: 34, stats: { points: 28, rebounds: 7, assists: 9 }, plusMinus: +5, result: "W" },
      { date: "2026-07-06", opponent: "BOS", isHome: false, minutes: 35, stats: { points: 21, rebounds: 6, assists: 8 }, plusMinus: -3, result: "L" },
      { date: "2026-07-04", opponent: "PHI", isHome: true, minutes: 38, stats: { points: 35, rebounds: 9, assists: 10 }, plusMinus: +15, result: "W" },
      { date: "2026-07-02", opponent: "NYK", isHome: true, minutes: 37, stats: { points: 27, rebounds: 5, assists: 7 }, plusMinus: +8, result: "W" },
    ],
    homeAwaySplits: {
      home: { points: 27.2, rebounds: 7.5, assists: 7.0, fieldGoalPct: 0.541 },
      away: { points: 24.1, rebounds: 6.8, assists: 6.5, fieldGoalPct: 0.518 },
    },
  };
}

/** Mock data provider — returns realistic data without external API calls */
export const mockDataProvider: SportsDataProvider = {
  name: "Mock Data Provider",

  async searchPlayers(query: string, sport?: League): Promise<Player[]> {
    let results = mockPlayers;
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q)
      );
    }
    if (sport) {
      results = results.filter(p => p.sport === sport);
    }
    return results;
  },

  async getPlayerStats(playerId: string, sport: League): Promise<PlayerStats | null> {
    return getPlayerStatsMock(playerId, sport);
  },

  async getPlayerProps(_eventId: string, _playerId: string, _sport: League): Promise<Prop[]> {
    return mockProps.filter(p => p.playerId === _playerId);
  },

  async getGameProps(eventId: string, _sport: League): Promise<Prop[]> {
    return mockProps.filter(p => p.eventId === eventId);
  },

  async getGameOdds(eventId: string, _sport: League): Promise<Odds[]> {
    return mockOdds.filter(o => o.eventId === eventId);
  },

  async getLeagueOdds(sport: League, _date?: string): Promise<Odds[]> {
    return mockOdds.filter(o => o.sport === sport);
  },

  async getGames(sport: League, _date?: string): Promise<Game[]> {
    return mockGames.filter(g => g.sport === sport);
  },

  async getFeaturedGames(): Promise<Game[]> {
    // Return games across all leagues, sorted by status (live first, then today)
    return mockGames.sort((a, b) => {
      const priority: Record<string, number> = { live: 0, final: 1, scheduled: 2 };
      return (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
    });
  },

  async getInjuries(sport: League, team?: string): Promise<Injury[]> {
    let results = mockInjuries.filter(i => i.sport === sport);
    if (team) {
      results = results.filter(i => i.team.toLowerCase().includes(team.toLowerCase()));
    }
    return results;
  },

  async getPlayerProjections(sport: League, _date?: string): Promise<Array<{ playerId: string; playerName: string; stats: Record<string, number> }>> {
    return mockPlayers
      .filter(p => p.sport === sport)
      .map(p => ({
        playerId: p.id,
        playerName: p.name,
        stats: { points: 25.3, rebounds: 7.1, assists: 6.8, projectedMinutes: 34 },
      }));
  },
};