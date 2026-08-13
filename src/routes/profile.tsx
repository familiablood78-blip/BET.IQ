import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useUser, SignOutButton } from "@clerk/tanstack-start";
import { useState, useEffect, useCallback } from "react";
import { ClerkGate, AuthUnavailable } from "~/components/ClerkGate";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

interface Profile { id: string; email: string; firstName: string | null; lastName: string | null; imageUrl: string | null; isPremium: boolean; createdAt: string; }
interface Sub { tier: "free" | "premium"; status: string; }
interface Usage { isPremium: boolean; analysesToday: number; analysesLimit: number; remaining: number; }

function ProfilePage() {
  return (
    <ClerkGate
      fallback={
        <AuthUnavailable
          title="Profile is not available yet"
          message="This page requires authentication, but Clerk keys aren't configured for this deployment yet. The rest of BetIQ works fine — check back soon."
        />
      }
    >
      <ProfileInner />
    </ClerkGate>
  );
}

function ProfileInner() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setError("");
      const [p, s, u] = await Promise.all([fetchProfile(), fetchSubscription(), fetchUsage()]);
      setProfile(p as Profile); setSub(s as Sub); setUsage(u as Usage);
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upgrade = async () => {
    if (!confirm("Upgrade to Premium for $14.99/month?")) return;
    try { setUpgrading(true);
      await upgradeFn();
      load();
    } catch (e: any) { setError(e.message || "Upgrade failed"); }
    finally { setUpgrading(false); }
  };

  const cancel = async () => {
    if (!confirm("Cancel your Premium subscription? You'll revert to Free.")) return;
    try {
      await cancelFn(); load();
    } catch (e: any) { setError(e.message || "Cancel failed"); }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><p className="text-betiq-400 animate-pulse">Loading profile...</p></div>;
  if (!user) return <div className="flex min-h-dvh items-center justify-center"><div className="text-center"><p className="text-betiq-300 mb-4">Please sign in to view your profile</p><button onClick={()=>navigate({to:"/sign-in"})} className="btn-gold">Sign In</button></div></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <h1 className="text-2xl font-bold text-betiq-50">Profile</h1>
      {error && <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {/* User info card */}
      <div className="card-betiq flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10 text-2xl font-bold text-gold-400">
          {profile?.firstName?.[0] || user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-betiq-50">{profile?.firstName || user.firstName} {profile?.lastName || user.lastName}</h2>
          <p className="text-sm text-betiq-400">{profile?.email || user.emailAddresses?.[0]?.emailAddress || ""}</p>
          <p className="mt-1 text-xs text-betiq-500">Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US",{month:"long",year:"numeric"}) : "—"}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge-gold ${sub?.tier === "premium" ? "bg-gold-500/20 text-gold-300" : ""}`}>
            {sub?.tier === "premium" ? "Premium" : "Free"}
          </span>
          <SignOutButton><button className="btn-ghost text-xs">Sign Out</button></SignOutButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subscription */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-betiq">
            <h3 className="mb-4 text-sm font-semibold text-betiq-200">Subscription</h3>
            {sub?.tier === "premium" ? (
              <div>
                <div className="flex items-center gap-2 mb-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10"><svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg></span><span className="text-green-400 text-sm font-medium">Premium Active</span></div>
                <p className="text-xs text-betiq-400">You have unlimited AI analyses, full EV calculator, premium alerts, and no ads.</p>
                <button onClick={cancel} className="btn-outline mt-4 text-xs text-red-400 hover:text-red-300">Cancel Subscription</button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-betiq-400 mb-4">You're on the Free tier. Upgrade for unlimited AI analyses, EV calculator, premium alerts, and no ads.</p>
                <button onClick={upgrade} disabled={upgrading} className="btn-gold text-sm">{upgrading ? "Processing..." : "Upgrade to Premium — $14.99/mo"}</button>
                <p className="mt-2 text-[10px] text-betiq-500">Cancel anytime. No commitment.</p>
              </div>
            )}
          </div>

          {/* Feature comparison */}
          <div className="card-betiq">
            <h3 className="mb-4 text-sm font-semibold text-betiq-200">Plan Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead><tr className="border-b border-betiq-800/50 text-left text-[10px] font-medium uppercase tracking-wider text-betiq-500">
                  <th className="pb-2 pr-3">Feature</th><th className="pb-2 pr-3 text-center">Free</th><th className="pb-2 text-center">Premium</th></tr></thead>
                <tbody className="divide-y divide-betiq-800/30">
                  {[{f:"AI Analyses / Day",free:"10",prem:"Unlimited"},{f:"EV Calculator",free:"—",prem:"✓"},{f:"Parlay Builder",free:"—",prem:"✓"},{f:"Premium Alerts",free:"—",prem:"✓"},{f:"Advanced Stats",free:"—",prem:"✓"},{f:"Bet Tracking",free:"50 bets",prem:"Unlimited"},{f:"Ads",free:"Yes",prem:"None"},{f:"Support",free:"Standard",prem:"Priority"}]
                    .map((r,i)=>(<tr key={i} className="text-xs"><td className="py-2.5 pr-3 text-betiq-300">{r.f}</td>
                      <td className="py-2.5 pr-3 text-center text-betiq-400">{r.free}</td>
                      <td className="py-2.5 text-center font-medium text-gold-400">{r.prem}</td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Usage stats sidebar */}
        <div className="space-y-4">
          <div className="card-betiq">
            <h3 className="mb-3 text-sm font-semibold text-betiq-200">Usage Today</h3>
            {usage && (<>
              <div className="mb-3"><div className="flex justify-between text-xs text-betiq-500 mb-1"><span>Analyses</span><span>{usage.analysesToday} / {usage.analysesLimit}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-betiq-800"><div className="h-full rounded-full bg-gold-500" style={{width:`${Math.min(100,(usage.analysesToday/(usage.analysesLimit||1))*100)}%`}}/></div></div>
              <p className="text-[10px] text-betiq-500">{usage.isPremium ? "Unlimited Premium access" : `${usage.remaining} analyses remaining today`}</p>
            </>)}
          </div>
          <div className="card-betiq">
            <h3 className="mb-3 text-sm font-semibold text-betiq-200">Account</h3>
            <ul className="space-y-2 text-xs text-betiq-400">
              {["Notification Settings","Privacy & Security","Help Center","Contact Support"].map(i=>(<li key={i}><a href="#" className="transition-colors hover:text-gold-400">{i}</a></li>))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const fetchProfile = createServerFn({ method: "GET" }).handler(async () => { const { getProfile } = await import("./api/user/-profile"); return getProfile(); });
const fetchSubscription = createServerFn({ method: "GET" }).handler(async () => { const { getSubscription } = await import("./api/subscriptions/-index"); return getSubscription(); });
const fetchUsage = createServerFn({ method: "GET" }).handler(async () => { const { getUsage } = await import("./api/subscriptions/-index"); return getUsage(); });
const upgradeFn = createServerFn({ method: "POST" }).handler(async () => { const { upgradeToPremium } = await import("./api/subscriptions/-index"); return upgradeToPremium(); });
const cancelFn = createServerFn({ method: "POST" }).handler(async () => { const { cancelSubscription } = await import("./api/subscriptions/-index"); return cancelSubscription(); });