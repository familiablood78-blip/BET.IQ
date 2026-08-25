/**
 * BetIQ — EVEngine (WS1b §7)
 *
 * The ONLY production location able to calculate EV for a prop. It accepts
 * nothing but a genuinely issued AnalysisEligibleProp (runtime-verified via
 * the module-private WeakSet in live-props-validator.ts) and a validated
 * fair probability. Everything the math consumes is finite and validated;
 * the produced EV is finite or the call throws. The single production call
 * site is the production analysis route (src/routes/api/players/-analysis.ts).
 *
 * Callers cannot bypass the validator by constructing an object that merely
 * has the expected TypeScript shape: `verifyAnalysisEligible` checks WeakSet
 * membership, which only LivePropsValidator can grant.
 */

import { DataState } from "./datastate";
import { verifyAnalysisEligible } from "./live-props-validator";

export class EvEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvEngineError";
  }
}

export interface EvResult {
  /** American odds of the evaluated side. */
  odds: number;
  /** Implied probability derived from American odds. */
  impliedProbability: number;
  /** User-supplied fair probability, 0 < p < 1. */
  fairProbability: number;
  /** Expected value per unit staked (decimal, e.g. 0.05 = +5% edge). */
  ev: number;
  side: "over" | "under";
  marketId: string;
}

const MIN_AMERICAN_ABS = 100 as const;

function americanToDecimal(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

function validateAmericanOdds(odds: unknown, where: string): number {
  if (typeof odds !== "number" || !Number.isFinite(odds)) {
    throw new EvEngineError(`invalid odds (${where}): ${String(odds)} — must be a finite number`);
  }
  if (odds === 0 || Math.abs(odds) < MIN_AMERICAN_ABS) {
    throw new EvEngineError(`invalid american odds (${where}): ${odds} — must be non-zero with |odds| >= 100`);
  }
  return odds;
}

/**
 * Calculate EV for ONE side of an issue AnalysisEligibleProp.
 *
 * Strict rejection list (WS1b §7): NaN/Infinity odds or line, invalid American
 * odds, probability outside (0,1), missing/invalid side, non-issued prop (raw
 * object, JSON.parse result, spread, TS cast, forged flag/symbol), and any
 * non-AVAILABLE state. Non-finite EV is rejected rather than returned.
 */
export function calculateEv(prop: unknown, probability: number, side: "over" | "under"): EvResult {
  // 1) Runtime authorization — the security boundary. Rejects every forged path.
  if (!verifyAnalysisEligible(prop)) {
    throw new EvEngineError(
      "refusing EV: prop is not a runtime-issued AnalysisEligibleProp (raw objects, JSON.parse results, spreads, casts, forged flags are never eligible)",
    );
  }

  // 2) State gate — issuance only ever happens for AVAILABLE, but re-assert
  //    so DEMO/UNVERIFIED/STALE_CACHED can never be re-piped into the engine.
  if (prop.state !== DataState.AVAILABLE && prop.state !== "AVAILABLE") {
    throw new EvEngineError(`prop state ${String(prop.state)} is not AVAILABLE — not EV-eligible`);
  }

  // 3) Fair probability must be a finite number in (0,1).
  if (typeof probability !== "number" || !Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new EvEngineError(`invalid probability ${String(probability)} — must be a finite number in (0,1)`);
  }

  // 4) Line must be finite and positive, and the market must have exactly two outcomes.
  const raw = prop.raw;
  if (!Array.isArray(raw.outcomes) || raw.outcomes.length !== 2) {
    throw new EvEngineError("invalid market — expected exactly two outcomes (over/under)");
  }
  for (const o of raw.outcomes) {
    if (typeof o.line !== "number" || !Number.isFinite(o.line) || o.line <= 0) {
      throw new EvEngineError("invalid line — must be a finite positive number on every outcome");
    }
  }

  // 5) Side must name a real outcome, and that outcome's odds must be valid.
  const outcome = raw.outcomes.find((o) => o.side === side);
  if (!outcome) {
    throw new EvEngineError(`invalid side ${String(side)} — market has no such outcome`);
  }
  const odds = validateAmericanOdds(outcome.odds, `side=${side}`);

  // 6) EV = fairProbability * decimalOdds - 1 (edge per unit staked).
  const decimal = americanToDecimal(odds);
  const ev = probability * decimal - 1;
  if (!Number.isFinite(ev)) {
    throw new EvEngineError("computed EV is not finite — refusing non-finite math output");
  }

  return {
    odds,
    impliedProbability: 1 / decimal,
    fairProbability: probability,
    ev,
    side,
    marketId: prop.marketId,
  };
}