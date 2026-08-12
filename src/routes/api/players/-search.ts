import { createServerFn } from "@tanstack/react-start";
import { sports, type League } from "~/lib/sports";

/**
 * GET /api/players/search
 * Search for players by name and/or sport.
 *
 * Uses the shared sports provider layer (`~/lib/sports`), which resolves the
 * configured provider (mock / real API / The Odds API) with caching, retry,
 * rate limiting, and graceful fallback to mock data on failure.
 *
 * PUBLIC by design: this is a read-only player-catalog lookup (names, teams,
 * sports, positions). It exposes no user data, no cross-user information, and
 * no prop/odds lines — so it must work for logged-out visitors who want to
 * explore players before creating an account. `analyzePlayerProp` remains
 * auth-gated and premium-limited; this endpoint stays intentionally public.
 */
export const searchPlayers = createServerFn({ method: "GET" })
  .validator((data: { q: string; sport?: League }) => data)
  .handler(async ({ data }) => {
    const { q, sport } = data;
    const players = await sports.searchPlayers(q, sport);
    return { players };
  });
