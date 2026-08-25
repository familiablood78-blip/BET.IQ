/**
 * BetIQ — Server-authoritative settlement derivation (WS1b §10).
 *
 * Pure logic, exported for the adversarial test suite. The client can never
 * decide won/lost/pushed: the stored outcome/result/actual_outcome/was_correct
 * are derived exclusively from the authoritative comparison of the recorded
 * actualStat against the stored prop line and the stored recommendation.
 *
 *   lean_over : actualStat >  propLine ⇒ win     actualStat < propLine ⇒ loss
 *   lean_under: actualStat <  propLine ⇒ win     actualStat > propLine ⇒ loss
 *   |actualStat − propLine| < 0.001              ⇒ push (neither win nor loss)
 *   no_bet / unknown recommendation              ⇒ settlement refused (pending)
 */
export interface DerivedSettlement {
  predictedOutcome: "over" | "under" | "no_bet";
  outcome: "win" | "loss" | "push";
  result: "correct" | "incorrect" | "pending";
  wasCorrect: boolean | null;
}

export function deriveSettlement(input: {
  recommendation: string;
  actualStat: number;
  propLine: number;
}): DerivedSettlement {
  const { recommendation, actualStat, propLine } = input;

  if (!Number.isFinite(actualStat) || !Number.isFinite(propLine)) {
    return { predictedOutcome: "no_bet", outcome: "push", wasCorrect: null, result: "pending" };
  }

  const isPush = Math.abs(actualStat - propLine) < 0.001;

  if (recommendation === "lean_over") {
    if (isPush) return { predictedOutcome: "over", outcome: "push", wasCorrect: null, result: "pending" };
    const win = actualStat > propLine;
    return {
      predictedOutcome: "over",
      outcome: win ? "win" : "loss",
      wasCorrect: win,
      result: win ? "correct" : "incorrect",
    };
  }
  if (recommendation === "lean_under") {
    if (isPush) return { predictedOutcome: "under", outcome: "push", wasCorrect: null, result: "pending" };
    const win = actualStat < propLine;
    return {
      predictedOutcome: "under",
      outcome: win ? "win" : "loss",
      wasCorrect: win,
      result: win ? "correct" : "incorrect",
    };
  }
  // no_bet / unknown recommendation — no prediction was made; settlement refused.
  return { predictedOutcome: "no_bet", outcome: "push", wasCorrect: null, result: "pending" };
}