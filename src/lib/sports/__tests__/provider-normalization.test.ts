import { describe, expect, test } from "bun:test";
import {
  parsePlayerSideOutcome,
  pairOddsApiMarket,
  normalizeOddsApiProps,
  ODDS_API_SPORT_KEY_MAP,
  type OddsApiGame,
  OddsApiMarket,
} from "../provider-normalization";
import { DataState } from "../datastate";

describe("parsePlayerSideOutcome — Odds API outcome parsing (WS1b §3)", () => {
  test("parses 'LeBron James Over 23.5' into player + side + point + odds", () => {
    const r = parsePlayerSideOutcome({ name: "LeBron James Over 23.5", price: -110 });
    expect(r).toEqual({ player: "LeBron James", side: "over", point: 23.5, odds: -110 });
  });

  test("parses UNDER side correctly", () => {
    const r = parsePlayerSideOutcome({ name: "Stephen Curry Under 5.5 Assists", price: 120 });
    expect(r?.side).toBe("under");
    expect(r?.player).toBe("Stephen Curry");
  });

  test("rejects a bare 'Over'/'Under' outcome (no player name) — the old bug", () => {
    expect(parsePlayerSideOutcome({ name: "Over", price: -110 })).toBeNull();
    expect(parsePlayerSideOutcome({ name: "Under 23.5", price: -110 })).toBeNull();
  });

  test("missing price → null odds (never defaulted to 0)", () => {
    const r = parsePlayerSideOutcome({ name: "LeBron James Over 23.5" });
    expect(r?.odds).toBeNull();
  });
});

describe("pairOddsApiMarket — Over/Under pairing with OWN odds (WS1b §3)", () => {
  test("pairs both sides at the same point with distinct odds", () => {
    const pairs = pairOddsApiMarket(
      {
        key: "player_points",
        outcomes: [
          { name: "LeBron James Over 23.5", price: -110 },
          { name: "LeBron James Under 23.5", price: -110 },
        ],
      },
      "NBA",
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].player).toBe("LeBron James");
    expect(pairs[0].outcomes).toHaveLength(2);
  });

  test("an over without its under does not produce an incomplete pair", () => {
    const pairs = pairOddsApiMarket(
      { key: "player_points", outcomes: [{ name: "LeBron James Over 23.5", price: -110 }] },
      "NBA",
    );
    expect(pairs).toHaveLength(0);
  });

  test("unknown market key → skipped (never guessed)", () => {
    const pairs = pairOddsApiMarket(
      { key: "unknown_market", outcomes: [{ name: "X Over 1", price: -110 }, { name: "X Under 1", price: -110 }] },
      "NBA",
    );
    expect(pairs).toHaveLength(0);
  });

  test("alternate lines for the same player are preserved as distinct pairs", () => {
    const pairs = pairOddsApiMarket(
      {
        key: "player_points",
        outcomes: [
          { name: "LeBron James Over 23.5", price: -110 },
          { name: "LeBron James Under 23.5", price: -110 },
          { name: "LeBron James Over 24.5", price: -120 },
          { name: "LeBron James Under 24.5", price: 100 },
        ],
      },
      "NBA",
    );
    expect(pairs).toHaveLength(2);
  });
});

describe("normalizeOddsApiProps — provenance-complete RawProviderProp (WS1b §3)", () => {
  function sampleGame(): OddsApiGame {
    return {
      id: "evt-100",
      home_team: "Lakers",
      away_team: "Celtics",
      bookmakers: [
        {
          key: "dk",
          title: "DraftKings",
          last_update: new Date().toISOString(),
          markets: [
            {
              key: "player_points",
              outcomes: [
                { name: "LeBron James Over 23.5", price: -110 },
                { name: "LeBron James Under 23.5", price: -110 },
              ],
            },
          ],
        },
      ],
    };
  }

  test("normalizes to RawProviderProp with full provenance", () => {
    const r = normalizeOddsApiProps([sampleGame()], "NBA");
    expect(r.state).toBe(DataState.AVAILABLE);
    const p = r.data![0];
    expect(p.provider).toBe("odds-api");
    expect(p.providerEventId).toBe("evt-100");
    expect(p.market).toBe("player_points");
    expect(p.statType).toBe("points");
    expect(p.period).toBe("game");
    expect(p.playerName).toBe("LeBron James");
    expect(p.outcomes).toHaveLength(2);
    expect(p.outcomes[0].odds).toBe(-110);
    expect(p.outcomes[0].line).toBe(23.5);
  });

  test("non-array payload → TEMPORARILY_UNAVAILABLE, never AVAILABLE", () => {
    const r = normalizeOddsApiProps(undefined, "NBA");
    expect(r.state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
  });

  test("valid response with no parseable pairs → EMPTY, never AVAILABLE", () => {
    const r = normalizeOddsApiProps([{ id: "evt-200", bookmakers: [] }], "NBA");
    expect(r.state).toBe(DataState.EMPTY);
  });

  test("a malformed book does not poison sibling valid books", () => {
    const bad = {
      id: "evt-300",
      bookmakers: [
        // this book's market produces an incomplete/0-odds prop that must be dropped
        { title: "BadBook", last_update: new Date().toISOString(), markets: [{ key: "player_points", outcomes: [{ name: "Over", price: -110 }] }] },
      ],
    };
    const mixed = [bad, sampleGame()] ;
    const r = normalizeOddsApiProps(mixed as OddsApiGame[], "NBA");
    expect(r.state).toBe(DataState.AVAILABLE);
    // only the good book's prop survives
    expect(r.data!.every((p) => p.playerName === "LeBron James")).toBe(true);
  });
});

describe("ODDS_API_SPORT_KEY_MAP — sport-key URL forms (WS1b §3)", () => {
  test("leagues map to sport keys (not raw league names)", () => {
    expect(ODDS_API_SPORT_KEY_MAP.NBA).toBe("basketball_nba");
    expect(ODDS_API_SPORT_KEY_MAP.PGA).toBe("golf_pga");
    expect(ODDS_API_SPORT_KEY_MAP.UFC).toBe("mma_mixed_martial_arts");
    expect(ODDS_API_SPORT_KEY_MAP.WNBA).toBe("basketball_wnba");
    expect(ODDS_API_SPORT_KEY_MAP.Tennis).toBe("tennis_atp");
  });
});
