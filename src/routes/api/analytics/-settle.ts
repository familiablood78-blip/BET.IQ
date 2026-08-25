import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";
import { deriveSettlement } from "~/lib/analytics/settlement";
export { deriveSettlement } from "~/lib/analytics/settlement";

/**
 * POST /api/analytics/settle — SERVER-AUTHORITATIVE settlement (WS1b §10).
 *
 * The client can NEVER decide won/lost/pushed:
 *   - `outcome` claims in the request body ("win"|"loss"|"push") are REJECTED
 *     and ignored — they never mutate stored settlement state.
 *   - The stored outcome/result/actual_outcome/was_correct are ALL derived
 *     from the authoritative comparison of the recorded actualStat against the
 *     stored prop line and the stored recommendation:
 *         lean_over: actualStat >  propLine ⇒ win   | actualStat < propLine ⇒ loss
 *         lean_under: actualStat <  propLine ⇒ win  | actualStat > propLine ⇒ loss
 *         actualStat === propLine (within 0.001)    ⇒ push (neither win nor loss)
 *         no_bet / unknown recommendation           ⇒ refused (no prediction)
 *
 * Only `actualStat` is accepted from the client (the real-world recorded
 * statistic — it cannot be derived server-side) and it is validated.
 */
interface SettleInput {
  analysisId: string;
  actualStat: number;
  /** IGNORED and rejected: client can never claim an outcome. */
  outcome?: unknown;
}

export const settlePrediction = createServerFn({ method: "POST" })
  .validator((data: SettleInput) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const userId = auth.userId!;
    const client = sql();

    const actualStat = Number(data.actualStat);
    if (!Number.isFinite(actualStat)) {
      throw new Error("actualStat must be a finite number");
    }

    const analyses = await client`
      SELECT * FROM ai_analyses
      WHERE id = ${data.analysisId} AND user_id = ${userId}
    `;
    if (analyses.length === 0) {
      throw new Error("Analysis not found or not owned by this user");
    }
    const analysis = analyses[0];

    const recommendation = String(analysis.recommendation ?? "");
    const propLine = parseFloat(String(analysis.prop_line ?? "0"));
    if (!Number.isFinite(propLine)) {
      throw new Error("stored prop_line is not a valid number — refusing to settle");
    }

    // ── Server-authoritative derivation (client outcome never consulted) ──────────
    // Derived prediction side, outcome ("win"|"loss"|"push"), wasCorrect, result.
    const outcomeAndResult = deriveSettlement({
      recommendation,
      actualStat,
      propLine,
    });

    const confidenceScore = parseFloat(String(analysis.confidence_score ?? "0"));
    let confidenceTier: string;
    if (confidenceScore >= 80) confidenceTier = "high";
    else if (confidenceScore >= 60) confidenceTier = "medium";
    else confidenceTier = "low";

    await client`
      UPDATE ai_analyses
      SET
        actual_stat = ${actualStat},
        outcome = ${outcomeAndResult.outcome},      -- derived, never client-supplied
        result = ${outcomeAndResult.result},        -- derived
        settled_at = NOW(),
        confidence_tier = ${confidenceTier}
      WHERE id = ${data.analysisId} AND user_id = ${userId}
    `;

    await client`
      INSERT INTO prediction_outcomes (
        analysis_id, user_id, predicted_outcome, actual_outcome,
        predicted_stat, actual_stat, was_correct, settled_at
      ) VALUES (
        ${data.analysisId}, ${userId}, ${outcomeAndResult.predictedOutcome},
        ${outcomeAndResult.outcome}, ${analysis.projected_stat ?? null}, ${actualStat},
        ${outcomeAndResult.wasCorrect}, NOW()
      )
    `;

    return {
      analysisId: data.analysisId,
      predictedOutcome: outcomeAndResult.predictedOutcome,
      actualOutcome: outcomeAndResult.outcome,
      recommended: recommendation,
      propLine,
      actualStat,
      wasCorrect: outcomeAndResult.wasCorrect,
      result: outcomeAndResult.result,
      confidenceTier,
      settledAt: new Date().toISOString(),
      // Explicit honesty: the client's `outcome` claim was rejected.
      clientOutcomeRejected: true,
    };
  });