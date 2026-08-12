import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

interface SettleInput {
  analysisId: string;
  actualStat: number;
  outcome: "win" | "loss" | "push";
}

/**
 * POST /api/analytics/settle — Settle a prediction with real-world results.
 *
 * Body:
 *   - analysisId: the ai_analyses.id to settle
 *   - actualStat: the actual recorded stat value for the prop (e.g. 28 for LeBron points)
 *   - outcome: "win" | "loss" | "push" — the bet outcome
 *
 * Auto-calculates:
 *   - was_correct: whether the prediction (lean_over/lean_under) matched the actual outcome
 *   - Updates ai_analyses.result, actual_stat, outcome, settled_at
 *   - Creates a prediction_outcomes record for accuracy tracking
 */
export const settlePrediction = createServerFn({ method: "POST" })
  .validator((data: SettleInput) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const userId = auth.userId!;
    const client = sql();

    // Fetch the analysis
    const analyses = await client`
      SELECT * FROM ai_analyses 
      WHERE id = ${data.analysisId} AND user_id = ${userId}
    `;
    if (analyses.length === 0) {
      throw new Error("Analysis not found or not owned by this user");
    }

    const analysis = analyses[0];
    const recommendation = analysis.recommendation as string;
    const propLine = parseFloat(String(analysis.prop_line ?? "0"));
    const actualStat = data.actualStat;
    const outcome = data.outcome;

    // Determine if the prediction was correct
    // - If recommendation is "lean_over" and actualStat > propLine → correct
    // - If recommendation is "lean_under" and actualStat < propLine → correct
    // - If recommendation is "no_bet" → skipped (not a prediction)
    // - If actualStat === propLine exactly → push
    let wasCorrect: boolean | null = null;
    let predictedOutcome: string = "";

    if (recommendation === "lean_over") {
      predictedOutcome = "over";
      wasCorrect = actualStat > propLine;
    } else if (recommendation === "lean_under") {
      predictedOutcome = "under";
      wasCorrect = actualStat < propLine;
    } else if (recommendation === "no_bet") {
      predictedOutcome = "no_bet";
      wasCorrect = null; // No prediction was made
    }

    // If propLine and actualStat match exactly, it's a push
    if (Math.abs(actualStat - propLine) < 0.001) {
      wasCorrect = null; // push — neither correct nor incorrect
    }

    // Map outcome to result
    let result: string;
    if (outcome === "win") result = "correct";
    else if (outcome === "loss") result = "incorrect";
    else result = "pending";

    // Determine confidence tier
    const confidenceScore = parseFloat(String(analysis.confidence_score ?? "0"));
    let confidenceTier: string;
    if (confidenceScore >= 80) confidenceTier = "high";
    else if (confidenceScore >= 60) confidenceTier = "medium";
    else confidenceTier = "low";

    // Update the analysis record (ownership-enforced)
    await client`
      UPDATE ai_analyses 
      SET 
        actual_stat = ${actualStat},
        outcome = ${outcome},
        result = ${result},
        settled_at = NOW(),
        confidence_tier = ${confidenceTier}
      WHERE id = ${data.analysisId} AND user_id = ${userId}
    `;

    // Create prediction_outcomes record
    await client`
      INSERT INTO prediction_outcomes (
        analysis_id, user_id, predicted_outcome, actual_outcome,
        predicted_stat, actual_stat, was_correct, settled_at
      ) VALUES (
        ${data.analysisId}, ${userId}, ${predictedOutcome},
        ${outcome}, ${analysis.projected_stat ?? null}, ${actualStat},
        ${wasCorrect}, NOW()
      )
    `;

    return {
      analysisId: data.analysisId,
      predictedOutcome,
      actualOutcome: outcome,
      recommended: recommendation,
      propLine,
      actualStat,
      wasCorrect,
      result,
      confidenceTier,
      settledAt: new Date().toISOString(),
    };
  });
