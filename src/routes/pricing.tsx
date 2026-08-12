import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({ component: PricingPage });

const premiumFeatures = [
  "Unlimited AI analyses",
  "Full EV Calculator",
  "Parlay builder with AI ratings",
  "Premium alerts & notifications",
  "Advanced stats & trends",
  "Unlimited bet tracking",
  "No ads",
  "Priority support",
];

const freeFeatures = [
  "10 AI analyses per day",
  "Basic player stats",
  "Bet tracking (up to 50 bets)",
  "Standard odds display",
  "Ads supported",
];

function CheckIcon() {
  return <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>;
}

function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center mb-12">
        <span className="badge-gold">Pricing</span>
        <h1 className="section-heading mt-4">Simple, transparent pricing</h1>
        <p className="section-subheading mx-auto">Start with our free tier and upgrade when you're ready for the full power of BetIQ.</p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
        {/* Free */}
        <div className="card-betiq relative flex flex-col">
          <h3 className="text-lg font-semibold text-betiq-50">Free</h3>
          <p className="mt-1 text-sm text-betiq-400">Get started with basic analysis.</p>
          <div className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-bold text-betiq-50">$0</span><span className="text-sm text-betiq-500">/month</span></div>
          <ul className="mt-6 flex-1 space-y-3">{freeFeatures.map(f=><li key={f} className="flex items-start gap-2 text-sm text-betiq-300"><CheckIcon/>{f}</li>)}</ul>
          <Link to="/sign-up" className="btn-outline mt-8 w-full justify-center">Get Started Free</Link>
        </div>

        {/* Premium */}
        <div className="card-betiq relative flex flex-col border-gold-500/30 ring-1 ring-gold-500/20">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge-gold">Most Popular</span></div>
          <h3 className="text-lg font-semibold text-betiq-50">Premium</h3>
          <p className="mt-1 text-sm text-betiq-400">Unlock the full BetIQ experience.</p>
          <div className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-bold text-gold-500">$14.99</span><span className="text-sm text-betiq-500">/month</span></div>
          <ul className="mt-6 flex-1 space-y-3">{premiumFeatures.map(f=><li key={f} className="flex items-start gap-2 text-sm text-betiq-300"><CheckIcon/>{f}</li>)}</ul>
          <Link to="/sign-up" className="btn-gold mt-8 w-full justify-center">Upgrade to Premium</Link>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-xs text-betiq-600">All prices in USD. Cancel anytime. Must be 21+. BetIQ is a research and analytics tool — not a betting platform.</p>
      </div>
    </div>
  );
}