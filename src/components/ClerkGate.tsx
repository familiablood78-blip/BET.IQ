import { type ReactNode } from "react";
import { isClerkConfigured } from "~/lib/clerk";

/**
 * Renders `children` ONLY when Clerk is configured (publishable key present).
 *
 * The root <ClerkProvider /> in __root.tsx mounts under exactly the same
 * condition, so children are guaranteed to render inside the provider.
 * When Clerk is not configured, renders `fallback` WITHOUT ever touching
 * Clerk APIs — preventing "can only be used within <ClerkProvider />" crashes.
 */
export function ClerkGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  if (!isClerkConfigured()) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * On-brand fallback shown on auth-gated pages when Clerk keys are not
 * configured in this deployment.
 */
export function AuthUnavailable({
  title = "Authentication is not available yet",
  message = "This page requires authentication, but the Clerk keys aren't configured for this deployment yet. The rest of BetIQ works fine — check back soon.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-betiq-800 bg-betiq-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/10">
          <svg className="h-6 w-6 text-gold-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-betiq-100">{title}</h2>
        <p className="mt-2 text-sm text-betiq-400">{message}</p>
      </div>
    </div>
  );
}
