import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode, useState, useCallback, useEffect } from "react";
import { FeedbackWidget, BugReportModal } from "./FeedbackWidget";
import { ErrorBoundary } from "./ErrorBoundary";

/* ---------- Marketing header (landing page) ---------- */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-betiq-800/50 bg-betiq-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500">
            <span className="text-sm font-bold text-betiq-950">IQ</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-betiq-50">
            Bet<span className="text-gold-500">IQ</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="btn-ghost">
              {item.label}
            </a>
          ))}
          <div className="ml-4 border-l border-betiq-800 pl-4">
            <a href="/dashboard" className="btn-gold text-sm">
              Launch App
            </a>
          </div>
        </nav>

        <button
          type="button"
          className="btn-ghost md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-betiq-800/50 bg-betiq-950 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="btn-ghost justify-start"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 border-t border-betiq-800 pt-2">
              <Link
                to="/dashboard"
                className="btn-gold w-full justify-center"
                onClick={() => setMobileOpen(false)}
              >
                Launch App
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-betiq-800/50 bg-betiq-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500">
                <span className="text-xs font-bold text-betiq-950">IQ</span>
              </div>
              <span className="text-base font-bold tracking-tight text-betiq-50">
                Bet<span className="text-gold-500">IQ</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-betiq-400">
              Data-driven sports betting analytics. Research. Analyze. Track.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-betiq-200">Product</h3>
            <ul className="mt-3 space-y-2">
              {[["Features", "/#features"], ["Pricing", "/#pricing"], ["Dashboard", "/dashboard"]].map(([label, href]) => (
                <li key={label as string}>
                  <Link to={href as "/dashboard"} className="text-sm text-betiq-400 transition-colors hover:text-gold-400">
                    {label as string}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-betiq-200">Company</h3>
            <ul className="mt-3 space-y-2">
              {["About", "Blog", "Careers"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-betiq-400 transition-colors hover:text-gold-400">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-betiq-200">Legal</h3>
            <ul className="mt-3 space-y-2">
              {["Privacy", "Terms", "Contact"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-betiq-400 transition-colors hover:text-gold-400">
                    {item}
                  </a>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => {
                  const event = new CustomEvent("betiq:open-bug-report");
                  window.dispatchEvent(event);
                }} className="text-sm text-betiq-400 transition-colors hover:text-gold-400">
                  Report a Bug
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-betiq-800/50 pt-6">
          <p className="text-center text-xs text-betiq-500">
            &copy; {new Date().getFullYear()} BetIQ. All rights reserved. BetIQ is a research and analytics tool — not a betting platform. Always gamble responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- App Shell (sidebar + bottom nav for internal pages) ---------- */

const appNavItems = [
  {
    label: "Dashboard",
    to: "/dashboard" as const,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Analyzer",
    to: "/analyzer" as const,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
  {
    label: "EV Calculator",
    to: "/ev-calculator" as const,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    label: "Bet Tracker",
    to: "/bet-tracker" as const,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    label: "Profile",
    to: "/profile" as const,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const pathname = location.pathname;

  // Listen for bug report custom event from Footer
  useEffect(() => {
    const handler = () => setBugReportOpen(true);
    window.addEventListener("betiq:open-bug-report", handler);
    return () => window.removeEventListener("betiq:open-bug-report", handler);
  }, []);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-betiq-800/50 px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={closeSidebar}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500">
            <span className="text-sm font-bold text-betiq-950">IQ</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-betiq-50">
            Bet<span className="text-gold-500">IQ</span>
          </span>
        </Link>
        <button type="button" onClick={closeSidebar} className="btn-ghost lg:hidden" aria-label="Close sidebar">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {appNavItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gold-500/10 text-gold-400"
                      : "text-betiq-300 hover:bg-betiq-800 hover:text-betiq-100"
                  }`}
                >
                  <span className={isActive ? "text-gold-400" : "text-betiq-400"}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-betiq-800/50 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-betiq-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/10 text-gold-400 text-xs font-bold">
            IQ
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-betiq-800/50 bg-betiq-950 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-betiq-800/50 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500">
              <span className="text-sm font-bold text-betiq-950">IQ</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-betiq-50">
              Bet<span className="text-gold-500">IQ</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {appNavItems.map((item) => {
              const isActive = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gold-500/10 text-gold-400"
                        : "text-betiq-300 hover:bg-betiq-800 hover:text-betiq-100"
                    }`}
                  >
                    <span className={isActive ? "text-gold-400" : "text-betiq-400"}>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-betiq-800/50 px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-betiq-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/10 text-gold-400 text-xs font-bold">
              IQ
            </div>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile header with hamburger */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-betiq-800/50 bg-betiq-950 px-4 lg:hidden">
        <button type="button" onClick={() => setSidebarOpen(true)} className="btn-ghost -ml-2" aria-label="Open menu">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500">
            <span className="text-xs font-bold text-betiq-950">IQ</span>
          </div>
          <span className="text-base font-bold tracking-tight text-betiq-50">
            Bet<span className="text-gold-500">IQ</span>
          </span>
        </Link>
        <div className="w-10" />{/* spacer for centering */}
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 lg:hidden ${
          sidebarOpen ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {/* Dark backdrop — tap to close */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
        {/* Slide-in drawer */}
        <aside
          className={`absolute inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-betiq-950 border-r border-betiq-800/50 shadow-2xl transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </aside>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-betiq-800/50 bg-betiq-950/95 backdrop-blur-xl lg:hidden">
        <ul className="flex items-center justify-around">
          {appNavItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.to;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    isActive ? "text-gold-400" : "text-betiq-500"
                  }`}
                >
                  <span className={isActive ? "text-gold-400" : "text-betiq-500"}>{item.icon}</span>
                  <span>{item.label === "EV Calculator" ? "EV Calc" : item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <FeedbackWidget />
      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </div>
  );
}

/* ---------- Top-level Layout (routes between marketing and app) ---------- */
export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAppPage = location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/analyzer") ||
    location.pathname.startsWith("/ev-calculator") ||
    location.pathname.startsWith("/bet-tracker") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/pricing") ||
    location.pathname.startsWith("/sign-in") ||
    location.pathname.startsWith("/sign-up") ||
    location.pathname.startsWith("/demo");

  if (isAppPage) {
    return <ErrorBoundary><AppShell>{children}</AppShell></ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <Header />
      <main>{children}</main>
      <Footer />
    </ErrorBoundary>
  );
}