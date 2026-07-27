import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

/**
 * GET /api/subscriptions — Get current user's subscription
 */
export const getSubscription = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    const rows = await client`
      SELECT * FROM subscriptions 
      WHERE user_id = ${auth.userId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    if (rows.length === 0) {
      return { tier: "free", status: "active" };
    }
    const s = rows[0];
    return {
      id: s.id,
      tier: s.tier,
      status: s.status,
      stripeCustomerId: s.stripe_customer_id,
      currentPeriodStart: s.current_period_start ? String(s.current_period_start) : null,
      currentPeriodEnd: s.current_period_end ? String(s.current_period_end) : null,
      createdAt: String(s.created_at),
    };
  });

/**
 * POST /api/subscriptions/upgrade — Upgrade to Premium (placeholder)
 * In production, this creates a Stripe Checkout session.
 */
export const upgradeToPremium = createServerFn({ method: "POST" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();

    // Check if already premium
    const existing = await client`
      SELECT tier, status FROM subscriptions 
      WHERE user_id = ${auth.userId} AND status = 'active' 
      LIMIT 1
    `;
    if (existing.length > 0 && existing[0].tier === "premium") {
      throw new Error("Already a Premium subscriber");
    }

    // Placeholder: In production, create Stripe Checkout session here
    // const session = await stripe.checkout.sessions.create({ ... });
    // return { url: session.url };

    // For now, simulate upgrade
    await client`
      UPDATE subscriptions 
      SET tier = 'premium', status = 'active', updated_at = NOW()
      WHERE user_id = ${auth.userId}
    `;
    await client`
      UPDATE users SET is_premium = true, updated_at = NOW()
      WHERE id = ${auth.userId}
    `;

    return { success: true, tier: "premium", message: "Upgraded to Premium" };
  });

/**
 * POST /api/subscriptions/cancel — Cancel subscription
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();

    await client`
      UPDATE subscriptions 
      SET status = 'canceled', tier = 'free', updated_at = NOW()
      WHERE user_id = ${auth.userId} AND status = 'active'
    `;
    await client`
      UPDATE users SET is_premium = false, updated_at = NOW()
      WHERE id = ${auth.userId}
    `;

    return { success: true, message: "Subscription canceled" };
  });

/**
 * GET /api/subscriptions/usage — Get current usage stats
 */
export const getUsage = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analysisCount = await client`
      SELECT COUNT(*) as count FROM usage_log 
      WHERE user_id = ${auth.userId} AND action = 'analysis' AND created_at >= ${today.toISOString()}
    `;

    const user = await client`SELECT is_premium FROM users WHERE id = ${auth.userId}`;
    const isPremium = user.length > 0 && user[0].is_premium;

    return {
      isPremium,
      analysesToday: parseInt(String(analysisCount[0]?.count ?? "0"), 10),
      analysesLimit: isPremium ? 99999 : 10,
      remaining: isPremium ? 99999 : Math.max(0, 10 - parseInt(String(analysisCount[0]?.count ?? "0"), 10)),
    };
  });