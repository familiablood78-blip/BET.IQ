/**
 * BetIQ Auth Configuration
 *
 * Clerk authentication integration for TanStack Start.
 * Provides server-side auth utilities and middleware helpers.
 */
import { getAuth as clerkGetAuth } from "@clerk/tanstack-start/server";
import type { AuthObject } from "@clerk/backend";

/**
 * Get the current authenticated user from a request.
 * Returns null if the user is not authenticated.
 */
export async function getCurrentAuth(request: Request): Promise<AuthObject | null> {
  try {
    const auth = await clerkGetAuth({ request });
    if (!auth?.userId) return null;
    return auth;
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws 401 if not authenticated.
 */
export async function requireAuth(request: Request): Promise<AuthObject> {
  const auth = await getCurrentAuth(request);
  if (!auth?.userId) {
    throw new Error("Unauthorized");
  }
  return auth;
}
