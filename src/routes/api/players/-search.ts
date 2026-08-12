import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/auth";
import { sports, type League } from "~/lib/sports";

/**
 * GET /api/players/search
 * Search for players by name and/or sport.
 *
 * Uses the shared sports provider layer (`~/lib/sports`), which resolves the
 * configured provider (mock / real API / The Odds API) with caching, retry,
 * rate limiting, and graceful fallback to mock data on failure.
 */
export const searchPlayers = createServerFn({ method: "GET" })
  .validator((data: { q: string; sport?: League }) => data)
  .handler(async ({ data }) => {
    await requireAuth();
    const { q, sport } = data;
    const players = await sports.searchPlayers(q, sport);
    return { players };
  });
