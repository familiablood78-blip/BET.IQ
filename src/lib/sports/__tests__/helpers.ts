import type { RawProviderProp, ResolvedProviderProp, PropOutcome } from "../types";

/** Build a provenance-complete, structurally valid ResolvedProviderProp. */
export function validResolvedProp(overrides: Partial<ResolvedProviderProp> = {}): ResolvedProviderProp {
  const base: ResolvedProviderProp = {
    provider: "sportradar",
    providerEventId: "evt-100",
    providerPlayerId: "sr-23",
    canonicalEventId: "canon-evt-100",
    canonicalPlayerId: "canon-pl-23",
    canonicalPlayerName: "canon-pl-23",
    sport: "NBA",
    league: "NBA",
    market: "player_points",
    statType: "points",
    period: "game",
    playerName: "LeBron James",
    team: "Lakers",
    eventName: "Lakers @ Celtics",
    sportsbook: "DraftKings",
    outcomes: [
      { side: "over", line: 23.5, odds: -110 },
      { side: "under", line: 23.5, odds: -110 },
    ] as PropOutcome[],
    retrievalTimestamp: new Date(Date.now() - 5_000).toISOString(),
  };
  return { ...base, ...overrides };
}

/** Build a fresh-valid market age in ms. */
export function freshRetrieval(ageMs = 5_000): string {
  return new Date(Date.now() - ageMs).toISOString();
}

export function staleRetrieval(ageMs: number): string {
  return new Date(Date.now() - ageMs).toISOString();
}

export function futureRetrieval(msAhead = 10_000): string {
  return new Date(Date.now() + msAhead).toISOString();
}