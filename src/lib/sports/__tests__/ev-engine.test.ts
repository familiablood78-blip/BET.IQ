import { describe, expect, test } from "bun:test";
import { calculateEv, EvEngineError } from "../ev-engine";
import { validateLiveProp } from "../live-props-validator";
import { validResolvedProp, freshRetrieval } from "./helpers";

function issueValid() {
  const prop = validResolvedProp({
    retrievalTimestamp: freshRetrieval(5_000),
    outcomes: [
      { side: "over", line: 23.5, odds: -110 },
      { side: "under", line: 23.5, odds: -110 },
    ],
  });
  const r = validateLiveProp({ prop });
  if (!r.ok) throw new Error(`setup: expected valid ${r.reasons}`);
  return r.prop;
}

describe("EVEngine — happy path (WS1b §7)", () => {
  test("computes finite EV for a genuinely issued prop", () => {
    const issued = issueValid();
    const ev = calculateEv(issued, 0.55, "over");
    expect(ev.side).toBe("over");
    expect(Number.isFinite(ev.ev)).toBe(true);
    expect(Number.isFinite(ev.impliedProbability)).toBe(true);
    expect(ev.odds).toBe(-110);
    // EV = 0.55 * (1 + 100/110) - 1 ≈ 0.55*1.909 - 1 = 0.05
    expect(ev.ev).toBeCloseTo(0.55 * (1 + 100 / 110) - 1, 5);
  });

  test("under side computes its own odds", () => {
    const issued = issueValid();
    const ev = calculateEv(issued, 0.5, "under");
    expect(ev.side).toBe("under");
    expect(ev.odds).toBe(-110);
  });
});

describe("EVEngine — strict rejection (WS1b §7)", () => {
  test.each([
    ["NaN probability", Number.NaN],
    ["Infinity probability", Number.POSITIVE_INFINITY],
    ["-Infinity probability", Number.NEGATIVE_INFINITY],
    ["0 probability", 0],
    ["1 probability", 1],
    ["negative probability", -0.1],
    [">1 probability", 1.1],
    ["string probability", "0.5" as unknown as number],
  ])("%s rejected", (_label, p) => {
    const issued = issueValid();
    expect(() => calculateEv(issued, p, "over")).toThrowError(EvEngineError);
  });

  test("raw object rejected — EVEngine verifies runtime issuance", () => {
    const raw = validResolvedProp();
    expect(() => calculateEv(raw as never, 0.55, "over")).toThrowError(/not a runtime-issued/);
  });

  test("JSON.parse(validProp) rejected", () => {
    const issued = issueValid();
    const serialized = JSON.parse(JSON.stringify({ raw: issued.raw }));
    expect(() => calculateEv(serialized as never, 0.55, "over")).toThrowError(/not a runtime-issued/);
  });

  test("object spread of a valid prop rejected", () => {
    const issued = issueValid();
    const spread = { ...issued, raw: issued.raw };
    expect(() => calculateEv(spread as never, 0.55, "over")).toThrowError(/not a runtime-issued/);
  });

  test("structurally identical object rejected", () => {
    const issued = issueValid();
    const clone = Object.assign(Object.create(Object.getPrototypeOf(issued)), issued);
    expect(() => calculateEv(clone as never, 0.55, "over")).toThrowError(/not a runtime-issued/);
  });

  test("forged status / analysisEligible flag rejected", () => {
    const forged = { ...issueValid().raw, analysisEligible: true, status: "AVAILABLE" };
    expect(() => calculateEv(forged as never, 0.55, "over")).toThrowError(/not a runtime-issued/);
  });

  test("missing/invalid side rejected", () => {
    const issued = issueValid();
    expect(() => calculateEv(issued, 0.55, "push" as never)).toThrowError(/invalid side/);
  });
});

describe("EVEngine — the single-call invariant (WS1b §7)", () => {
  test("no exported alternative producers; only one public entry", () => {
    // The module must expose ONLY calculateEv (no bypass to compute EV another way).
    const exported = Object.keys(require("../ev-engine"));
    expect(exported).toContain("calculateEv");
    expect(exported).toContain("EvEngineError");
    // No convenience that computes EV from a plain object.
    expect(exported.some((k) => /calculate.*Raw|from.*Raw|evFrom/i.test(k))).toBe(false);
  });
});