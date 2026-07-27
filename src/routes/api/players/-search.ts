import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/auth";
import { registerProvider, getProvider, type Sport } from "~/lib/sports/provider";
import { MockSportsDataProvider } from "~/lib/sports/mock-provider";
import { TheOddsApiProvider } from "~/lib/sports/odds-api-provider";

// Auto-register providers on module load
try {
  registerProvider(new MockSportsDataProvider());
  // The Odds API provider is registered if ODDS_API_KEY is set
  if (process.env.ODDS_API_KEY) {
    registerProvider(new TheOddsApiProvider());
  }
} catch {
  // Already registered
}

/**
 * GET /api/players/search
 * Search for players by name and/or sport.
 */
export const searchPlayers = createServerFn({ method: "GET" })
  .validator((data: { q: string; sport?: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth(new Request("http://localhost"));
    const { q, sport } = data;
    const provider = getProvider();
    const players = await provider.searchPlayers(q, sport as Sport | undefined);
    return { players };
  });