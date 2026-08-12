import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useUser } from "@clerk/tanstack-start";
import { useState, useEffect, useCallback } from "react";
import { ClerkGate, AuthUnavailable } from "~/components/ClerkGate";

export const Route = createFileRoute("/admin")({ component: AdminPage });

interface Analytics {
  totalUsers: number; premiumUsers: number; conversionRate: number;
  totalAnalyses: number; totalBets: number; recentSignups: number;
  recentAnalyses: { id: string; playerName: string; sport: string; propType: string; confidenceScore: number; recommendation: string; createdAt: string }[];
}

function AdminPage() {
  return (
    <ClerkGate
      fallback={
        <AuthUnavailable
          title="Admin dashboard is not available yet"
          message="This page requires authentication, but Clerk keys aren't configured for this deployment yet. The rest of BetIQ works fine — check back soon."
        />
      }
    >
      <AdminInner />
    </ClerkGate>
  );
}

function AdminInner() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true);
      const d = await fetchAnalytics();
      setData(d as Analytics);
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isLoaded && user) load(); }, [isLoaded, user, load]);

  if (!isLoaded) return <div className="flex min-h-dvh items-center justify-center"><p className="text-betiq-400 animate-pulse">Loading...</p></div>;
  if (!user) return <div className="flex min-h-dvh items-center justify-center"><p className="text-betiq-400">Sign in required</p></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-betiq-50">Admin Dashboard</h1>
        <p className="text-sm text-betiq-400">Platform overview and analytics</p>
      </div>

      {error && <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading && <div className="text-center py-12"><p className="text-betiq-400 animate-pulse">Loading analytics...</p></div>}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { l: "Total Users", v: data.totalUsers, c: "text-betiq-100" },
              { l: "Premium Users", v: data.premiumUsers, c: "text-gold-400" },
              { l: "Conversion", v: data.conversionRate + "%", c: "text-green-400" },
              { l: "Analyses Run", v: data.totalAnalyses.toLocaleString(), c: "text-betiq-100" },
              { l: "Bets Placed", v: data.totalBets.toLocaleString(), c: "text-betiq-100" },
              { l: "7-Day Signups", v: data.recentSignups, c: "text-green-400" },
            ].map(k => (
              <div key={k.l} className="card-betiq text-center">
                <p className={`text-2xl font-bold ${k.c}`}>{k.v}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-betiq-500">{k.l}</p>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div className="card-betiq">
            <h3 className="mb-2 text-sm font-semibold text-betiq-200">Monthly Recurring Revenue</h3>
            <p className="text-3xl font-bold text-gold-400">${(data.premiumUsers * 14.99).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="mt-1 text-xs text-betiq-500">{data.premiumUsers} premium users × $14.99</p>
          </div>

          {/* Recent analyses */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-betiq-200">Recent AI Analyses</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead><tr className="border-b border-betiq-800/50 text-left text-[10px] font-medium uppercase tracking-wider text-betiq-500">
                  <th className="pb-2 pr-3">Player</th><th className="pb-2 pr-3">Sport</th><th className="pb-2 pr-3">Prop</th><th className="pb-2 pr-3 text-right">Confidence</th><th className="pb-2 pr-3">Recommendation</th><th className="pb-2 text-right">Date</th></tr></thead>
                <tbody className="divide-y divide-betiq-800/30">
                  {data.recentAnalyses.map(a => (
                    <tr key={a.id} className="text-xs transition-colors hover:bg-betiq-900/50">
                      <td className="py-2.5 pr-3 font-medium text-betiq-200">{a.playerName}</td>
                      <td className="py-2.5 pr-3 text-betiq-400">{a.sport}</td>
                      <td className="py-2.5 pr-3 text-betiq-400">{a.propType}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-2"><div className="h-1.5 w-10 rounded-full bg-betiq-800"><div className="h-full rounded-full bg-gold-500" style={{width:`${a.confidenceScore}%`}}/></div><span className="text-gold-400">{a.confidenceScore}%</span></div>
                      </td>
                      <td className="py-2.5 pr-3"><span className={a.recommendation.includes("Over")?"text-green-400":a.recommendation.includes("Under")?"text-red-400":"text-betiq-400"}>{a.recommendation}</span></td>
                      <td className="py-2.5 text-right text-betiq-500">{new Date(a.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const fetchAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const { getDashboardAnalytics } = await import("./api/analytics/-index");
  return getDashboardAnalytics();
});