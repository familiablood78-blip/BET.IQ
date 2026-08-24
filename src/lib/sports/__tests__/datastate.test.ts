import { describe, expect, test } from "bun:test";
import { DataState, DATA_STATES, isDataState, isEligibleForEvAnalysis, ok, demo, staleCached, unverified, temporarilyUnavailable, notSupported, empty } from "../datastate";

describe("DataState (WS1b §1)", () => {
  test("EXACTLY seven data states", () => {
    expect(DATA_STATES).toEqual([
      "AVAILABLE",
      "EMPTY",
      "TEMPORARILY_UNAVAILABLE",
      "NOT_SUPPORTED",
      "DEMO",
      "UNVERIFIED",
      "STALE_CACHED",
    ]);
    expect(new Set(DATA_STATES).size).toBe(7);
  });

  test("only AVAILABLE is EV-analysis eligible", () => {
    expect(isEligibleForEvAnalysis("AVAILABLE")).toBe(true);
    for (const s of ["EMPTY", "TEMPORARILY_UNAVAILABLE", "NOT_SUPPORTED", "DEMO", "UNVERIFIED", "STALE_CACHED"]) {
      expect(isEligibleForEvAnalysis(s)).toBe(false);
    }
  });

  test("isDataState rejects forged states", () => {
    expect(isDataState("AVAILABLE")).toBe(true);
    expect(isDataState("SUPER_AVAILABLE")).toBe(false);
    expect(isDataState(42)).toBe(false);
    expect(isDataState(undefined)).toBe(false);
    expect(isDataState("demo")).toBe(false); // case-sensitive — only canonical strings
  });

  test("result helpers carry honest states", () => {
    expect(ok([1]).state).toBe("AVAILABLE");
    expect(demo([1]).state).toBe("DEMO");
    expect(staleCached([1]).state).toBe("STALE_CACHED");
    expect(unverified().state).toBe("UNVERIFIED");
    expect(temporarilyUnavailable("x").state).toBe("TEMPORARILY_UNAVAILABLE");
    expect(notSupported("x").state).toBe("NOT_SUPPORTED");
    expect(empty().state).toBe("EMPTY");
  });

  test("DEMO and STALE_CACHED carry data but are never convertibly AVAILABLE", () => {
    const d = demo([{ line: 10 }]);
    const s = staleCached([{ line: 10 }]);
    expect(d.state).not.toBe(DataState.AVAILABLE);
    expect(s.state).not.toBe(DataState.AVAILABLE);
    expect(isEligibleForEvAnalysis(d.state)).toBe(false);
    expect(isEligibleForEvAnalysis(s.state)).toBe(false);
  });
});