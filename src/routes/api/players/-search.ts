import { createServerFn } from "@tanstack/react-start";
import { sportsData, type League } from "~/lib/sports";

/**
 * GET /api/players/search — player catalog lookup (public).
 *
 * WS1b §2 / §11: responses carry the honest DataState. DEMO data is explicitly
 * labeled `state: "DEMO"` for logged-out exploration; it can never be used for
 * production analysis or EV (the analysis route rejects DEMO). Provider
 * failure returns TEMPORARILY_UNAVAILABLE / NOT_SUPPORTED, never fabricated
 * players.
 */
export const searchPlayers = createServerFn({ method: "GET" })
  .validator((data: { q: string; sport?: League }) => data)
  .handler(async ({ data }) => {
    const { q, sport } = data;
    const result = await sportsData.searchPlayers(q, sport);
    return {
      state: result.state,
      reason: result.reason,
      players: result.data ?? [],
    };
  });