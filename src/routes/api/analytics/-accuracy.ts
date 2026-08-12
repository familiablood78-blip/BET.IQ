import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

/**
 * GET /api/analytics/accuracy — Returns prediction accuracy stats for the user.
 *
 * Stats returned:
 *   - Overall accuracy % (wins / total settled)
 *   - Total predictions and settled count
 *   - Accuracy by sport
 *   - Accuracy by confidence tier (high 80-100, medium 60-79, low 0-59)
 *   - Recent predictions with outcomes (last 20)
 *
 * Only counts settled predictions (outcome IS NOT NULL and NOT 'pending').
 * "No settled predictions yet" state is communicated via settledCount = 0.
 */
export const getAccuracyStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth();
    const userId = auth.userId!;
    const client = sql();

    // ─── Overall stats ──────────────────────────────────────────────────────
    const overallRows = await client`
      SELECT 
        COUNT(*) FILTER (WHERE outcome IN ('win', 'loss', 'push')) as settled,
        COUNT(*) FILTER (WHERE outcome = 'win') as wins,
        COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
        COUNT(*) FILTER (WHERE outcome = 'push') as pushes,
        COUNT(*) as total
      FROM ai_analyses 
      WHERE user_id = ${userId}
    `;
    const row = overallRows[0];
    const settled = parseInt(String(row.settled ?? "0"), 10);
    const wins = parseInt(String(row.wins ?? "0"), 10);
    const losses = parseInt(String(row.losses ?? "0"), 10);
    const pushes = parseInt(String(row.pushes ?? "0"), 10);
    const total = parseInt(String(row.total ?? "0"), 10);
    const accuracy = settled > 0 ? Math.round((wins / (settled - pushes)) * 100) / 100 : 0;

    // ─── Accuracy by sport ──────────────────────────────────────────────────
    const sportRows = await client`
      SELECT 
        sport,
        COUNT(*) FILTER (WHERE outcome = 'win') as wins,
        COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
        COUNT(*) FILTER (WHERE outcome = 'push') as pushes,
        COUNT(*) FILTER (WHERE outcome IN ('win', 'loss', 'push')) as settled
      FROM ai_analyses 
      WHERE user_id = ${userId}
      GROUP BY sport
      ORDER BY settled DESC
    `;
    const bySport = sportRows.map((r) => {
      const s = parseInt(String(r.settled ?? "0"), 10);
      const w = parseInt(String(r.wins ?? "0"), 10);
      const p = parseInt(String(r.pushes ?? "0"), 10);
      const denom = s - p;
      return {
        sport: r.sport,
        settled: s,
        wins: w,
        losses: parseInt(String(r.losses ?? "0"), 10),
        pushes: p,
        accuracy: denom > 0 ? Math.round((w / denom) * 100) / 100 : 0,
      };
    });

    // ─── Accuracy by confidence tier ─────────────────────────────────────────
    const tierRows = await client`
      SELECT 
        confidence_tier,
        COUNT(*) FILTER (WHERE outcome = 'win') as wins,
        COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
        COUNT(*) FILTER (WHERE outcome = 'push') as pushes,
        COUNT(*) FILTER (WHERE outcome IN ('win', 'loss', 'push')) as settled
      FROM ai_analyses 
      WHERE user_id = ${userId} AND confidence_tier IS NOT NULL
      GROUP BY confidence_tier
      ORDER BY 
        CASE confidence_tier 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END
    `;
    const byTier = tierRows.map((r) => {
      const s = parseInt(String(r.settled ?? "0"), 10);
      const w = parseInt(String(r.wins ?? "0"), 10);
      const p = parseInt(String(r.pushes ?? "0"), 10);
      const denom = s - p;
      return {
        tier: r.confidence_tier,
        settled: s,
        wins: w,
        losses: parseInt(String(r.losses ?? "0"), 10),
        pushes: p,
        accuracy: denom > 0 ? Math.round((w / denom) * 100) / 100 : 0,
      };
    });

    // ─── Recent predictions ─────────────────────────────────────────────────
    const recentRows = await client`
      SELECT 
        id, player_name, sport, prop_type, prop_line, bet_type,
        recommendation, confidence_score, outcome, result,
        projected_stat, actual_stat, settled_at, confidence_tier,
        created_at
      FROM ai_analyses 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const recent = recentRows.map((r) => ({
      id: r.id,
      playerName: r.player_name,
      sport: r.sport,
      propType: r.prop_type,
      propLine: r.prop_line,
      betType: r.bet_type,
      recommendation: r.recommendation,
      confidenceScore: r.confidence_score,
      outcome: r.outcome,
      result: r.result,
      projectedStat: r.projected_stat,
      actualStat: r.actual_stat,
      settledAt: r.settled_at ? String(r.settled_at) : null,
      confidenceTier: r.confidence_tier,
      createdAt: String(r.created_at),
    }));

    return {
      overall: {
        total,
        settled,
        wins,
        losses,
        pushes,
        accuracy,
        pendingSettlement: total - settled,
      },
      bySport,
      byTier,
      recent,
    };
  });
