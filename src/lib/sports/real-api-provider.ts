/**
 * BetIQ Real Sports Data Provider
 *
 * Connects to a sports data API using SPORTS_API_KEY and SPORTS_API_URL.
 * This provider maps external API responses into BetIQ standard types.
 * Currently stubbed — adapt the fetch calls to match your specific API.
 *
 * Supported providers: The Odds API, SportsDataIO, Sportradar, etc.
 */
import type { SportsDataProvider } from "./provider";
import type { Player, Game, Odds, Prop, Injury, PlayerStats, League } from "./types";

function getConfig() {
  const baseUrl = process.env.SPORTS_API_URL || "https://api.example.com/v1";
  const apiKey = process.env.SPORTS_API_KEY || "";
  return { baseUrl, apiKey };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Sports API error: ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Real API provider — fetches from the configured sports data API.
 * Each method maps the external response shape into BetIQ standard types.
 * Adjust the mapping logic to match your API's actual response format.
 */
export const realApiProvider: SportsDataProvider = {
  name: "Real Sports Data API",

  async searchPlayers(query: string, sport?: League): Promise<Player[]> {
    // TODO: Adapt to your API's player search endpoint
    const params = new URLSearchParams({ query });
    if (sport) params.set("sport", sport);
    const data = await apiFetch<Record<string, unknown>[]>(`players/search?${params}`);
    return data.map(mapToPlayer);
  },

  async getPlayerStats(playerId: string, _sport: League): Promise<PlayerStats | null> {
    try {
      const data = await apiFetch<Record<string, unknown>>(`players/${playerId}/stats`);
      return mapToPlayerStats(data, playerId, _sport);
    } catch {
      return null;
    }
  },

  async getPlayerProps(eventId: string, playerId: string, _sport: League): Promise<Prop[]> {
    const data = await apiFetch<Record<string, unknown>[]>(`events/${eventId}/players/${playerId}/props`);
    return data.map(mapToProp);
  },

  async getGameProps(eventId: string, _sport: League): Promise<Prop[]> {
    const data = await apiFetch<Record<string, unknown>[]>(`events/${eventId}/props`);
    return data.map(mapToProp);
  },

  async getGameOdds(eventId: string, _sport: League): Promise<Odds[]> {
    const data = await apiFetch<Record<string, unknown>[]>(`events/${eventId}/odds`);
    return data.map(mapToOdds);
  },

  async getLeagueOdds(sport: League, date?: string): Promise<Odds[]> {
    const params = new URLSearchParams({ sport });
    if (date) params.set("date", date);
    const data = await apiFetch<Record<string, unknown>[]>(`odds?${params}`);
    return data.map(mapToOdds);
  },

  async getGames(sport: League, date?: string): Promise<Game[]> {
    const params = new URLSearchParams({ sport });
    if (date) params.set("date", date);
    const data = await apiFetch<Record<string, unknown>[]>(`games?${params}`);
    return data.map(mapToGame);
  },

  async getFeaturedGames(): Promise<Game[]> {
    const data = await apiFetch<Record<string, unknown>[]>("games/featured");
    return data.map(mapToGame);
  },

  async getInjuries(sport: League, team?: string): Promise<Injury[]> {
    const params = new URLSearchParams({ sport });
    if (team) params.set("team", team);
    const data = await apiFetch<Record<string, unknown>[]>(`injuries?${params}`);
    return data.map(mapToInjury);
  },

  async getPlayerProjections(sport: League, date?: string): Promise<Array<{ playerId: string; playerName: string; stats: Record<string, number> }>> {
    const params = new URLSearchParams({ sport });
    if (date) params.set("date", date);
    const data = await apiFetch<Record<string, unknown>[]>(`projections?${params}`);
    return data.map((item: Record<string, unknown>) => ({
      playerId: String(item.player_id ?? item.id ?? ""),
      playerName: String(item.player_name ?? item.name ?? ""),
      stats: (item.stats ?? item.projections ?? {}) as Record<string, number>,
    }));
  },
};

/* ---------- Mapping helpers ---------- */
// Adapt these to your API's response shape

function mapToPlayer(raw: Record<string, unknown>): Player {
  return {
    id: String(raw.id ?? raw.player_id ?? ""),
    name: String(raw.name ?? raw.full_name ?? raw.player_name ?? ""),
    sport: (raw.sport ?? raw.league ?? "NBA") as League,
    team: String(raw.team ?? raw.team_name ?? ""),
    position: String(raw.position ?? ""),
    number: raw.number ? Number(raw.number) : undefined,
    injuryStatus: raw.injury_status as Player["injuryStatus"] ?? undefined,
    height: raw.height as string ?? undefined,
    weight: raw.weight ? Number(raw.weight) : undefined,
    age: raw.age ? Number(raw.age) : undefined,
    photoUrl: raw.photo_url as string ?? raw.photoUrl as string ?? undefined,
  };
}

function mapToGame(raw: Record<string, unknown>): Game {
  return {
    id: String(raw.id ?? raw.game_id ?? raw.event_id ?? ""),
    sport: (raw.sport ?? raw.league ?? "NBA") as League,
    homeTeam: String(raw.home_team ?? raw.homeTeam ?? ""),
    awayTeam: String(raw.away_team ?? raw.awayTeam ?? ""),
    homeScore: raw.home_score !== undefined ? Number(raw.home_score) : raw.homeScore !== undefined ? Number(raw.homeScore) : undefined,
    awayScore: raw.away_score !== undefined ? Number(raw.away_score) : raw.awayScore !== undefined ? Number(raw.awayScore) : undefined,
    startTime: String(raw.start_time ?? raw.startTime ?? raw.date ?? raw.commence_time ?? ""),
    status: (raw.status ?? "scheduled") as Game["status"],
    venue: raw.venue as string ?? undefined,
    homeTeamLogo: raw.home_team_logo as string ?? undefined,
    awayTeamLogo: raw.away_team_logo as string ?? undefined,
    period: raw.period as string ?? undefined,
    clock: raw.clock as string ?? undefined,
  };
}

function mapToOdds(raw: Record<string, unknown>): Odds {
  return {
    id: String(raw.id ?? raw.odds_id ?? ""),
    sport: (raw.sport ?? "NBA") as League,
    eventId: String(raw.event_id ?? raw.game_id ?? raw.eventId ?? ""),
    sportsbook: String(raw.sportsbook ?? raw.bookmaker ?? ""),
    homeOdds: Number(raw.home_odds ?? raw.h2h_home ?? raw.homeOdds ?? 0),
    awayOdds: Number(raw.away_odds ?? raw.h2h_away ?? raw.awayOdds ?? 0),
    homeSpread: raw.home_spread !== undefined ? Number(raw.home_spread) : raw.spread_home !== undefined ? Number(raw.spread_home) : undefined,
    awaySpread: raw.away_spread !== undefined ? Number(raw.away_spread) : raw.spread_away !== undefined ? Number(raw.spread_away) : undefined,
    overUnder: raw.over_under !== undefined ? Number(raw.over_under) : raw.total !== undefined ? Number(raw.total) : undefined,
    lastUpdated: String(raw.last_updated ?? raw.lastUpdated ?? ""),
  };
}

function mapToProp(raw: Record<string, unknown>): Prop {
  return {
    id: String(raw.id ?? raw.prop_id ?? ""),
    sport: (raw.sport ?? "NBA") as League,
    eventId: String(raw.event_id ?? raw.game_id ?? raw.eventId ?? ""),
    playerId: String(raw.player_id ?? raw.playerId ?? ""),
    playerName: String(raw.player_name ?? raw.playerName ?? ""),
    propType: String(raw.prop_type ?? raw.propType ?? raw.market ?? ""),
    line: Number(raw.line ?? raw.point ?? 0),
    overOdds: Number(raw.over_odds ?? raw.overOdds ?? 0),
    underOdds: Number(raw.under_odds ?? raw.underOdds ?? 0),
    sportsbook: String(raw.sportsbook ?? raw.bookmaker ?? ""),
    lastUpdated: String(raw.last_updated ?? raw.lastUpdated ?? ""),
  };
}

function mapToInjury(raw: Record<string, unknown>): Injury {
  return {
    id: String(raw.id ?? raw.injury_id ?? ""),
    playerId: String(raw.player_id ?? raw.playerId ?? ""),
    playerName: String(raw.player_name ?? raw.playerName ?? raw.name ?? ""),
    team: String(raw.team ?? raw.team_name ?? ""),
    sport: (raw.sport ?? "NBA") as League,
    injuryType: String(raw.injury_type ?? raw.injuryType ?? raw.type ?? ""),
    status: (raw.status ?? "Questionable") as Injury["status"],
    date: String(raw.date ?? raw.created_at ?? ""),
    description: raw.description as string ?? undefined,
  };
}

function mapToPlayerStats(raw: Record<string, unknown>, playerId: string, sport: League): PlayerStats {
  return {
    playerId,
    season: Number(raw.season ?? 2026),
    sport,
    averages: (raw.averages ?? raw.season_averages ?? {}) as Record<string, number>,
    totals: (raw.totals ?? raw.season_totals ?? {}) as Record<string, number>,
    recentGames: (raw.recent_games ?? raw.recentGames ?? []).map((g: Record<string, unknown>) => ({
      date: String(g.date ?? ""),
      opponent: String(g.opponent ?? g.opp ?? ""),
      isHome: Boolean(g.is_home ?? g.isHome ?? false),
      minutes: Number(g.minutes ?? g.min ?? 0),
      stats: (g.stats ?? {}) as Record<string, number>,
      plusMinus: g.plus_minus !== undefined ? Number(g.plus_minus) : g.plusMinus !== undefined ? Number(g.plusMinus) : undefined,
      result: g.result as "W" | "L" | undefined,
    })),
    homeAwaySplits: {
      home: ((raw.home_away_splits ?? raw.homeAwaySplits ?? {}) as Record<string, Record<string, number>>).home ?? {},
      away: ((raw.home_away_splits ?? raw.homeAwaySplits ?? {}) as Record<string, Record<string, number>>).away ?? {},
    },
  };
}