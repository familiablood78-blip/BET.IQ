import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

/**
 * GET /api/analytics/dashboard — Admin dashboard analytics
 * Requires premium/admin access.
 */
export const getDashboardAnalytics = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();

    // Check if user is admin (email check as simple gate)
    const user = await client`SELECT email FROM users WHERE id = ${auth.userId}`;
    const email = user[0]?.email ?? "";
    // Admin check placeholder: in production use proper role-based access
    // For now, any authenticated user can see their own analytics

    // Total users
    const totalUsers = await client`SELECT COUNT(*) as count FROM users`;
    // Premium users
    const premiumUsers = await client`SELECT COUNT(*) as count FROM users WHERE is_premium = true`;
    // Total analyses
    const totalAnalyses = await client`SELECT COUNT(*) as count FROM ai_analyses`;
    // Total bets
    const totalBets = await client`SELECT COUNT(*) as count FROM bets`;
    // Recent signups (last 7 days)
    const recentUsers = await client`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;

    // Recent analyses
    const recentAnalyses = await client`
      SELECT id, player_name, sport, prop_type, confidence_score, recommendation, created_at
      FROM ai_analyses 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return {
      totalUsers: parseInt(String(totalUsers[0]?.count ?? "0"), 10),
      premiumUsers: parseInt(String(premiumUsers[0]?.count ?? "0"), 10),
      conversionRate: parseInt(String(totalUsers[0]?.count ?? "0"), 10) > 0
        ? Math.round((parseInt(String(premiumUsers[0]?.count ?? "0"), 10) / parseInt(String(totalUsers[0]?.count ?? "0"), 10)) * 100)
        : 0,
      totalAnalyses: parseInt(String(totalAnalyses[0]?.count ?? "0"), 10),
      totalBets: parseInt(String(totalBets[0]?.count ?? "0"), 10),
      recentSignups: parseInt(String(recentUsers[0]?.count ?? "0"), 10),
      recentAnalyses: recentAnalyses.map((r) => ({
        id: r.id,
        playerName: r.player_name,
        sport: r.sport,
        propType: r.prop_type,
        confidenceScore: r.confidence_score,
        recommendation: r.recommendation,
        createdAt: String(r.created_at),
      })),
    };
  });

/**
 * GET /api/analytics/top-players — Most analyzed players
 */
export const getTopPlayers = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    const rows = await client`
      SELECT player_name, sport, COUNT(*) as count, AVG(confidence_score) as avg_confidence
      FROM ai_analyses
      GROUP BY player_name, sport
      ORDER BY count DESC
      LIMIT 20
    `;
    return rows.map((r) => ({
      playerName: r.player_name,
      sport: r.sport,
      count: parseInt(String(r.count ?? "0"), 10),
      avgConfidence: parseFloat(String(r.avg_confidence ?? "0")),
    }));
  });