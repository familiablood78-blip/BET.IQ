import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/ev-calculator")({
  component: EvCalculator,
});

function EvCalculator() {
  const [odds, setOdds] = useState("");
  const [prob, setProb] = useState("");
  const [result, setResult] = useState<{
    impliedProb: number;
    expectedValue: number;
    evPercent: number;
    edge: number;
    kellyStake: number;
    isPositive: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  const calculate = useCallback(() => {
    setError("");

    const oddsNum = parseFloat(odds);
    const probNum = parseFloat(prob);

    if (!odds || !prob) {
      setError("Please fill in both fields");
      return;
    }
    if (isNaN(oddsNum) || isNaN(probNum)) {
      setError("Please enter valid numbers");
      return;
    }
    if (probNum < 0 || probNum > 100) {
      setError("Probability must be between 0% and 100%");
      return;
    }

    // Convert American odds to implied probability
    let impliedProb: number;
    if (oddsNum > 0) {
      impliedProb = 100 / (oddsNum + 100);
    } else {
      impliedProb = Math.abs(oddsNum) / (Math.abs(oddsNum) + 100);
    }

    // Your probability as decimal
    const yourProb = probNum / 100;

    // Expected value
    const oddsDecimal = oddsNum > 0
      ? (oddsNum / 100) + 1
      : (100 / Math.abs(oddsNum)) + 1;

    const ev = (yourProb * (oddsDecimal - 1)) - ((1 - yourProb) * 1);
    const evPercent = ev * 100;

    // Edge
    const edge = ((yourProb - impliedProb) / impliedProb) * 100;

    // Kelly stake
    const kelly = (oddsDecimal - 1) > 0
      ? ((yourProb * (oddsDecimal - 1)) - (1 - yourProb)) / (oddsDecimal - 1)
      : 0;
    const kellyStake = Math.max(0, kelly * 100);

    setResult({
      impliedProb: impliedProb * 100,
      expectedValue: ev,
      evPercent,
      edge,
      kellyStake,
      isPositive: ev > 0,
    });
  }, [odds, prob]);

  const reset = useCallback(() => {
    setOdds("");
    setProb("");
    setResult(null);
    setError("");
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-betiq-50">EV Calculator</h1>
        <p className="mt-1 text-sm text-betiq-400">
          Calculate expected value and optimal stake size for any bet
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Inputs - 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card-betiq">
            <h2 className="mb-5 text-sm font-semibold text-betiq-200">Inputs</h2>

            <div className="space-y-4">
              {/* American odds */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-betiq-400">
                  American Odds
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-betiq-500">
                    {odds.startsWith("-") ? "" : "+"}
                  </span>
                  <input
                    type="text"
                    placeholder="-110, +150, etc."
                    value={odds}
                    onChange={(e) => setOdds(e.target.value.replace(/[^0-9-]/g, ""))}
                    className="w-full rounded-lg border border-betiq-800 bg-betiq-900 py-3 pl-8 pr-4 text-sm text-betiq-100 placeholder-betiq-500 outline-none transition-colors focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>
              </div>

              {/* Probability */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-betiq-400">
                  Your Projected Probability (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 55"
                    value={prob}
                    onChange={(e) => setProb(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full rounded-lg border border-betiq-800 bg-betiq-900 py-3 px-4 pr-8 text-sm text-betiq-100 placeholder-betiq-500 outline-none transition-colors focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-betiq-500">%</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={calculate}
                className="btn-gold flex-1 justify-center"
              >
                Calculate EV
              </button>
              <button
                type="button"
                onClick={reset}
                className="btn-ghost"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Reset
              </button>
            </div>
          </div>

          {/* Quick reference */}
          <div className="card-betiq">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-betiq-500">
              Common Odds Reference
            </h3>
            <div className="space-y-1.5">
              {[
                { odds: "-200", prob: "66.7%" },
                { odds: "-150", prob: "60.0%" },
                { odds: "-110", prob: "52.4%" },
                { odds: "+100", prob: "50.0%" },
                { odds: "+150", prob: "40.0%" },
                { odds: "+200", prob: "33.3%" },
              ].map((ref) => (
                <button
                  key={ref.odds}
                  type="button"
                  onClick={() => setOdds(ref.odds)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-betiq-400 transition-colors hover:bg-betiq-800"
                >
                  <span className="font-medium text-betiq-300">{ref.odds}</span>
                  <span>Implied: {ref.prob}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results - 3 cols */}
        <div className="space-y-4 lg:col-span-3">
          {result ? (
            <>
              {/* Main result */}
              <div className={`card-betiq border ${result.isPositive ? "border-green-500/30 ring-1 ring-green-500/20" : "border-red-500/30 ring-1 ring-red-500/20"}`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    result.isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      {result.isPositive ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                      )}
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-betiq-50">
                      {result.isPositive ? "+EV Bet" : "-EV Bet — Avoid"}
                    </p>
                    <p className="text-xs text-betiq-400">
                      {result.isPositive
                        ? "The math is in your favor"
                        : "The odds don't justify this bet"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Results grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { label: "Expected Value", value: `${result.isPositive ? "+" : ""}$${result.expectedValue.toFixed(2)}`, sub: `${result.isPositive ? "+" : ""}${result.evPercent.toFixed(1)}%`, color: result.isPositive ? "text-green-400" : "text-red-400" },
                  { label: "Implied Probability", value: `${result.impliedProb.toFixed(1)}%`, sub: "from odds", color: "text-betiq-100" },
                  { label: "Your Edge", value: `${result.edge > 0 ? "+" : ""}${result.edge.toFixed(1)}%`, sub: result.edge > 0 ? "You have an edge" : "No edge", color: result.edge > 0 ? "text-green-400" : "text-red-400" },
                  { label: "Kelly Stake", value: `${result.kellyStake.toFixed(1)}%`, sub: "of bankroll", color: "text-betiq-100" },
                  { label: "Fair Odds", value: `${((1 / (result.impliedProb / 100)) - 1) > 0 ? "+" : ""}${((1 / (result.impliedProb / 100)) - 1).toFixed(0)}`, sub: "break-even line", color: "text-betiq-100" },
                  { label: "Vig", value: `${(result.impliedProb - (1 / ((result.impliedProb / 100) > 0 ? ((1 / (result.impliedProb / 100))) : 1)) * 100).toFixed(1)}%`, sub: "market juice", color: "text-betiq-100" },
                ].map((item) => (
                  <div key={item.label} className="card-betiq text-center">
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-betiq-500">{item.label}</p>
                    {item.sub && <p className="mt-0.5 text-[10px] text-betiq-600">{item.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div className="card-betiq">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-betiq-500">Interpretation</h3>
                <p className="text-xs leading-relaxed text-betiq-400">
                  {result.isPositive
                    ? `This bet has a positive expected value. For every $100 you wager at these odds, you can expect to make $${result.expectedValue.toFixed(2)} in profit over the long run. The Kelly Criterion suggests betting ${result.kellyStake.toFixed(1)}% of your bankroll.`
                    : `This bet has a negative expected value. For every $100 you wager, you can expect to lose $${Math.abs(result.expectedValue).toFixed(2)} over the long run. Consider passing or waiting for better odds.`
                  }
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-betiq-900 text-betiq-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-betiq-300">Enter odds and probability</h3>
                <p className="mt-2 text-sm text-betiq-500">
                  Fill in the inputs to calculate expected value, edge, and optimal stake
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}