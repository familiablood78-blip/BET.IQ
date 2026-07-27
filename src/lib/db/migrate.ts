/**
 * Database migration runner.
 * Server-only function that runs the schema SQL against Neon Postgres.
 * Call this from an API route or server function to initialize tables.
 */
import { sql } from "~/db";
import { SCHEMA_SQL } from "./schema";

export async function runMigrations(): Promise<{ success: boolean; message: string }> {
  try {
    const client = sql();
    await client(SCHEMA_SQL);
    return { success: true, message: "Schema applied successfully" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", msg);
    return { success: false, message: msg };
  }
}

/**
 * Sync a Clerk user into our users table.
 * Creates the user if they don't exist, or updates their info.
 */
export async function syncUser(clerkUserId: string, email: string, firstName?: string, lastName?: string, imageUrl?: string) {
  const client = sql();
  const existing = await client`SELECT id FROM users WHERE id = ${clerkUserId}`;
  
  if (existing.length === 0) {
    await client`
      INSERT INTO users (id, email, first_name, last_name, image_url)
      VALUES (${clerkUserId}, ${email}, ${firstName ?? null}, ${lastName ?? null}, ${imageUrl ?? null})
    `;
    // Create free subscription for new users
    await client`
      INSERT INTO subscriptions (user_id, tier, status)
      VALUES (${clerkUserId}, 'free', 'active')
    `;
  } else {
    await client`
      UPDATE users SET 
        email = ${email},
        first_name = ${firstName ?? null},
        last_name = ${lastName ?? null},
        image_url = ${imageUrl ?? null},
        updated_at = NOW()
      WHERE id = ${clerkUserId}
    `;
  }
}

/**
 * Count usage for a user within a time period (for free tier limits).
 */
export async function countUsage(userId: string, action: string, since: Date): Promise<number> {
  const client = sql();
  const rows = await client`
    SELECT COUNT(*) as count FROM usage_log 
    WHERE user_id = ${userId} AND action = ${action} AND created_at >= ${since.toISOString()}
  `;
  return parseInt(String(rows[0]?.count ?? "0"), 10);
}

/**
 * Log a usage action.
 */
export async function logUsage(userId: string, action: string, metadata?: Record<string, unknown>) {
  const client = sql();
  await client`
    INSERT INTO usage_log (user_id, action, metadata)
    VALUES (${userId}, ${action}, ${metadata ? JSON.stringify(metadata) : null})
  `;
}
