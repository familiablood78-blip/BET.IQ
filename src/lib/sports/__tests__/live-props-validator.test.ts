import { describe, expect, test } from "bun:test";
import {
  validateLiveProp,
  verifyAnalysisEligible,
  FRESHNESS_BOUNDARY_MS,
  marketIdentity,
  AnalysisEligibleProp,
} from "../live-props-validator";
import { validResolvedProp, staleRetrieval, futureRetrieval } from "./helpers";

describe("LivePropsValidator — happy path + issuance (WS1b §5/§6)", () => {
  test("a complete, fresh, correctly-paired prop is issued and runtime-eligible", () => {
    const prop = validResolvedProp();
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(verifyAnalysisEligible(r.prop)).toBe(true);
      expect(r.prop.raw.provider).toBe("sportradar");
      expect(r.prop.marketId).toBe(marketIdentity("sportradar", "evt-100", "sr-23", "player_points", "game"));
    }
  });

  test("exactly 60,000ms age is accepted (defined freshness boundary)", () => {
    const prop = validResolvedProp({ retrievalTimestamp: staleRetrieval(FRESHNESS_BOUNDARY_MS) });
    const now = Date.parse(prop.retrievalTimestamp) + FRESHNESS_BOUNDARY_MS;
    const r = validateLiveProp({ prop, now });
    expect(r.ok).toBe(true);
  });

  test("60,001ms age is rejected as stale", () => {
    const prop = validResolvedProp({ retrievalTimestamp: staleRetrieval(FRESHNESS_BOUNDARY_MS + 1) });
    const now = Date.parse(prop.retrievalTimestamp) + FRESHNESS_BOUNDARY_MS + 1;
    const r = validateLiveProp({ prop, now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("stale_timestamp");
  });

  test("future timestamps rejected with zero tolerance", () => {
    const prop = validResolvedProp({ retrievalTimestamp: futureRetrieval() });
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("future_timestamp");
  });

  test("missing timestamp rejected", () => {
    const prop = validResolvedProp({ retrievalTimestamp: "" });
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("missing_timestamp");
  });

  test("unparseable timestamp rejected", () => {
    const prop = validResolvedProp({ retrievalTimestamp: "not-a-date" });
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("invalid_timestamp");
  });
});

describe("LivePropsValidator — provenance presence (WS1b §5)", () => {
  const cases: Array<[string, Partial<ReturnType<typeof validResolvedProp>>, string]> = [
    ["provider", { provider: "  " }, "missing_provider"],
    ["providerEventId", { providerEventId: "" }, "missing_provider_event_id"],
    ["canonicalEventId", { canonicalEventId: "" }, "missing_canonical_event_id"],
    ["providerPlayerId", { providerPlayerId: "" }, "missing_provider_player_id"],
    ["canonicalPlayerId", { canonicalPlayerId: "" }, "missing_canonical_player_id"],
  ];
  for (const [name, override, reason] of cases) {
    test(`${name}: rejects with ${reason}`, () => {
      const r = validateLiveProp({ prop: validResolvedProp(override) });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons).toContain(reason);
    });
  }
});

describe("LivePropsValidator — market/stat/period registry", () => {
  test("unknown market rejected", () => {
    const r = validateLiveProp({ prop: validResolvedProp({ market: "made_up_market" }) });
    expect(!r.ok && r.reasons).toContain("unknown_market");
  });

  test("unknown stat type rejected", () => {
    const r = validateLiveProp({ prop: validResolvedProp({ statType: "three_pointers_made_up" }) });
    expect(!r.ok && r.reasons).toContain("unknown_stat_type");
  });

  test("invalid period rejected", () => {
    const r = validateLiveProp({ prop: validResolvedProp({ period: "overtime_2" }) });
    expect(!r.ok && r.reasons).toContain("invalid_period");
  });

  test("golf stroke market with complete pair passes", () => {
    const prop = validResolvedProp({
      sport: "PGA",
      market: "player_strokes",
      statType: "strokes",
      period: "round",
      playerName: "Rory McIlroy",
      team: undefined as unknown as string,
      outcomes: [
        { side: "over", line: 68.5, odds: -110 },
        { side: "under", line: 68.5, odds: -110 },
      ],
    });
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(true);
  });
});

describe("LivePropsValidator — outcome pairing, odds, lines", () => {
  test("missing OVER rejected", () => {
    const prop = validResolvedProp();
    prop.outcomes = [{ side: "under", line: 23.5, odds: -110 }];
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("missing_over");
  });

  test("missing UNDER rejected", () => {
    const prop = validResolvedProp();
    prop.outcomes = [{ side: "over", line: 23.5, odds: -110 }];
    const r = validateLiveProp({ prop });
    expect(!r.ok && r.reasons).toContain("missing_under");
  });

  test("duplicate OVER rejected", () => {
    const prop = validResolvedProp();
    prop.outcomes = [
      { side: "over", line: 23.5, odds: -110 },
      { side: "over", line: 24.5, odds: -105 },
      { side: "under", line: 23.5, odds: -110 },
    ];
    const r = validateLiveProp({ prop });
    expect(!r.ok && r.reasons).toContain("duplicate_over");
  });

  test("three outcomes → wrong count / duplicate", () => {
    const prop = validResolvedProp();
    prop.outcomes = [
      { side: "over", line: 23.5, odds: -110 },
      { side: "under", line: 23.5, odds: -110 },
      { side: "over", line: 24.5, odds: -120 },
    ];
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
  });

  test("zero outcomes → wrong count", () => {
    const prop = validResolvedProp();
    prop.outcomes = [];
    const r = validateLiveProp({ prop });
    expect(!r.ok && r.reasons).toContain("wrong_outcome_count");
  });

  test("mismatched OVER/UNDER lines rejected", () => {
    const prop = validResolvedProp();
    prop.outcomes = [
      { side: "over", line: 23.5, odds: -110 },
      { side: "under", line: 24.5, odds: -110 },
    ];
    const r = validateLiveProp({ prop });
    expect(!r.ok && r.reasons).toContain("mismatched_lines");
  });

  test.each([
    ["0", 0],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["negative", -5],
  ])("invalid line %s rejected", (_label, line) => {
    const prop = validResolvedProp();
    prop.outcomes = [
      { side: "over", line, odds: -110 },
      { side: "under", line, odds: -110 },
    ];
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
  });

  test.each([
    ["0", 0],
    ["-99", -99],
    ["+99", 99],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("invalid American odds %s → rejected", (_label, odds) => {
    const prop = validResolvedProp();
    prop.outcomes = [
      { side: "over", line: 23.5, odds },
      { side: "under", line: 23.5, odds: -110 },
    ];
    const r = validateLiveProp({ prop });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join(",")).toMatch(/missing_odds|non_finite_odds|invalid_american_odds/);
  });

  test("-100 / +100 / -110 / +140 are valid American odds", () => {
    for (const [over, under] of [[-100, -100], [100, 100], [-110, -110], [140, -120]] as const) {
      const prop = validResolvedProp();
      prop.outcomes = [
        { side: "over", line: 23.5, odds: over },
        { side: "under", line: 23.5, odds: under },
      ];
      expect(validateLiveProp({ prop }).ok).toBe(true);
    }
  });
});

describe("market identity determinism (WS1b §8)", () => {
  test("includes provider/event/player/market/period; deterministic", () => {
    const a = marketIdentity("p", "e", "pl", "player_points", "game");
    const b = marketIdentity("p", "e", "pl", "player_points", "game");
    expect(a).toBe(b);
    expect(a).toContain("player_points");
    expect(marketIdentity("p", "e", "pl", "player_points", "round")).not.toBe(a);
  });
});

describe("AnalysisEligibleProp issuance boundary (WS1b §6)", () => {
  test("manually constructed AnalysisEligibleProp is NOT eligible (module-private WeakSet)", () => {
    const prop = validResolvedProp();
    const handBuilt = new AnalysisEligibleProp(prop, "forged-market-id");
    expect(verifyAnalysisEligible(handBuilt)).toBe(false);
  });

  test("validateOrThrow rejects rather than coercing", () => {
    const { validateOrThrow } = require("../live-props-validator");
    const bad = validResolvedProp({ canonicalPlayerId: "" }); // missing canonical id → rejected
    expect(() => validateOrThrow({ prop: bad })).toThrow();
  });

  test("verifyAnalysisEligible rejects plain objects / null / primitives", () => {
    expect(verifyAnalysisEligible({})).toBe(false);
    expect(verifyAnalysisEligible(null)).toBe(false);
    expect(verifyAnalysisEligible(undefined)).toBe(false);
    expect(verifyAnalysisEligible(42)).toBe(false);
    expect(verifyAnalysisEligible("AVAILABLE")).toBe(false);
  });
});

type Strict = object;