/**
 * The Odds API Provider
 *
 * Production sports data provider using The Odds API (https://the-odds-api.com/).
 * Requires ODDS_API_KEY in environment. Implements SportsDataProvider interface.
 */
import type { SportsDataProvider } from "./provider";
import type { Player, Game, Odds, Prop, Injury, PlayerStats, League } from "./types";

const SPORT_KEY_MAP: Record<string, string> = {
  NBA: "basketball_nba",
  NFL: "americanfootball_nfl",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  CollegeFootball: "americanfootball_ncaaf",
  CollegeBasketball: "basketball_ncaab",
  Soccer: "soccer_usa_mls",
  PGA: "golf_pga",
  UFC: "mma_mixed_martial_arts",
};

function apiKey(): string {
  const k = process.env.ODDS_API_KEY;
  if (!k) throw new Error("ODDS_API_KEY not set");
  return k;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const searchParams = new URLSearchParams({ apiKey: apiKey(), ...params });
  const url = `https://api.the-odds-api.com/v4${path}?${searchParams}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`The Odds API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const oddsApiProvider: SportsDataProvider = {
  name: "The Odds API",

  async searchPlayers(query: string, _sport?: League): Promise<Player[]> {
    // The Odds API doesn't have player search — return empty
    console.warn("Player search not available via The Odds API");
    return [];
  },

  async getPlayerStats(_playerId: string, _sport: League): Promise<PlayerStats | null> {
    console.warn("Player stats not available via The Odds API");
    return null;
  },

  async getPlayerProps(eventId: string, playerId: string, _sport: League): Promise<Prop[]> {
    const data = await get<Array<Record<string, unknown>>>(`/sports/${_sport}/events/${eventId}/odds`, { regions: "us", markets: "player_points,player_assists,player_rebounds,player_pass_yds", oddsFormat: "american" });
    const props: Prop[] = [];
    const game = data?.[0] as Record<string, unknown> | undefined;
    const bookmakers = (game?.bookmakers as Array<Record<string, unknown>>) || [];
    for (const book of bookmakers) {
      for (const market of (book.markets as Array<Record<string, unknown>>) || []) {
        for (const outcome of (market.outcomes as Array<Record<string, unknown>>) || []) {
          props.push({
            id: `${eventId}-${market.key}-${outcome.name}`,
            sport: _sport,
            eventId,
            playerId,
            playerName: String(outcome.name || ""),
            propType: String(market.key || ""),
            line: Number(outcome.point ?? 0),
            overOdds: Number(outcome.price ?? 0),
            underOdds: Number(outcome.price ?? 0),
            sportsbook: String(book.title || ""),
            lastUpdated: String(book.last_update || ""),
          });
        }
      }
    }
    return props;
  },

  async getGameProps(eventId: string, _sport: League): Promise<Prop[]> {
    return this.getPlayerProps(eventId, "", _sport);
  },

  async getGameOdds(eventId: string, _sport: League): Promise<Odds[]> {
    const data = await get<Array<Record<string, unknown>>>(`/sports/${_sport}/events/${eventId}/odds`, { regions: "us", markets: "h2h,spreads,totals", oddsFormat: "american" });
    const game = data?.[0] as Record<string, unknown> | undefined;
    const bookmakers = (game?.bookmakers as Array<Record<string, unknown>>) || [];
    return bookmakers.map((b) => {
      const h2h = (b.markets as Array<Record<string, unknown>>)?.find((m) => m.key === "h2h");
      const spreads = (b.markets as Array<Record<string, unknown>>)?.find((m) => m.key === "spreads");
      const totals = (b.markets as Array<Record<string, unknown>>)?.find((m) => m.key === "totals");
      const h2hOuts = (h2h?.outcomes as Array<Record<string, unknown>>) || [];
      return {
        id: `${eventId}-${b.key}`,
        sport: _sport,
        eventId,
        sportsbook: String(b.title || ""),
        homeOdds: Number(h2hOuts.find((o) => o.name === game?.home_team)?.price ?? 0),
        awayOdds: Number(h2hOuts.find((o) => o.name === game?.away_team)?.price ?? 0),
        homeSpread: Number(spreads ? (spreads.outcomes as Array<Record<string, unknown>>)?.find((o: Record<string, unknown>) => o.name === game?.home_team)?.point : undefined) || undefined,
        awaySpread: Number(spreads ? (spreads.outcomes as Array<Record<string, unknown>>)?.find((o: Record<string, unknown>) => o.name === game?.away_team)?.point : undefined) || undefined,
        overUnder: Number(totals ? (totals.outcomes as Array<Record<string, unknown>>)?.find((o: Record<string, unknown>) => o.name === "Over")?.point : undefined) || undefined,
        lastUpdated: String(b.last_update || ""),
      };
    });
  },

  async getLeagueOdds(sport: League, _date?: string): Promise<Odds[]> {
    const sportKey = SPORT_KEY_MAP[sport];
    if (!sportKey) return [];
    const data = await get<Array<Record<string, unknown>>>(`/sports/${sportKey}/odds`, { regions: "us", markets: "h2h,spreads,totals", oddsFormat: "american" });
    const allOdds: Odds[] = [];
    for (const game of data) {
      const bookmakers = (game.bookmakers as Array<Record<string, unknown>>) || [];
      for (const b of bookmakers) {
        const h2h = (b.markets as Array<Record<string, unknown>>)?.find((m) => m.key === "h2h");
        const h2hOuts = (h2h?.outcomes as Array<Record<string, unknown>>) || [];
        allOdds.push({
          id: `${game.id}-${b.key}`,
          sport,
          eventId: String(game.id || ""),
          sportsbook: String(b.title || ""),
          homeOdds: Number(h2hOuts.find((o) => o.name === game.home_team)?.price ?? 0),
          awayOdds: Number(h2hOuts.find((o) => o.name === game.away_team)?.price ?? 0),
          lastUpdated: String(b.last_update || ""),
        });
      }
    }
    return allOdds;
  },

  async getGames(sport: League, _date?: string): Promise<Game[]> {
    const sportKey = SPORT_KEY_MAP[sport];
    if (!sportKey) return [];
    const data = await get<Array<Record<string, unknown>>>(`/sports/${sportKey}/events`, { dateFormat: "iso" });
    return data.map((g: Record<string, unknown>) => ({
      id: String(g.id || ""),
      sport,
      homeTeam: String(g.home_team || ""),
      awayTeam: String(g.away_team || ""),
      startTime: String(g.commence_time || ""),
      status: (g.completed ? "final" : new Date(String(g.commence_time)) > new Date() ? "scheduled" : "live") as Game["status"],
    }));
  },

  async getFeaturedGames(): Promise<Game[]> {
    const sports = ["basketball_nba", "americanfootball_nfl", "baseball_mlb"];
    const results: Game[] = [];
    for (const sportKey of sports) {
      try {
        const data = await get<Array<Record<string, unknown>>>(`/sports/${sportKey}/events`, { dateFormat: "iso" });
        const league = Object.entries(SPORT_KEY_MAP).find(([, v]) => v === sportKey)?.[0] as League || "NBA";
        for (const g of data.slice(0, 3)) {
          results.push({
            id: String(g.id || ""),
            sport: league,
            homeTeam: String(g.home_team || ""),
            awayTeam: String(g.away_team || ""),
            startTime: String(g.commence_time || ""),
            status: "scheduled" as const,
          });
        }
      } catch { /* skip */ }
    }
    return results;
  },

  async getInjuries(_sport: League, _team?: string): Promise<Injury[]> {
    console.warn("Injury data not available via The Odds API");
    return [];
  },

  async getPlayerProjections(_sport: League, _date?: string): Promise<Array<{ playerId: string; playerName: string; stats: Record<string, number> }>> {
    console.warn("Player projections not available via The Odds API");
    return [];
  },
};