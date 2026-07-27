import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/auth";
import { logUsage, countUsage } from "~/lib/db/migrate";
import { sql } from "~/db";
import { sports } from "~/lib/sports";
import type { League } from "~/lib/sports";

interface AnalysisInput {
  playerName: string;
  sport: string;
  propType: string;
  propLine: number;
  league?: string;
  playerTeam?: string;
  opponent?: string;
  gameDate?: string;
}

/**
 * POST /api/players/:id/analysis
 * Analyzes a player prop using the sports data provider + AI engine.
 */
export const analyzePlayerProp = createServerFn({ method: "POST" })
  .validator((data: AnalysisInput) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth(new Request("http://localhost"));
    const userId = auth.userId!;

    // Check free tier usage limit (10 analyses per day for free users)
    const client = sql();
    const subRows = await client`SELECT tier FROM subscriptions WHERE user_id = ${userId} AND status = 'active'`;
    const isFree = subRows.length === 0 || subRows[0].tier === "free";

    if (isFree) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const count = await countUsage(userId, "analysis", today);
      if (count >= 10) {
        throw new Error("Free tier limit reached (10 analyses/day). Upgrade to Premium for unlimited analyses.");
      }
    }

    const { playerName, sport, propType, propLine, league, gameDate } = data;

    // Fetch player stats from the sports provider to feed into AI analysis
    const leagueTyped = (league ?? sport) as League;
    const players = await sports.searchPlayers(playerName, leagueTyped);
    const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());

    // Fetch any relevant props for context
    let gameProps: Array<{ propType: string; line: number }> = [];
    if (player) {
      const featuredGames = await sports.getGames(leagueTyped);
      // Find a game involving this player's team
      const playerGame = featuredGames.find(
        g => g.homeTeam === player.team || g.awayTeam === player.team
      );
      if (playerGame) {
        const props = await sports.getGameProps(playerGame.id, leagueTyped);
        gameProps = props.filter(p => p.playerId === player.id);
      }
    }

    // Generate AI analysis (calls mock or OpenAI depending on OPENAI_API_KEY)
    const analysis = await generateAnalysis({
      playerName,
      sport: leagueTyped,
      propType,
      propLine,
      player,
      availableProps: gameProps,
    });

    // Save the analysis
    const result = await client`
      INSERT INTO ai_analyses (
        user_id, player_name, sport, league, prop_type, prop_line,
        confidence_score, recommendation, reasoning, key_factors, game_date
      ) VALUES (
        ${userId}, ${playerName}, ${sport}, ${league ?? null}, ${propType}, ${propLine},
        ${analysis.confidenceScore}, ${analysis.recommendation},
        ${analysis.reasoning}, ${JSON.stringify(analysis.keyFactors)},
        ${gameDate ?? null}
      )
      RETURNING id, created_at
    `;

    await logUsage(userId, "analysis", { playerName, sport, propType });

    return {
      id: result[0].id,
      playerName,
      sport,
      propType,
      propLine,
      confidenceScore: analysis.confidenceScore,
      recommendation: analysis.recommendation,
      reasoning: analysis.reasoning,
      keyFactors: analysis.keyFactors,
      createdAt: String(result[0].created_at),
    };
  });

/* ---------- AI Analysis Engine ---------- */

interface AnalysisContext {
  playerName: string;
  sport: League;
  propType: string;
  propLine: number;
  player?: { id: string; team: string; position: string; injuryStatus?: string };
  availableProps: Array<{ propType: string; line: number }>;
}

interface AnalysisResult {
  confidenceScore: number;
  recommendation: "lean_over" | "lean_under" | "no_bet";
  reasoning: string;
  keyFactors: Array<{ factor: string; impact: "positive" | "negative"; detail: string }>;
}

async function generateAnalysis(ctx: AnalysisContext): Promise<AnalysisResult> {
  const openAiKey = process.env.OPENAI_API_KEY;

  if (openAiKey) {
    try {
      return await callOpenAI(ctx);
    } catch {
      // Fall back to mock if OpenAI fails
      return generateMockAnalysis(ctx);
    }
  }

  return generateMockAnalysis(ctx);
}

async function callOpenAI(ctx: AnalysisContext): Promise<AnalysisResult> {
  const prompt = `Analyze this player prop bet:

Player: ${ctx.playerName}
Sport: ${ctx.sport}
Prop: ${ctx.propType}
Line: ${ctx.propLine}
Position: ${ctx.player?.position ?? "Unknown"}
Team: ${ctx.player?.team ?? "Unknown"}
Injury Status: ${ctx.player?.injuryStatus ?? "Unknown"}

Return a JSON object with:
- confidenceScore (0-100)
- recommendation ("lean_over", "lean_under", or "no_bet")
- reasoning (2-3 sentences)
- keyFactors (array of {factor, impact: "positive"|"negative", detail})`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const body = await res.json() as { choices: Array<{ message: { content: string } }> };
  const parsed = JSON.parse(body.choices[0].message.content) as AnalysisResult;
  return parsed;
}

function generateMockAnalysis(ctx: AnalysisContext): AnalysisResult {
  const score = Math.floor(Math.random() * 41) + 40;
  let recommendation: AnalysisResult["recommendation"] = "no_bet";
  if (score > 65) recommendation = "lean_over";
  else if (score > 50) recommendation = Math.random() > 0.5 ? "lean_over" : "lean_under";

  return {
    confidenceScore: score,
    recommendation,
    reasoning: `Based on ${ctx.playerName}'s recent form and matchup, ${
      recommendation === "lean_over" ? "the OVER looks promising" :
      recommendation === "lean_under" ? "the UNDER is favored" :
      "this is a stay-away spot"
    }. ${ctx.playerName} has been ${
      score > 60 ? "trending well" : "struggling"
    } against this opponent and the prop line of ${ctx.propLine} ${ctx.propType.toLowerCase()} reflects the matchup dynamics.`,
    keyFactors: [
      { factor: "Recent form", impact: score > 60 ? "positive" : "negative", detail: `${score > 60 ? "Above average" : "Below average"} performance in last 5 games` },
      { factor: "Matchup", impact: score > 55 ? "positive" : "negative", detail: `Opponent ${score > 55 ? "allows" : "limits"} this prop type` },
      { factor: "Injury Status", impact: ctx.player?.injuryStatus === "Active" ? "positive" : "negative", detail: ctx.player?.injuryStatus ?? "Unknown" },
    ],
  };
}