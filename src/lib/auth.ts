/**
 * BetIQ Auth Configuration
 *
 * Clerk authentication integration for TanStack Start.
 * Uses vinxi/h3's getEvent() + toWebRequest() to access the real incoming
 * Request inside server functions, since TanStack Start's ServerFnCtx does
 * not expose the request.
 */
import { getAuth as clerkGetAuth } from "@clerk/tanstack-start/server";
import { clerkClient } from "@clerk/tanstack-start/server";
import { getEvent } from "vinxi/http";
import { toWebRequest } from "h3";
import type { AuthObject } from "@clerk/backend";
import { sql } from "~/db";
import { syncUser } from "~/lib/db/migrate";

/**
 * Grab the real incoming Request from the current vinxi/h3 server context.
 * Works inside server functions (createServerFn handlers) and API routes.
 */
function currentRequest(): Request {
  return toWebRequest(getEvent());
}

/**
 * Get the current authenticated user from the incoming request.
 * Returns null if the user is not authenticated or Clerk keys are not configured.
 */
export async function getCurrentAuth(): Promise<AuthObject | null> {
  try {
    const auth = await clerkGetAuth(currentRequest());
    if (!auth?.userId) return null;
    return auth;
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthObject> {
  const auth = await getCurrentAuth();
  if (!auth?.userId) {
    throw new Error("Unauthorized");
  }
  return auth;
}

/**
 * Ensure a user exists in the local `users` table.
 * If not found, fetches from Clerk and syncs via syncUser.
 * Call this once at the start of handlers that need a local user row
 * (e.g. getProfile) after requireAuth().
 *
 * Only calls Clerk when the user row is missing — no API call per request.
 * When Clerk keys are not configured, this is a no-op (auth is null anyway).
 */
export async function ensureUser(auth: AuthObject): Promise<void> {
  const client = sql();
  const rows =
    await client`SELECT id FROM users WHERE id = ${auth.userId}`;
  if (rows.length > 0) return; // already synced

  try {
    const user = await clerkClient.users.getUser(auth.userId);
    await syncUser(
      auth.userId,
      user.primaryEmailAddress?.emailAddress ?? "",
      user.firstName ?? undefined,
      user.lastName ?? undefined,
      user.imageUrl ?? undefined,
    );
  } catch {
    // Clerk keys not configured — can't sync. User row will be created
    // by the webhook or first profile visit when keys are set.
  }
}
