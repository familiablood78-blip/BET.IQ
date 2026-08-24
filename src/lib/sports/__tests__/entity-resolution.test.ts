import { describe, expect, test, beforeEach } from "bun:test";
import {
  registerCanonicalPlayer,
  registerCanonicalEvent,
  resolveCanonicalPlayer,
  resolveCanonicalEvent,
  assertPlayerInEvent,
  EntityResolutionError,
  isTeamSport,
} from "../entity-resolution";

beforeEach(() => {
  // Registries are module-level; tests in this file use unique ids per case.
});

describe("Canonical player resolution (WS1b §4)", () => {
  test("known mapping resolves", () => {
    registerCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-23", canonicalPlayerId: "canon-pl-23", sport: "NBA", league: "NBA", team: "Lakers" });
    const p = resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-23", sport: "NBA", team: "Lakers" });
    expect(p.canonicalPlayerId).toBe("canon-pl-23");
  });

  test("unknown provider player → fails closed (UNKNOWN_PLAYER)", () => {
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-999", sport: "NBA" }))
      .toThrowError(EntityResolutionError);
    try {
      resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-999", sport: "NBA" });
      expect.unreachable();
    } catch (e) {
      expect((e as EntityResolutionError).kind).toBe("UNKNOWN_PLAYER");
    }
  });

  test("sport mismatch → fails closed (MISMATCHED_PLAYER)", () => {
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-23", sport: "NFL" }))
      .toThrowError(/sport mismatch/);
  });

  test("team mismatch → fails closed", () => {
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-23", sport: "NBA", team: "Celtics" }))
      .toThrowError(/team mismatch/);
  });

  test("canonical id contradiction → fails closed (MISMATCHED_PLAYER)", () => {
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-23", canonicalPlayerId: "canon-pl-OTHER", sport: "NBA" }))
      .toThrowError(/canonical id mismatch/);
  });

  test("names are secondary — identity verified by provider ids only", () => {
    // Same name but unknown provider id must fail (names never override identity).
    registerCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-24", canonicalPlayerId: "canon-pl-24", sport: "NBA", team: "Celtics" });
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-24", sport: "NBA", name: "Someone Else" })).not.toThrow();
    // A structurally identical name with a different id fails.
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-42", sport: "NBA", name: "Someone Else" }))
      .toThrowError(EntityResolutionError);
  });

  test("ambiguous identity (no registry entry) fails closed", () => {
    expect(() => resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-dupe", sport: "NBA" }))
      .toThrowError(EntityResolutionError);
  });
});

describe("Canonical event resolution (WS1b §4)", () => {
  test("known event resolves + participants verified", () => {
    registerCanonicalEvent({ provider: "sportradar", providerEventId: "evt-100", canonicalEventId: "canon-evt-100", sport: "NBA", league: "NBA", participants: ["Lakers", "Celtics"] });
    const e = resolveCanonicalEvent({ provider: "sportradar", providerEventId: "evt-100", sport: "NBA", participants: ["Lakers", "Celtics"] });
    expect(e.canonicalEventId).toBe("canon-evt-100");
  });

  test("unknown event → fails closed (UNKNOWN_EVENT)", () => {
    expect(() => resolveCanonicalEvent({ provider: "sportradar", providerEventId: "evt-999", sport: "NBA" }))
      .toThrowError(/no canonical mapping/);
  });

  test("sport mismatch → fails closed", () => {
    expect(() => resolveCanonicalEvent({ provider: "sportradar", providerEventId: "evt-100", sport: "NHL" }))
      .toThrowError(/sport mismatch/);
  });

  test("canonical event id contradiction → fails closed", () => {
    expect(() => resolveCanonicalEvent({ provider: "sportradar", providerEventId: "evt-100", canonicalEventId: "canon-evt-X", sport: "NBA" }))
      .toThrowError(/canonical id mismatch/);
  });
});

describe("Player-in-event attachment (WS1b §4: wrong event → rejected)", () => {
  test("team sport: player's team must be among event participants", () => {
    const player = registerAndGet({ provider: "sportradar", providerPlayerId: "sr-23", canonicalPlayerId: "canon-pl-23", sport: "NBA", team: "Lakers" });
    const goodEvent = registerAndGetEvent({ provider: "sportradar", providerEventId: "evt-100", canonicalEventId: "canon-evt-100", sport: "NBA", participants: ["Lakers", "Celtics"] });
    expect(() => assertPlayerInEvent(player, goodEvent)).not.toThrow();

    const wrongEvent = registerAndGetEvent({ provider: "sportradar", providerEventId: "evt-101", canonicalEventId: "canon-evt-101", sport: "NBA", participants: ["Warriors", "Nuggets"] });
    try {
      assertPlayerInEvent(player, wrongEvent);
      expect.unreachable();
    } catch (e) {
      expect((e as EntityResolutionError).kind).toBe("WRONG_EVENT");
    }
  });

  test("cross-provider player/event rejected", () => {
    const player = registerAndGet({ provider: "sportradar", providerPlayerId: "sr-23", canonicalPlayerId: "canon-pl-23", sport: "NBA", team: "Lakers" });
    const other = registerAndGetEvent({ provider: "another-provider", providerEventId: "e-1", canonicalEventId: "c-e-1", sport: "NBA", participants: ["Lakers", "Celtics"] });
    expect(() => assertPlayerInEvent(player, other)).toThrowError(/different providers/);
  });

  test("team sport player missing team → rejected", () => {
    registerCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-77", canonicalPlayerId: "canon-pl-77", sport: "NBA" });
    const p = resolveCanonicalPlayer({ provider: "sportradar", providerPlayerId: "sr-77", sport: "NBA" });
    const e = registerAndGetEvent({ provider: "sportradar", providerEventId: "evt-200", canonicalEventId: "canon-evt-200", sport: "NBA", participants: ["Lakers", "Celtics"] });
    expect(() => assertPlayerInEvent(p, e)).toThrowError(/no team to match/);
  });
});

describe("isTeamSport", () => {
  test("team vs individual", () => {
    expect(isTeamSport("NBA")).toBe(true);
    expect(isTeamSport("NFL")).toBe(true);
    expect(isTeamSport("PGA")).toBe(false);
    expect(isTeamSport("UFC")).toBe(false);
    expect(isTeamSport("Tennis")).toBe(false);
  });
});

// tiny helpers to keep registrations unique without clobbering
function registerAndGet(id: Parameters<typeof registerCanonicalPlayer>[0]) {
  registerCanonicalPlayer(id);
  return resolveCanonicalPlayer({ provider: id.provider, providerPlayerId: id.providerPlayerId, sport: id.sport });
}
function registerAndGetEvent(id: Parameters<typeof registerCanonicalEvent>[0]) {
  registerCanonicalEvent(id);
  return resolveCanonicalEvent({ provider: id.provider, providerEventId: id.providerEventId, sport: id.sport });
}