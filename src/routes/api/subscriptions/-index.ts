import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

/**
 * GET /api/subscriptions — Get current user's subscription
 */
export const getSubscription = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth();
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
 * POST /api/subscriptions/upgrade — Upgrade to Premium
 *
 * FAIL CLOSED — production requirement. Premium must NEVER be granted
 * unless a real Stripe Checkout payment has been created AND its success
 * verified (payment-success webhook / session retrieval). Stripe Checkout is
 * NOT implemented yet, so this endpoint rejects EVERY call. It never updates
 * subscriptions.tier, subscriptions.status, or users.is_premium —
 * regardless of whether STRIPE_SECRET_KEY is present (a configured key is NOT
 * a verified payment). Remove this hard fail only when real Stripe Checkout
 * session creation + payment verification are implemented.
 */
export const upgradeToPremium = createServerFn({ method: "POST" })
  .handler(async () => {
    await requireAuth();
    throw new Error(
      "Premium checkout is not available yet — Stripe payment verification is not implemented on this deployment."
    );
  });

/**
 * POST /api/subscriptions/cancel — Cancel subscription
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .handler(async () => {
    const auth = await requireAuth();
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
    const auth = await requireAuth();
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