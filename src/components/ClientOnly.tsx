import { Component, type ReactNode, useState, useEffect } from "react";
import { isClerkConfigured } from "~/lib/clerk";

/**
 * Only renders children on the client side. On the server, renders the optional
 * fallback. Use this to wrap Clerk-dependent UI that crashes SSR when
 * ClerkProvider is unavailable.
 */
export function ClientOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <>{fallback ?? null}</>;
  return <>{children}</>;
}

/**
 * Wraps Clerk-dependent UI with:
 *   1. A static config guard — when Clerk isn't configured (no publishable
 *      key, so no <ClerkProvider /> in the root), the fallback renders
 *      directly and NO Clerk hook/component is ever invoked.
 *   2. Client-only rendering (SSR hydration safety).
 *   3. An error boundary as a final safety net.
 * Use this for landing-page CTAs and pricing buttons.
 */
export function SafeClerk({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  if (!isClerkConfigured()) return <>{fallback}</>;
  return (
    <ClientOnly fallback={fallback}>
      <ClerkErrorBoundary fallback={fallback}>{children}</ClerkErrorBoundary>
    </ClientOnly>
  );
}

class ClerkErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <>{this.props.fallback}</>;
    return <>{this.props.children}</>;
  }
}
