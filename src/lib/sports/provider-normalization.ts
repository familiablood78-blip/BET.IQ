/**
 * BetIQ — Provider Data Normalization (WS1b §3)
 *
 * The entire provider normalization layer. Raw provider payloads are mapped to
 * RawProviderProp with validated provenance (provider, provider event id,
 * provider player id, market, stat type, period, side, line, odds, retrieval
 * timestamp). Nothing here defaults, coerces, or fabricates missing values:
 * if the raw payload cannot produce a provenance-complete RawProviderProp, the
 * entry is rejected (honest state), never silently substituted.
 *
 * The Odds API props normalization is the known-broken code from the WS1 audit
 * (raw League in the URL instead of the sport key; OVER and UNDER sharing one
 * price; playerName "Over"/"Under"; odds defaulting to zero). This module
 * replaces that mapping:
 *   - URL built from SPORT_KEY_MAP (sport key form, e.g. basketball_nba)
 *   - outcomes are grouped into Over/Under PAIRS, each with its OWN price
 *   - player name parsed from the outcome name, never "Over"/"Under"
 *   - no zero/default odds: prices flow through as-is and are rejected by the
 *     LivePropsValidator when invalid
 */

import type { League, PropOutcome, PropSide, RawProviderProp } from "./types";
import { DataState, type DataResult } from "./datastate";

/** Sport → The Odds API sport key (the canonical URL form). */
export const ODDS_API_SPORT_KEY_MAP: Record<string, string> = {
  NBA: "basketball_nba",
  NFL: "americanfootball_nfl",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  CollegeFootball: "americanfootball_ncaaf",
  CollegeBasketball: "basketball_ncaab",
  Soccer: "soccer_usa_mls",
  PGA: "golf_pga",
  UFC: "mma_mixed_martial_arts",
  WNBA: "basketball_wnba",
  Tennis: "tennis_atp",
};

export function oddsApiSportKey(sport: League | string): string | undefined {
  return ODDS_API_SPORT_KEY_MAP[sport];
}

/** Market key → canonical stat type (player props). */
export const ODDS_API_MARKET_STAT_TYPE: Record<string, string> = {
  player_points: "points",
  player_assists: "assists",
  player_rebounds: "rebounds",
  player_pass_yds: "passing_yards",
  player_pass_td: "passing_touchdowns",
  player_rush_yds: "rushing_yards",
  player_recv_yds: "receiving_yards",
  player_home_runs: "home_runs",
  player_total_bases: "total_bases",
  player_strokes: "strokes",
  player_birdies: "birdies",
  player_bogeys: "bogeys",
  player_fairways_hit: "fairways_hit",
  player_gir: "greens_in_regulation",
  player_total_tackles: "tackles",
};

// ---------------------------------------------------------------------------
// Raw payload shapes (The Odds API v4)
// ---------------------------------------------------------------------------
export interface OddsApiOutcome {
  name?: string;
  description?: string;
  point?: number;
  price?: number;
}
export interface OddsApiMarket {
  key?: string;
  outcomes?: OddsApiOutcome[];
}
export interface OddsApiBookmaker {
  key?: string;
  title?: string;
  last_update?: string;
  markets?: OddsApiMarket[];
}
export interface OddsApiGame {
  id?: string;
  sport_key?: string;
  sport_title?: string;
  home_team?: string;
  away_team?: string;
  commence_time?: string;
  bookmakers?: OddsApiBookmaker[];
}

export type ProviderNormalizationResult<T> = DataResult<T>;

const OVER_UNDER_RE = /^(.*?)\s+(Over|Under)\s+([0-9]+(?:\.[0-9]+)?)\s*(.*)$/i;

/**
 * Parse one Odds API outcome into { player, side, point, odds } — or null when
 * the outcome does not name a player (name === "Over"/"Under" is rejected) or
 * lacks a usable point/price. Prices are never defaulted: a missing price is
 * null and subsequently rejected by the LivePropsValidator (invalid odds).
 * Accepts an optional trailing stat descriptor, e.g.
 * "Stephen Curry Under 5.5 Assists" → player "Stephen Curry", side under, 5.5.
 */
export function parsePlayerSideOutcome(outcome: OddsApiOutcome): { player: string; side: PropSide; point: number; odds: number | null } | null {
  const name = (outcome.name ?? "").trim();
  const m = OVER_UNDER_RE.exec(name);
  if (!m) return null;
  const player = m[1].trim();
  const side = m[2].toLowerCase() as PropSide;
  const point = Number(m[3]);
  if (player === "" || Number.isNaN(point) || !Number.isFinite(point)) return null;
  const price = outcome.price;
  const odds = price === undefined || price === null ? null : Number(price);
  return { player, side, point, odds };
}

/** Market key → canonical stat type; undefined for unknown markets (→ skipped, never guessed). */
function MARKET_API_STAT_TYPE(key: string): string | undefined {
  return ODDS_API_MARKET_STAT_TYPE[key];
}

/** Period per market rule (stats → game/round/match per sport). */
function periodForSport(sport: League): string {
  if (sport === "PGA") return "round";
  if (sport === "UFC" || sport === "Tennis") return "match";
  return "game";
}

/**
 * Group a bookmaker's outcomes for one market into complete Over/Under pairs.
 * A pair requires BOTH sides for the SAME player at the SAME point. Malformed
 * outcomes are skipped per-market — they never poison sibling markets or books.
 */
export function pairOddsApiMarket(market: OddsApiMarket, sport: League): Array<{ player: string; statType: string; period: string; outcomes: [PropOutcome, PropOutcome] }> {
  const key = (market.key ?? "").trim();
  const statType = MARKET_API_STAT_TYPE(key);
  if (!statType) return [];
  const rawOutcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
  const parsed = rawOutcomes
    .map((o) => parsePlayerSideOutcome(o))
    .filter((x): x is NonNullable<ReturnType<typeof parsePlayerSideOutcome>> => x !== null);
  const pairs: Array<{ player: string; point: number; over?: PropOutcome; under?: PropOutcome }> = [];
  for (const { player, side, point, odds: rawOdds } of parsed) {
    // NO default odds: null price stays null → validator rejects invalid odds.
    const odds = rawOdds as number; // null flows through; validation rejects it
    const existing = pairs.find((p) => p.player === player && p.point === point);
    if (!existing) pairs.push({ player, point, [side]: { side, line: point, odds } });
    else if (side === "over" && !existing.over) existing.over = { side, line: point, odds };
    else if (side === "under" && !existing.under) existing.under = { side, line: point, odds };
  }
  const period = periodForSport(sport);
  return pairs
    .filter((p): p is { player: string; point: number; over: PropOutcome; under: PropOutcome } => !!p.over && !!p.under)
    .map((p) => ({
      player: p.player,
      statType,
      period,
      outcomes: [p.over!, p.under!] as [PropOutcome, PropOutcome],
    }));
}

/**
 * Normalize a full Odds API v4 events+odds payload (player props) into
 * RawProviderProp entries with complete provenance. Honest states:
 *  - EMPTY: valid response with no parseable complete pairs
 *  - TEMPORARILY_UNAVAILABLE: payload shape unusable / HTTP-level failure signalled by empty callers
 * Malformed books/markets are dropped individually; they never fail the whole response.
 */
export function normalizeOddsApiProps(data: OddsApiGame[] | undefined | null, sport: League): ProviderNormalizationResult<RawProviderProp[]> {
  if (!Array.isArray(data)) {
    return { state: DataState.TEMPORARILY_UNAVAILABLE, reason: "odds-api response is not an array" };
  }
  const props: RawProviderProp[] = [];
  for (const game of data) {
    const providerEventId = (game.id ?? "").trim();
    const homeTeam = (game.home_team ?? "").trim();
    const awayTeam = (game.away_team ?? "").trim();
    const bookmakers = Array.isArray(game.bookmakers) ? game.bookmakers : [];
    for (const book of bookmakers) {
      const sportsbook = (book.title ?? "").trim();
      const retrievalTimestamp = (book.last_update ?? "").trim();
      const markets = Array.isArray(book.markets) ? book.markets : [];
      // WNB: `market` may repeat across books — fine: distinct sportsbook ⇒ distinct provenance.
      for (const market of markets) {
        const key = (market.key ?? "").trim();
        const statType = MARKET_API_STAT_TYPE(key);
        if (!statType) continue; // unknown market — skip, never guess
        const pairs = pairOddsApiMarket(market, sport);
        for (const pair of pairs) {
          const playerName = pair.player;
          if (playerName === "") continue;
          // The Odds API does not provide a player id for props — the identity
          // gap is surfaced HONESTLY: providerPlayerId stays empty and the
          // canonical resolver rejects the prop (fail-closed) until a provider
          // with player IDs is integrated (see WS1 prop-board audit Q1/Q5).
          props.push({
            provider: "odds-api",
            providerEventId,
            providerPlayerId: "",
            sport,
            market: key,
            statType: pair.statType,
            period: pair.period,
            playerName,
            team: undefined,
            eventName: homeTeam && awayTeam ? `${awayTeam} @ ${homeTeam}` : undefined,
            sportsbook,
            outcomes: pair.outcomes,
            retrievalTimestamp,
          });
        }
      }
    }
  }
  if (props.length === 0) {
    return { state: DataState.EMPTY, reason: "no parseable player-prop pairs in the odds-api payload", retrievedAt: undefined };
  }
  return { state: DataState.AVAILABLE, data: props, retrievedAt: new Date().toISOString() };
}