import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

interface BetInput {
  sport: string;
  eventName?: string;
  playerName: string;
  propType: string;
  propLine?: number;
  betType: "over" | "under";
  odds: number;
  stake: number;
  league?: string;
  notes?: string;
}

/**
 * GET /api/bets — List user's bets
 */
export const listBets = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth();
    const client = sql();
    const rows = await client`
      SELECT * FROM bets 
      WHERE user_id = ${auth.userId} 
      ORDER BY placed_at DESC 
      LIMIT 50
    `;
    return rows.map((r) => ({
      ...r,
      placed_at: String(r.placed_at),
      settled_at: r.settled_at ? String(r.settled_at) : null,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    }));
  });

/**
 * POST /api/bets — Create a new bet
 */
export const createBet = createServerFn({ method: "POST" })
  .validator((data: BetInput) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const client = sql();

    // Enforce the free-tier bet cap (50 bets). Count is scoped to the
    // authenticated user; premium users are unlimited. Enforced here, inside
    // the server function itself, so it cannot be bypassed via a direct
    // API/server-function call.
    const subRows = await client`
      SELECT tier FROM subscriptions
      WHERE user_id = ${auth.userId} AND status = 'active'
      LIMIT 1
    `;
    const isPremium = subRows.length > 0 && subRows[0].tier === "premium";
    if (!isPremium) {
      const betCount = await client`
        SELECT COUNT(*) as count FROM bets WHERE user_id = ${auth.userId}
      `;
      const count = parseInt(String(betCount[0]?.count ?? "0"), 10);
      if (count >= 50) {
        throw new Error("Free tier limit reached (50 bets). Upgrade to Premium for unlimited bet tracking.");
      }
    }

    const result = await client`
      INSERT INTO bets (user_id, sport, event_name, player_name, prop_type, prop_line, bet_type, odds, stake, league, notes)
      VALUES (${auth.userId}, ${data.sport}, ${data.eventName ?? null}, ${data.playerName}, ${data.propType}, ${data.propLine ?? null}, ${data.betType}, ${data.odds}, ${data.stake}, ${data.league ?? null}, ${data.notes ?? null})
      RETURNING id, placed_at
    `;
    return { id: result[0].id, placedAt: String(result[0].placed_at) };
  });

/**
 * PUT /api/bets/:id — Update a bet (settle outcome)
 */
export const updateBet = createServerFn({ method: "PUT" })
  .validator((data: { id: string; outcome: "win" | "loss" | "push" | "pending"; profit?: number }) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const client = sql();
    const result = await client`
      UPDATE bets 
      SET outcome = ${data.outcome}, 
          profit = ${data.profit ?? null}, 
          settled_at = ${data.outcome !== "pending" ? "NOW()" : null},
          updated_at = NOW()
      WHERE id = ${data.id} AND user_id = ${auth.userId}
      RETURNING id, outcome, profit
    `;
    if (result.length === 0) throw new Error("Bet not found");
    return result[0];
  });

/**
 * DELETE /api/bets/:id — Delete a bet
 */
export const deleteBet = createServerFn({ method: "DELETE" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const client = sql();
    await client`DELETE FROM bets WHERE id = ${data.id} AND user_id = ${auth.userId}`;
    return { success: true };
  });

/**
 * GET /api/bets/stats — Betting stats
 */
export const getBetStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth();
    const client = sql();
    const rows = await client`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'win') as wins,
        COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
        COUNT(*) FILTER (WHERE outcome = 'push') as pushes,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(AVG(odds), 0) as avg_odds
      FROM bets WHERE user_id = ${auth.userId}
    `;
    const r = rows[0];
    const total = parseInt(String(r.total ?? "0"), 10);
    const wins = parseInt(String(r.wins ?? "0"), 10);
    const losses = parseInt(String(r.losses ?? "0"), 10);
    // Accuracy/win-rate uses only settled, decided bets: wins / (settled − pushes).
    // Unsettled (pending) bets and pushes must NOT dilute the denominator.
    const settledDecided = wins + losses;
    return {
      total,
      wins,
      losses,
      pushes: parseInt(String(r.pushes ?? "0"), 10),
      winRate: settledDecided > 0 ? Math.round((wins / settledDecided) * 100) : 0,
      totalProfit: parseFloat(String(r.total_profit ?? "0")),
      avgOdds: parseFloat(String(r.avg_odds ?? "0")),
    };
  });