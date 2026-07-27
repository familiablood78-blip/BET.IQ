/**
 * BetIQ AI Analysis Engine
 *
 * Uses OpenAI (when OPENAI_API_KEY is set) or fallback mock analysis.
 * Works with the sports data provider types from ~/lib/sports/types.ts
 */
import type { Player, PlayerStats, GameLogEntry, League } from "../sports/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  playerName: string;
  playerId: string;
  sport: string;
  propType: string;
  propLine: number;
  confidenceScore: number;
  recommendation: "lean_over" | "lean_under" | "no_bet";
  reasoning: string;
  keyFactors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; detail: string }>;
  projectedStat?: number;
  modelVersion: string;
}

export interface EVResult {
  odds: number;
  probability: number;
  impliedProbability: number;
  ev: number;
  edge: number;
  /** Kelly Criterion — recommended fraction (0-100) of bankroll to stake */
  kellyStake: number;
}

export interface ParlayRecommendation {
  legs: Array<{
    playerName: string;
    propType: string;
    line: number;
    side: "over" | "under";
    odds: number;
    confidence: number;
  }>;
  combinedOdds: number;
  combinedProbability: number;
  ev: number;
  risk: "low" | "medium" | "high";
  explanation: string;
}

// ─── Mock Analysis ───────────────────────────────────────────────────────────

function mockAnalysis(
  player: Player,
  propType: string,
  propLine: number,
  stats?: PlayerStats | null,
): AnalysisResult {
  const recentGames = stats?.recentGames || [];
  const statValues = recentGames.map((g: GameLogEntry) => {
    const key = propTypeToStatKey(propType);
    return g.stats[key] || 0;
  });

  const avgRecent = statValues.length > 0
    ? statValues.reduce((a: number, b: number) => a + b, 0) / statValues.length
    : propLine;

  const diff = avgRecent - propLine;
  const absDiff = Math.abs(diff);

  let confidenceScore: number;
  let recommendation: "lean_over" | "lean_under" | "no_bet";
  let reasoning: string;

  if (absDiff > 5) {
    confidenceScore = Math.min(85, Math.floor(65 + absDiff * 2));
    recommendation = diff > 0 ? "lean_over" : "lean_under";
    reasoning = `${player.name} has been ${diff > 0 ? "exceeding" : "falling short of"} this line, averaging ${avgRecent.toFixed(1)} over the last ${recentGames.length} games.`;
  } else if (absDiff > 2) {
    confidenceScore = Math.min(72, Math.floor(55 + Math.random() * 10));
    recommendation = diff > 0 ? "lean_over" : "lean_under";
    reasoning = `${player.name} shows a slight ${diff > 0 ? "upward" : "downward"} trend. Recent form suggests a ${diff > 0 ? "lean toward the over" : "lean toward the under"}.`;
  } else {
    confidenceScore = Math.floor(Math.random() * 20) + 35;
    recommendation = "no_bet";
    reasoning = `This is a stay-away spot. ${player.name}'s recent numbers are too close to the line for a confident edge.`;
  }

  return {
    playerName: player.name,
    playerId: player.id,
    sport: player.sport,
    propType,
    propLine,
    confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
    recommendation,
    reasoning,
    projectedStat: Math.max(0, avgRecent + (Math.random() - 0.5) * 4),
    keyFactors: [
      { factor: "Recent Form", impact: diff > 2 ? "positive" : diff < -2 ? "negative" : "neutral", detail: `${recommendation === "lean_over" ? "Above" : "Below"} average in last ${recentGames.length} games (${avgRecent.toFixed(1)})` },
      { factor: "Matchup", impact: Math.random() > 0.45 ? "positive" : "negative", detail: "Opponent matchup analysis for this prop" },
      { factor: "Venue", impact: Math.random() > 0.5 ? "positive" : "negative", detail: Math.random() > 0.5 ? "Home court advantage" : "Road game challenge" },
    ],
    modelVersion: "betiq-mock-v2",
  };
}

function propTypeToStatKey(propType: string): string {
  const lower = propType.toLowerCase();
  if (lower.includes("point") && !lower.includes("three") && !lower.includes("points_rebounds")) return "points";
  if (lower.includes("assist")) return "assists";
  if (lower.includes("rebound")) return "rebounds";
  if (lower.includes("three")) return "threePointers";
  if (lower.includes("pass")) return "passingYards";
  if (lower.includes("rush")) return "rushingYards";
  if (lower.includes("receiving") || lower.includes("receptions")) return "receivingYards";
  if (lower.includes("touchdown")) return "touchdowns";
  return "points";
}

// ─── OpenAI Analysis ─────────────────────────────────────────────────────────

async function openaiAnalysis(
  player: Player,
  propType: string,
  propLine: number,
  stats?: PlayerStats | null,
): Promise<AnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const recentGames = stats?.recentGames || [];
  const statsContext = recentGames.length > 0
    ? `Recent games:\n${recentGames.map((g: GameLogEntry) => `  ${g.date} vs ${g.opponent}: ${JSON.stringify(g.stats)}`).join("\n")}`
    : "No recent game data.";

  const prompt = `Analyze this ${player.sport} player prop:
Player: ${player.name} (${player.team})
Prop: ${propType}, Line: ${propLine}

${statsContext}

Return JSON: { confidence_score: 0-100, recommendation: "lean_over"|"lean_under"|"no_bet", reasoning: string, projected_stat: number, key_factors: [{factor, impact: "positive"|"negative"|"neutral", detail}] }
Only recommend if confidence > 55.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a data-driven sports betting analyst. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      playerName: player.name,
      playerId: player.id,
      sport: player.sport,
      propType,
      propLine,
      confidenceScore: Math.max(0, Math.min(100, parsed.confidence_score)),
      recommendation: parsed.recommendation || "no_bet",
      reasoning: parsed.reasoning || "Analysis complete.",
      projectedStat: parsed.projected_stat,
      keyFactors: parsed.key_factors || [],
      modelVersion: "openai-gpt-4o-mini",
    };
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generatePlayerAnalysis(
  player: Player,
  propType: string,
  propLine: number,
  stats?: PlayerStats | null,
): Promise<AnalysisResult> {
  const ai = await openaiAnalysis(player, propType, propLine, stats);
  return ai || mockAnalysis(player, propType, propLine, stats);
}

export function calculateEV(odds: number, probability: number): EVResult {
  let impliedProbability: number;
  if (odds > 0) {
    impliedProbability = 100 / (odds + 100) * 100;
  } else {
    impliedProbability = Math.abs(odds) / (Math.abs(odds) + 100) * 100;
  }

  const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
  const probDecimal = probability / 100;
  const ev = (probDecimal * decimalOdds) - 1;
  const edge = probDecimal - (impliedProbability / 100);

  // Kelly Criterion: f* = (bp - q) / b
  // where b = net fractional odds, p = prob of win, q = 1-p
  const b = decimalOdds - 1;
  const q = 1 - probDecimal;
  let kellyStake = b > 0 ? ((b * probDecimal - q) / b) * 100 : 0;
  // Cap Kelly at 25% of bankroll for safety (fractional Kelly)
  kellyStake = Math.max(0, Math.min(25, Math.round(kellyStake * 100) / 100));

  return {
    odds,
    probability,
    impliedProbability: Math.round(impliedProbability * 100) / 100,
    ev: Math.round(ev * 10000) / 10000,
    edge: Math.round(edge * 10000) / 10000,
    kellyStake,
  };
}

export function generateParlayRecommendations(
  bets: Array<{ playerName: string; propType: string; line: number; side: "over" | "under"; odds: number; confidence: number }>,
): ParlayRecommendation[] {
  const recs: ParlayRecommendation[] = [];
  if (bets.length < 2) return recs;

  for (let i = 0; i < Math.min(bets.length, 3); i++) {
    for (let j = i + 1; j < Math.min(bets.length, 4); j++) {
      const legs = [bets[i], bets[j]];
      const avgConfidence = (legs[0].confidence + legs[1].confidence) / 2;
      const decimalOdds = legs.map((b) => b.odds > 0 ? (b.odds / 100) + 1 : (100 / Math.abs(b.odds)) + 1);
      const combinedDecimal = decimalOdds[0] * decimalOdds[1];
      const combinedAmerican = combinedDecimal >= 2 ? Math.round((combinedDecimal - 1) * 100) : Math.round(-100 / (combinedDecimal - 1));
      const combinedProb = legs[0].confidence * legs[1].confidence / 10000;
      const ev = (combinedProb * combinedDecimal) - 1;

      recs.push({
        legs: legs.map((b) => ({ playerName: b.playerName, propType: b.propType, line: b.line, side: b.side, odds: b.odds, confidence: b.confidence })),
        combinedOdds: combinedAmerican,
        combinedProbability: Math.round(combinedProb * 10000) / 100,
        ev: Math.round(ev * 10000) / 10000,
        risk: avgConfidence > 70 ? "low" : avgConfidence > 55 ? "medium" : "high",
        explanation: `2-leg parlay: ${legs[0].playerName} ${legs[0].propType} (${legs[0].side}) + ${legs[1].playerName} ${legs[1].propType} (${legs[1].side}). Confidence: ${avgConfidence.toFixed(0)}%.`,
      });
    }
  }

  return recs.sort((a, b) => b.ev - a.ev);
}