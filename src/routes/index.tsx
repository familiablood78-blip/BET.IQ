import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useUser, SignInButton, SignUpButton } from "@clerk/tanstack-start";
import { useNavigate } from "@tanstack/react-router";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-betiq-800/50 bg-betiq-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold tracking-tight text-betiq-100">
            {businessName || "BetIQ"}
          </span>
          <div className="flex items-center gap-4">
            {isLoaded && user ? (
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="btn-gold text-sm"
              >
                Dashboard
              </button>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="btn-ghost text-sm">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn-gold text-sm">Get Started</button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-20 text-center">
        {/* Glow effect */}
        <div className="glow-gold pointer-events-none absolute inset-0 opacity-30" />

        <span className="badge-gold mb-6">AI-Powered Sports Betting Insights</span>
        <h1 className="gradient-gold max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Smarter Bets,{" "}
          <span className="text-betiq-100">Data-Driven Wins</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-betiq-400 sm:text-xl">
          BetIQ combines real-time stats, player trends, and AI analysis to give you
          confident player prop picks. Make informed decisions, not gut feelings.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          {isLoaded && !user && (
            <SignUpButton mode="modal">
              <button className="btn-gold text-base">
                Start Analyzing Free
              </button>
            </SignUpButton>
          )}
          {isLoaded && user && (
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="btn-gold text-base"
            >
              Go to Dashboard
            </button>
          )}
          <a href="#features" className="btn-outline text-base">
            See How It Works
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { value: "10+", label: "Sports Covered" },
            { value: "AI", label: "Powered Analysis" },
            { value: "Real-Time", label: "Data Updates" },
          ].map((stat) => (
            <div key={stat.label} className="card-betiq text-center">
              <p className="gradient-gold text-2xl font-bold">{stat.value}</p>
              <p className="mt-1 text-sm text-betiq-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="badge-gold mb-4">Features</span>
          <h2 className="section-heading">Everything You Need to Win</h2>
          <p className="section-subheading mx-auto">
            AI-powered tools designed for serious sports bettors
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🧠",
              title: "AI Prop Analysis",
              desc: "Get AI-powered confidence scores and recommendations for any player prop across all major sports.",
            },
            {
              icon: "📊",
              title: "EV Calculator",
              desc: "Calculate expected value on any bet using real-time odds and your projected probabilities.",
            },
            {
              icon: "📈",
              title: "Bet Tracking",
              desc: "Track every bet with detailed analytics on win rate, ROI, and performance by sport and prop type.",
            },
            {
              icon: "🔗",
              title: "Parlay Builder",
              desc: "Build smart parlays with AI-suggested combinations based on correlated player props.",
            },
            {
              icon: "⚡",
              title: "Real-Time Alerts",
              desc: "Get notified when line movements, injury news, or weather changes affect your bets.",
            },
            {
              icon: "🏆",
              title: "Premium Insights",
              desc: "Unlock unlimited analyses, advanced stats, and premium alerts with BetIQ Premium.",
            },
          ].map((feature) => (
            <div key={feature.title} className="card-betiq-hover group">
              <span className="mb-4 block text-3xl">{feature.icon}</span>
              <h3 className="mb-2 text-lg font-semibold text-betiq-100">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-betiq-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Leagues Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="badge-gold mb-4">Supported Leagues</span>
          <h2 className="section-heading">All Major Sports</h2>
          <p className="section-subheading mx-auto">
            NFL, NBA, MLB, NHL, PGA, UFC, Soccer, College Football & Basketball
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {["NFL", "NBA", "MLB", "NHL", "PGA", "UFC", "Soccer", "CFB", "CBB"].map(
            (league) => (
              <span
                key={league}
                className="rounded-lg border border-betiq-700 bg-betiq-900 px-4 py-2 text-sm font-medium text-betiq-300 transition-all hover:border-gold-500/50 hover:text-gold-400"
              >
                {league}
              </span>
            ),
          )}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="badge-gold mb-4">Pricing</span>
          <h2 className="section-heading">Start Free, Upgrade When Ready</h2>
          <p className="section-subheading mx-auto">
            No credit card required to get started
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:mx-auto sm:max-w-2xl sm:grid-cols-2">
          {/* Free Tier */}
          <div className="card-betiq flex flex-col">
            <h3 className="text-lg font-semibold text-betiq-100">Free</h3>
            <p className="mt-1 text-sm text-betiq-400">For casual bettors</p>
            <p className="mt-4">
              <span className="text-4xl font-bold text-betiq-100">$0</span>
              <span className="text-betiq-500">/month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-betiq-300">
              <li>✓ 10 AI analyses per day</li>
              <li>✓ Basic bet tracking</li>
              <li>✓ Player prop search</li>
              <li>✓ Save up to 10 players</li>
            </ul>
            {isLoaded && !user && (
              <SignUpButton mode="modal">
                <button className="btn-outline mt-6 w-full">Get Started</button>
              </SignUpButton>
            )}
          </div>

          {/* Premium Tier */}
          <div className="card-betiq relative flex flex-col border-gold-500/30">
            <span className="badge-gold absolute -right-2 -top-3">Popular</span>
            <h3 className="text-lg font-semibold text-gold-400">Premium</h3>
            <p className="mt-1 text-sm text-betiq-400">For serious bettors</p>
            <p className="mt-4">
              <span className="text-4xl font-bold text-betiq-100">$14.99</span>
              <span className="text-betiq-500">/month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-betiq-300">
              <li>✓ Unlimited AI analyses</li>
              <li>✓ Advanced bet tracking & stats</li>
              <li>✓ EV Calculator</li>
              <li>✓ Parlay Builder</li>
              <li>✓ Premium alerts & notifications</li>
              <li>✓ No ads</li>
            </ul>
            {isLoaded && !user && (
              <SignUpButton mode="modal">
                <button className="btn-gold mt-6 w-full">Start Free Trial</button>
              </SignUpButton>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-betiq-800/50 py-8 text-center text-sm text-betiq-600">
        <p>© 2026 {businessName || "BetIQ"}. All rights reserved.</p>
        <p className="mt-1">
          BetIQ is a research and analytics tool. Always gamble responsibly.
        </p>
      </footer>
    </div>
  );
}