/**
 * BetIQ — LivePropsValidator (WS1b §5, §6, §8)
 *
 * The MANDATORY production gate for live props. Input must be a
 * ResolvedProviderProp (provider-validated + canonically resolved). Every
 * rejection below is hard: no silent correction, no coercion, no defaults.
 *
 * Freshness boundary is exact: prop age = `now - retrievalTimestamp`. At
 * exactly 60,000ms the prop is accepted (the defined boundary); at 60,001ms
 * it is rejected as stale; future timestamps are rejected with zero tolerance.
 *
 * Issuance (AnalysisEligibleProp) is a RUNTIME capability: the issuing
 * WeakSet is module-private and only `LivePropsValidator.validate` can add to
 * it. No other code — not TS casts, not JSON, not spreads, not forged flags,
 * not symbols — can produce an AnalysisEligibleProp. EVEngine verifies
 * membership via `verifyAnalysisEligible` before executing.
 */

import { DataState } from "./datastate";
import type { PropOutcome, ResolvedProviderProp } from "./types";

/** Exact freshness boundary: 60,000ms. age === 60,000 → accepted; 60,001 → stale. */
export const FRESHNESS_BOUNDARY_MS = 60_000 as const;

export type ValidationReason =
  | "missing_provider"
  | "missing_provider_event_id"
  | "missing_canonical_event_id"
  | "missing_provider_player_id"
  | "missing_canonical_player_id"
  | "unknown_stat_type"
  | "unknown_market"
  | "invalid_period"
  | "missing_timestamp"
  | "invalid_timestamp"
  | "future_timestamp"
  | "stale_timestamp"
  | "non_finite_line"
  | "invalid_line"
  | "missing_odds"
  | "non_finite_odds"
  | "invalid_american_odds"
  | "missing_over"
  | "missing_under"
  | "duplicate_over"
  | "duplicate_under"
  | "wrong_outcome_count"
  | "mismatched_lines"
  | "mismatched_player_identity"
  | "mismatched_event_identity"
  | "mismatched_stat_type"
  | "mismatched_market_identity";

// ---------------------------------------------------------------------------
// Market/stat/period registry (WS1b §5: unknown stat type / unknown market /
// invalid period must be rejected). Extend per supported market & sport.
// ---------------------------------------------------------------------------
export interface MarketRule {
  market: string;
  statTypes: readonly string[];
  periods: readonly string[];
  /** Whether a line of exactly 0 is acceptable for this market (default false). */
  allowZeroLine?: boolean;
}

export const MARKET_RULES: readonly MarketRule[] = [
  { market: "player_points", statTypes: ["points"], periods: ["game", "regulation"] },
  { market: "player_assists", statTypes: ["assists"], periods: ["game"] },
  { market: "player_rebounds", statTypes: ["rebounds"], periods: ["game"] },
  { market: "player_pass_yds", statTypes: ["passing_yards"], periods: ["game"] },
  { market: "player_pass_td", statTypes: ["passing_touchdowns"], periods: ["game"] },
  { market: "player_rush_yds", statTypes: ["rushing_yards"], periods: ["game"] },
  { market: "player_recv_yds", statTypes: ["receiving_yards"], periods: ["game"] },
  { market: "player_home_runs", statTypes: ["home_runs"], periods: ["game"] },
  { market: "player_total_bases", statTypes: ["total_bases"], periods: ["game"] },
  { market: "player_strokes", statTypes: ["strokes"], periods: ["round", "tournament"] },
  { market: "player_birdies", statTypes: ["birdies"], periods: ["round", "tournament"] },
  { market: "player_bogeys", statTypes: ["bogeys"], periods: ["round", "tournament"] },
  { market: "player_fairways_hit", statTypes: ["fairways_hit"], periods: ["round"] },
  { market: "player_gir", statTypes: ["greens_in_regulation"], periods: ["round"] },
  { market: "fighter_win_method", statTypes: ["win_method"], periods: ["match"] },
  { market: "fighter_round_total", statTypes: ["round_total"], periods: ["match"] },
  { market: "player_win_total_sets", statTypes: ["total_sets"], periods: ["match"] },
];

export function marketRuleFor(market: string): MarketRule | undefined {
  return MARKET_RULES.find((r) => r.market === market);
}

/**
 * Deterministic market identity (WS1b §8: must include
 * provider/event/player/stat/period information).
 */
export function marketIdentity(
  provider: string,
  providerEventId: string,
  providerPlayerId: string,
  market: string,
  period: string,
): string {
  return [provider, providerEventId, providerPlayerId, market, period].join("|");
}

// ---------------------------------------------------------------------------
// Runtime analysis-eligibility capability — module-private WeakSet.
// NOTE: `analysisEligibleRegistry` is module-private by design. The ONLY code
// that can add to it is `validate()` in this module. There is no exported
// `issue`/`add` — the capability boundary is the module itself.
// ---------------------------------------------------------------------------
const analysisEligibleRegistry = new WeakSet<object>();

/**
 * AnalysisEligibleProp — a market whose line/odds/identity/freshness have all
 * passed LivePropsValidator. The ONLY way an object can satisfy
 * `verifyAnalysisEligible` is to be added to the module-private WeakSet by
 * this validator. There is no public constructor, no flag, no cast path.
 */
export class AnalysisEligibleProp {
  readonly marketId: string;
  /** @internal — created exclusively by validate(); never construct elsewhere. */
  constructor(readonly raw: Readonly<ResolvedProviderProp>, marketId: string) {
    this.marketId = marketId;
    Object.freeze(this);
  }

  get state(): "AVAILABLE" {
    // Issuance only ever happens for fresh, provider-verified data.
    return "AVAILABLE";
  }
}

/** Runtime authorization check — used by EVEngine and persistence. */
export function verifyAnalysisEligible(value: unknown): value is AnalysisEligibleProp {
  return value instanceof AnalysisEligibleProp && analysisEligibleRegistry.has(value);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export type ValidationOk = { ok: true; prop: AnalysisEligibleProp; state: "AVAILABLE" };
export type ValidationFail = { ok: false; reasons: ValidationReason[]; state: "EMPTY" | "TEMPORARILY_UNAVAILABLE" };

export interface ValidateInput {
  prop: ResolvedProviderProp;
  /** Clock override for tests; defaults to Date.now(). */
  now?: number;
}

function checkAmericanOdds(odds: number): ValidationReason[] {
  const out: ValidationReason[] = [];
  if (odds === undefined || odds === null) out.push("missing_odds");
  else if (!Number.isFinite(odds)) out.push("non_finite_odds");
  else if (odds === 0 || Math.abs(odds) < 100) out.push("invalid_american_odds");
  return out;
}

function checkLine(line: number, allowZero: boolean): ValidationReason[] {
  const out: ValidationReason[] = [];
  if (line === undefined || line === null) out.push("invalid_line");
  else if (!Number.isFinite(line)) out.push("non_finite_line");
  else if (line <= 0 && !(allowZero && line === 0)) out.push("invalid_line");
  return out;
}

function checkOutcome(line: number, allowZero: boolean, odds: number): ValidationReason[] {
  return [...checkLine(line, allowZero), ...checkAmericanOdds(odds)];
}

/**
 * WS1b §5 / §8 gate. Returns an issued AnalysisEligibleProp when every check
 * passes; otherwise a fail result with the exact reasons (never a coerced
 * "AVAILABLE"). Malformed inputs are rejected, never defaulted.
 */
export function validateLiveProp(input: ValidateInput): ValidationOk | ValidationFail {
  const { prop, now = Date.now() } = input;
  const reasons: ValidationReason[] = [];

  // --- provenance presence ---
  if (!prop.provider || prop.provider.trim() === "") reasons.push("missing_provider");
  if (!prop.providerEventId || prop.providerEventId.trim() === "") reasons.push("missing_provider_event_id");
  if (!prop.canonicalEventId || prop.canonicalEventId.trim() === "") reasons.push("missing_canonical_event_id");
  if (!prop.providerPlayerId || prop.providerPlayerId.trim() === "") reasons.push("missing_provider_player_id");
  if (!prop.canonicalPlayerId || prop.canonicalPlayerId.trim() === "") reasons.push("missing_canonical_player_id");

  // --- market / stat type / period ---
  const rule = marketRuleFor(prop.market);
  if (!rule) {
    reasons.push("unknown_market");
  } else {
    if (!rule.statTypes.includes(prop.statType)) reasons.push("unknown_stat_type");
    if (!rule.periods.includes(prop.period)) reasons.push("invalid_period");
  }

  // --- timestamp: exact 60,000ms boundary ---
  if (!prop.retrievalTimestamp) {
    reasons.push("missing_timestamp");
  } else {
    const ts = Date.parse(prop.retrievalTimestamp);
    if (Number.isNaN(ts)) {
      reasons.push("invalid_timestamp");
    } else {
      const ageMs = now - ts;
      if (ageMs < 0) {
        reasons.push("future_timestamp");
      } else if (ageMs > FRESHNESS_BOUNDARY_MS) {
        // 60,001ms and beyond → stale. Exactly 60,000ms is the boundary → fresh.
        reasons.push("stale_timestamp");
      }
    }
  }

  // --- outcomes: exactly one over, one under, parity ---
  const outcomeList = Array.isArray(prop.outcomes) ? prop.outcomes : [];
  const overs: PropOutcome[] = [];
  const unders: PropOutcome[] = [];
  for (const o of outcomeList) {
    if (o && o.side === "over") overs.push(o);
    else if (o && o.side === "under") unders.push(o);
  }
  if (overs.length === 0) reasons.push("missing_over");
  else if (overs.length > 1) reasons.push("duplicate_over");
  if (unders.length === 0) reasons.push("missing_under");
  else if (unders.length > 1) reasons.push("duplicate_under");
  if (outcomeList.length !== 2) reasons.push("wrong_outcome_count");

  const allowZero = rule?.allowZeroLine === true;
  for (const o of outcomeList) {
    reasons.push(...checkOutcome(o.line, allowZero, o.odds));
  }
  if (overs.length === 1 && unders.length === 1) {
    if (overs[0].line !== unders[0].line) reasons.push("mismatched_lines");
  }

  if (reasons.length > 0) {
    return { ok: false, reasons: Array.from(new Set(reasons)), state: "EMPTY" };
  }

  const market = marketIdentity(prop.provider, prop.providerEventId, prop.providerPlayerId, prop.market, prop.period);
  const eligible = new AnalysisEligibleProp(prop, market);
  analysisEligibleRegistry.add(eligible); // the ONLY `.add` in the codebase
  return { ok: true, prop: eligible, state: "AVAILABLE" };
}

/** Convenience: throw-form for callers that want exceptions, not result objects. */
export function validateOrThrow(input: ValidateInput): AnalysisEligibleProp {
  const r = validateLiveProp(input);
  if (!r.ok) {
    const err = new Error(`LivePropsValidator rejected: ${r.reasons.join("; ")}`);
    err.name = "LivePropsValidationError";
    throw err;
  }
  return r.prop;
}