import { describe, expect, test } from "bun:test";
import { createSportsDataFacade, ProviderError } from "../index";
import type { SportsDataProvider } from "../provider";
import type { League } from "../types";
import { DataState } from "../datastate";

function fakeProvider(overrides: Partial<SportsDataProvider> = {}): SportsDataProvider {
  const base: SportsDataProvider = {
    name: "FakeProvider",
    async searchPlayers() { return [{ id: "p1", name: "LeBron James", sport: "NBA", team: "Lakers", position: "F" }]; },
    async getPlayerStats() { return null; },
    async getPlayerProps() { return []; },
    async getGameProps() { return []; },
    async getGameOdds() { return []; },
    async getLeagueOdds() { return []; },
    async getGames() { return []; },
    async getFeaturedGames() { return []; },
    async getInjuries() { return []; },
    async getPlayerProjections() { return []; },
  };
  return { ...base, ...overrides };
}

const ODDS_CAPS = {
  searchPlayers: "supported", getPlayerStats: "not-supported", getPlayerProps: "supported", getGameProps: "supported",
  getGameOdds: "supported", getLeagueOdds: "supported", getGames: "supported", getFeaturedGames: "supported",
  getInjuries: "not-supported", getPlayerProjections: "not-supported",
} as const;

const STUB_CAPS = {
  searchPlayers: "stub", getPlayerStats: "stub", getPlayerProps: "stub", getGameProps: "stub",
  getGameOdds: "stub", getLeagueOdds: "stub", getGames: "stub", getFeaturedGames: "stub",
  getInjuries: "stub", getPlayerProjections: "stub",
} as const;

describe("Facade honest states (WS1b §11) — no silent mock fallback", () => {
  test("DEMO provider returns DEMO-labeled data (isolated, not AVAILABLE)", async () => {
    const f = createSportsDataFacade(fakeProvider(), "mock");
    const r = await f.searchPlayers("LeBron", "NBA");
    expect(r.state).toBe(DataState.DEMO);
    expect(r.state).not.toBe(DataState.AVAILABLE);
  });

  test("provider HTTP 5xx → TEMPORARILY_UNAVAILABLE, never AVAILABLE, never mock", async () => {
    const failing = fakeProvider({
      async searchPlayers() { throw new ProviderError("http_5xx", "500 from fake"); },
    });
    const f = createSportsDataFacade(failing, "odds-api", ODDS_CAPS);
    const r = await f.searchPlayers("LeBron", "NBA");
    expect(r.state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
    expect(r.reason).toMatch(/5xx/);
  });

  test("provider HTTP 4xx → TEMPORARILY_UNAVAILABLE", async () => {
    const failing = fakeProvider({
      async searchPlayers() { throw new ProviderError("http_4xx", "401 from fake"); },
    });
    const f = createSportsDataFacade(failing, "odds-api", ODDS_CAPS);
    expect((await f.searchPlayers("x", "NBA")).state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
  });

  test("provider rate limit → TEMPORARILY_UNAVAILABLE", async () => {
    const failing = fakeProvider({
      async searchPlayers() { throw new ProviderError("rate_limit", "429 quota"); },
    });
    const f = createSportsDataFacade(failing, "odds-api", ODDS_CAPS);
    expect((await f.searchPlayers("x", "NBA")).state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
  });

  test("provider returns empty array → EMPTY, never AVAILABLE", async () => {
    const f = createSportsDataFacade(fakeProvider(), "odds-api", ODDS_CAPS);
    const r = await f.getGames("NBA");
    expect(r.state).toBe(DataState.EMPTY);
  });

  test("provider method NOT_SUPPORTED by provider stays NOT_SUPPORTED (no mock)", async () => {
    // getPlayerStats is NOT_SUPPORTED on the odds-api facade:
    const f = createSportsDataFacade(fakeProvider(), "odds-api", ODDS_CAPS);
    const r = await f.getPlayerStats("p1", "NBA");
    expect(r.state).toBe(DataState.NOT_SUPPORTED);
  });

  test("stub provider method → TEMPORARILY_UNAVAILABLE (stub), never fabricated", async () => {
    const f = createSportsDataFacade(fakeProvider(), "real", STUB_CAPS);
    const r = await f.searchPlayers("LeBron", "NBA");
    expect(r.state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
    expect(r.reason).toMatch(/stub/);
  });

  test("unconfigured provider → TEMPORARILY_UNAVAILABLE honest 'no provider configured'", async () => {
    const unconfigured = fakeProvider({
      async searchPlayers() { throw new ProviderError("unconfigured", "no sports data provider configured"); },
    });
    const f = createSportsDataFacade(unconfigured, "unconfigured");
    const r = await f.searchPlayers("x", "NBA");
    expect(r.state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
  });
});

describe("Adversarial / mock-isolation (WS1b §15)", () => {
  test("DEMO data can never be coerced to AVAILABLE via the facade", async () => {
    const f = createSportsDataFacade(fakeProvider(), "mock");
    const r = await f.searchPlayers("LeBron", "NBA");
    // consumer must check state; the facade never claims AVAILABLE for mock
    expect(r.state).not.toBe(DataState.AVAILABLE);
    expect(DataState.AVAILABLE === r.state).toBe(false);
  });

  test("a failing provider cannot yield a fabricated player list", async () => {
    const f = createSportsDataFacade(fakeProvider({ async searchPlayers() { throw new Error("boom"); } }), "odds-api", ODDS_CAPS);
    const r = await f.searchPlayers("any", "NBA");
    expect(r.state).toBe(DataState.TEMPORARILY_UNAVAILABLE);
    expect(r.data).toBeUndefined();
  });
});

describe("Facade capacity gating on a healthy provider", () => {
  test("supported provider with data → AVAILABLE", async () => {
    const good = fakeProvider();
    const f = createSportsDataFacade(good, "odds-api", ODDS_CAPS);
    const r = await f.searchPlayers("LeBron", "NBA");
    expect(r.state).toBe(DataState.AVAILABLE);
    expect(r.data?.[0].name).toBe("LeBron James");
  });
});