import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/demo")({ component: DemoPage });

const STEPS = [
  { id: 1, label: "Analyzer", icon: "🔍" },
  { id: 2, label: "Prediction", icon: "📊" },
  { id: 3, label: "Tracking", icon: "📋" },
  { id: 4, label: "Dashboard", icon: "📈" },
] as const;

const DEMO_ANALYSIS = {
  playerName: "Josh Allen",
  team: "Buffalo Bills",
  sport: "NFL",
  propType: "Passing Yards",
  propLine: 265.5,
  betType: "over" as const,
  confidenceScore: 72,
  confidenceTier: "medium" as const,
  recommendation: "Lean Over",
  reasoning:
    "Allen averages 284 passing yards at home this season (8 games). The opponent allows 267 passing yards per game (ranked 24th). Weather forecast is clear with light wind — dome conditions. Allen has exceeded 265.5 in 6 of his last 8 starts.",
  keyFactors: [
    "Home game — Allen averages 284 YDS at home vs 251 on road",
    "Opponent pass defense ranks 24th (267 YDS/game allowed)",
    "Weather: 68°F, clear, 5mph wind — ideal passing conditions",
    "Allen has hit the over on passing yards in 6 of last 8 games",
  ],
  projectedStat: 278,
  ev: 12.4,
  impliedProbability: 52.4,
  edge: 9.8,
  kellyStake: 7.2,
};

const DEMO_PREDICTIONS = [
  {
    id: "demo-1",
    playerName: "Patrick Mahomes",
    prop: "Passing Yards O/U 280.5",
    recommendation: "Lean Over",
    confidence: 68,
    outcome: "win" as const,
    projected: 295,
    actual: 312,
  },
  {
    id: "demo-2",
    playerName: "Christian McCaffrey",
    prop: "Rushing Yards O/U 85.5",
    recommendation: "Lean Over",
    confidence: 81,
    outcome: "win" as const,
    projected: 98,
    actual: 114,
  },
  {
    id: "demo-3",
    playerName: "Justin Jefferson",
    prop: "Receiving Yards O/U 95.5",
    recommendation: "Lean Under",
    confidence: 64,
    outcome: "loss" as const,
    projected: 82,
    actual: 137,
  },
  {
    id: "demo-4",
    playerName: "Jalen Hurts",
    prop: "Rushing Yards O/U 45.5",
    recommendation: "Lean Over",
    confidence: 75,
    outcome: "win" as const,
    projected: 52,
    actual: 63,
  },
  {
    id: "demo-5",
    playerName: "Josh Allen",
    prop: "Passing Yards O/U 265.5",
    recommendation: "Lean Over",
    confidence: 72,
    outcome: "pending" as const,
    projected: 278,
    actual: null,
  },
];

function DemoPage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);

  const wins = DEMO_PREDICTIONS.filter((p) => p.outcome === "win").length;
  const settled = DEMO_PREDICTIONS.filter((p) => p.outcome !== "pending").length;
  const accuracy = settled > 0 ? Math.round((wins / settled) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Demo badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-betiq-50">Founder Demo</h1>
          <p className="text-sm text-betiq-400">3-minute walkthrough of the BetIQ experience</p>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
          DEMO MODE — Mock Data
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              step === s.id
                ? "bg-gold-500/20 text-gold-400 border border-gold-500/30"
                : "bg-betiq-900 text-betiq-400 border border-betiq-800 hover:bg-betiq-800"
            }`}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Analyzer */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card-betiq p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-betiq-100">{DEMO_ANALYSIS.playerName}</h3>
                <p className="text-sm text-betiq-400">{DEMO_ANALYSIS.team} · {DEMO_ANALYSIS.sport}</p>
              </div>
              <span className="badge-gold">{DEMO_ANALYSIS.propType}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-betiq-950 p-4">
              <div>
                <p className="text-xs text-betiq-500 uppercase">Line</p>
                <p className="text-xl font-bold text-betiq-100">O/U {DEMO_ANALYSIS.propLine}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-betiq-500 uppercase">BetIQ Score</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gold-400">{DEMO_ANALYSIS.confidenceScore}</span>
                  <span className="text-sm text-betiq-400">/100</span>
                </div>
              </div>
            </div>

            {/* Confidence gauge */}
            <div>
              <div className="flex justify-between text-xs text-betiq-500 mb-1">
                <span>Confidence</span>
                <span className={DEMO_ANALYSIS.confidenceTier === "high" ? "text-green-400" : DEMO_ANALYSIS.confidenceTier === "medium" ? "text-gold-400" : "text-red-400"}>
                  {DEMO_ANALYSIS.confidenceTier.toUpperCase()}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-betiq-800">
                <div
                  className={`h-2 rounded-full transition-all ${
                    DEMO_ANALYSIS.confidenceScore >= 80 ? "bg-green-500" : DEMO_ANALYSIS.confidenceScore >= 60 ? "bg-gold-500" : "bg-red-500"
                  }`}
                  style={{ width: `${DEMO_ANALYSIS.confidenceScore}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-gold-500/10 border border-gold-500/20 p-4">
              <p className="text-sm font-semibold text-gold-400 mb-1">
                Recommendation: {DEMO_ANALYSIS.recommendation}
              </p>
              <p className="text-sm text-betiq-300">{DEMO_ANALYSIS.reasoning}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-betiq-500 uppercase mb-2">Key Factors</p>
              <ul className="space-y-1.5">
                {DEMO_ANALYSIS.keyFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-betiq-300">
                    <span className="mt-0.5 text-gold-400">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-betiq-950 p-3 text-center">
                <p className="text-xs text-betiq-500">Projected</p>
                <p className="text-lg font-bold text-betiq-100">{DEMO_ANALYSIS.projectedStat}</p>
              </div>
              <div className="rounded-lg bg-betiq-950 p-3 text-center">
                <p className="text-xs text-betiq-500">EV</p>
                <p className="text-lg font-bold text-green-400">+{DEMO_ANALYSIS.ev}%</p>
              </div>
              <div className="rounded-lg bg-betiq-950 p-3 text-center">
                <p className="text-xs text-betiq-500">Edge</p>
                <p className="text-lg font-bold text-betiq-100">{DEMO_ANALYSIS.edge}%</p>
              </div>
              <div className="rounded-lg bg-betiq-950 p-3 text-center">
                <p className="text-xs text-betiq-500">Kelly</p>
                <p className="text-lg font-bold text-betiq-100">{DEMO_ANALYSIS.kellyStake}%</p>
              </div>
            </div>

            <button
              onClick={() => { setSaved(true); setTimeout(() => setStep(2), 800); }}
              disabled={saved}
              className="btn-gold w-full disabled:opacity-50"
            >
              {saved ? "✓ Prediction Saved!" : "Save This Prediction"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Prediction */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card-betiq p-6 space-y-4">
            <h3 className="text-lg font-semibold text-betiq-100">Your Saved Prediction</h3>
            {saved ? (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                <p className="text-sm text-green-400 font-medium">✓ Prediction saved to your tracker</p>
                <p className="text-xs text-betiq-400 mt-1">
                  {DEMO_ANALYSIS.playerName} · {DEMO_ANALYSIS.propType} · Over {DEMO_ANALYSIS.propLine} · Score: {DEMO_ANALYSIS.confidenceScore}/100
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-betiq-950 p-4 text-center">
                <p className="text-sm text-betiq-400">Go back to Step 1 and save a prediction first</p>
                <button onClick={() => setStep(1)} className="btn-outline mt-2 text-sm">Back to Analyzer</button>
              </div>
            )}
            <p className="text-sm text-betiq-400">
              Every prediction is timestamped and tracked. After the game, BetIQ compares the prediction against the actual result.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Tracking */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card-betiq p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-betiq-100">Your Prediction History</h3>
              <span className="badge-gold">{DEMO_PREDICTIONS.length} tracked</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-betiq-800 text-left text-xs text-betiq-500 uppercase">
                    <th className="pb-2 pr-4">Player</th>
                    <th className="pb-2 pr-4">Prop</th>
                    <th className="pb-2 pr-4">Pick</th>
                    <th className="pb-2 pr-4">Projected</th>
                    <th className="pb-2 pr-4">Actual</th>
                    <th className="pb-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_PREDICTIONS.map((p) => (
                    <tr key={p.id} className="border-b border-betiq-800/50">
                      <td className="py-2 pr-4 text-betiq-200">{p.playerName}</td>
                      <td className="py-2 pr-4 text-betiq-400 text-xs">{p.prop}</td>
                      <td className="py-2 pr-4">
                        <span className="text-xs text-gold-400">{p.recommendation}</span>
                      </td>
                      <td className="py-2 pr-4 text-betiq-300">{p.projected}</td>
                      <td className="py-2 pr-4 text-betiq-300">{p.actual ?? "—"}</td>
                      <td className="py-2">
                        {p.outcome === "win" && <span className="text-xs text-green-400 font-semibold">WIN ✓</span>}
                        {p.outcome === "loss" && <span className="text-xs text-red-400 font-semibold">LOSS ✗</span>}
                        {p.outcome === "pending" && <span className="text-xs text-betiq-500">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Dashboard */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="card-betiq p-6 space-y-4">
            <h3 className="text-lg font-semibold text-betiq-100">Your Accuracy Dashboard</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-betiq-950 p-4 text-center">
                <p className="text-2xl font-bold text-betiq-100">{DEMO_PREDICTIONS.length}</p>
                <p className="text-xs text-betiq-500 mt-1">Predictions Tracked</p>
              </div>
              <div className="rounded-lg bg-betiq-950 p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{accuracy}%</p>
                <p className="text-xs text-betiq-500 mt-1">Accuracy</p>
              </div>
              <div className="rounded-lg bg-betiq-950 p-4 text-center">
                <p className="text-2xl font-bold text-betiq-100">73</p>
                <p className="text-xs text-betiq-500 mt-1">Avg Confidence</p>
              </div>
              <div className="rounded-lg bg-betiq-950 p-4 text-center">
                <p className="text-2xl font-bold text-gold-400">NFL</p>
                <p className="text-xs text-betiq-500 mt-1">Best Sport</p>
              </div>
            </div>
            <p className="text-sm text-betiq-400 mt-4">
              After 500+ tracked predictions, you have real proof: <span className="text-betiq-200">"Here is exactly how BetIQ performed."</span> This is your marketing.
            </p>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-4">
        <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="btn-ghost text-sm disabled:opacity-30">
          ← Previous
        </button>
        <span className="text-xs text-betiq-500">Step {step} of 4</span>
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} className="btn-gold text-sm">
            Next →
          </button>
        ) : (
          <Link to="/" className="btn-outline text-sm">
            Try It Yourself →
          </Link>
        )}
      </div>
    </div>
  );
}
