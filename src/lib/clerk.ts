/**
 * Central Clerk configuration — the single source of truth for whether Clerk
 * is enabled in this deployment.
 *
 * The root <ClerkProvider /> in __root.tsx mounts under EXACTLY this condition,
 * and every component in the app that uses Clerk hooks/components is gated
 * behind `isClerkConfigured()` (via <ClerkGate />). This guarantees no Clerk
 * API is ever invoked outside the provider — no more
 * "can only be used within the <ClerkProvider /> component" errors.
 */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export function isClerkConfigured(): boolean {
  return Boolean(CLERK_PUBLISHABLE_KEY);
}
