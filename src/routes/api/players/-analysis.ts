import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/auth";
import { logUsage, countUsage } from "~/lib/db/migrate";
import { sql } from "~/db";
import {
  sportsData,
  type League,
  type RawProviderProp,
  type ResolvedProviderProp,
  resolveCanonicalPlayer,
  resolveCanonicalEvent,
  assertPlayerInEvent,
  EntityResolutionError,
  validateLiveProp,
  calculateEv,
  type AnalysisEligibleProp,
} from "~/lib/sports";

/**
 * POST /api/players/analysis — PRODUCTION analysis route (WS1b §9).
 *
 * The required production chain, physically, in order:
 *   HTTP request → validated provider request → provider response validation
 *   → canonical player/event resolution → LivePropsValidator →
 *   AnalysisEligibleProp issuance → EVEngine → response.
 *
 * Hard rules:
 *   - NEVER calls generateMockAnalysis; NO random confidence; NO fabricated
 *     projected statistics; nothing is persisted unless it originated from an
 *     issued AnalysisEligibleProp.
 *   - Client input is NOT trusted for player identity, event identity, line,
 *     odds, provider identity, stat value, probability, EV, or confidence.
 *     Those are all derived server-side from validated provider data.
 *   - Provider failure / unresolved identity / unvalidated prop ⇒ honest
 *     DataState — never AVAILABLE, never fabricated.
 *   - Exactly ONE production call path for calculateEv exists in this file
 *     (evForIssuedProp). A server-side fair-probability source does not exist
 *     yet, so no EV is ever invented.
 */

interface AnalysisInput {
  playerName: string;
  sport: string;
  /** Market hint (e.g. "player_points"). Not trusted — server selects from validated props. */
  market?: string;
}

type HonestAnalysisResponse =
  | {
      ok: true;
      state: "AVAILABLE";
      prop: IssuedPropView;
      ev: EvView | null;
      reason?: string;
    }
  | {
      ok: false;
      state: "DEMO" | "EMPTY" | "NOT_SUPPORTED" | "TEMPORARILY_UNAVAILABLE" | "UNVERIFIED" | "STALE_CACHED";
      reason: string;
    };

export interface IssuedPropView {
  provider: string;
  providerEventId: string;
  canonicalEventId: string;
  providerPlayerId: string;
  canonicalPlayerId: string;
  playerName: string;
  sport: string;
  market: string;
  statType: string;
  period: string;
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  retrievalTimestamp: string;
  marketId: string;
}

export interface EvView {
  side: "over" | "under";
  ev: number;
  fairProbability: number;
  impliedProbability: number;
  odds: number;
}

type EligibleMarket = AnalysisEligibleProp;

export const analyzePlayerProp = createServerFn({ method: "POST" })
  .validator((data: AnalysisInput) => data)
  .handler(async ({ data }): Promise<HonestAnalysisResponse> => {
    const auth = await requireAuth();
    const userId = auth.userId!;

    // Free-tier limit (unchanged semantics).
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

    const playerName = String(data.playerName ?? "").trim();
    const sport = String(data.sport ?? "").toUpperCase() as League;
    if (playerName === "") throw new Error("playerName is required");

    // ── (1) validated provider request — player search ─────────────────────────
    const search = await sportsData.searchPlayers(playerName, sport);
    if (search.state === "DEMO") {
      return { ok: false, state: "DEMO", reason: "provider is demo-only; production analysis requires a live configured provider" };
    }
    if (search.state !== "AVAILABLE" || !search.data) {
      return { ok: false, state: search.state, reason: search.reason ?? "player search unavailable" };
    }
    const players = search.data;
    const player = players.find((p) => p.name.toLowerCase() === playerName.toLowerCase());
    if (!player) {
      return { ok: false, state: "EMPTY", reason: `no player matched "${playerName}"` };
    }

    // ── (2) canonical PLAYER resolution (provider id ⇒ canonical id, fail-closed) ──
    let canonicalPlayer: ReturnType<typeof resolveCanonicalPlayer>;
    try {
      canonicalPlayer = resolveCanonicalPlayer({
        provider: providerIdForKind(),
        providerPlayerId: player.id,
        sport: player.sport,
        team: player.team,
        name: player.name,
      });
    } catch (err) {
      const e = toEntityError(err);
      return { ok: false, state: "UNVERIFIED", reason: `player identity not verifiable: ${e.kind}` };
    }

    // ── (3) canonical EVENT resolution + player-in-event guard ─────────────────────
    const gamesResult = await sportsData.getGames(player.sport);
    if (gamesResult.state === "DEMO") return { ok: false, state: "DEMO", reason: "events are demo data" };
    if (gamesResult.state !== "AVAILABLE" || !gamesResult.data) {
      return { ok: false, state: gamesResult.state, reason: gamesResult.reason ?? "no games" };
    }
    const event = gamesResult.data.find(
      (g) => g.homeTeam === canonicalPlayer.team || g.awayTeam === canonicalPlayer.team,
    );
    if (!event) return { ok: false, state: "EMPTY", reason: "no current event for player" };

    let canonicalEvent: ReturnType<typeof resolveCanonicalEvent>;
    try {
      canonicalEvent = resolveCanonicalEvent({
        provider: canonicalPlayer.provider,
        providerEventId: event.id,
        sport: event.sport,
        participants: [event.homeTeam, event.awayTeam],
      });
    } catch (err) {
      const e = toEntityError(err);
      return { ok: false, state: "UNVERIFIED", reason: `event identity not verifiable: ${e.kind}` };
    }
    try {
      assertPlayerInEvent(canonicalPlayer, canonicalEvent);
    } catch (err) {
      const e = toEntityError(err);
      return { ok: false, state: "UNVERIFIED", reason: `player-event mismatch: ${e.kind}` };
    }

    // ── (4) props with provenance → RawProviderProp ─────────────────────────────────
    const propsResult = await sportsData.getPlayerProps(event.id, canonicalPlayer.canonicalPlayerId, player.sport);
    if (propsResult.state === "DEMO") return { ok: false, state: "DEMO", reason: "props are demo data" };
    if (propsResult.state !== "AVAILABLE" || !propsResult.data) {
      return { ok: false, state: propsResult.state, reason: propsResult.reason ?? "props unavailable" };
    }
    const rawProps = (propsResult.data as RawProviderProp[]).filter(
      (p) => p.playerName.toLowerCase() === playerName.toLowerCase(),
    );

    // ── (5) LivePropsValidator — the mandatory gate, issues AnalysisEligibleProp ────
    const eligible: EligibleMarket[] = [];
    const rejected: string[] = [];
    for (const raw of rawProps) {
      const resolved: ResolvedProviderProp = {
        ...raw,
        canonicalEventId: canonicalEvent.canonicalEventId,
        canonicalPlayerId: canonicalPlayer.canonicalPlayerId,
        canonicalPlayerName: canonicalPlayer.canonicalPlayerId, // canonical id is authoritative; name is not trusted
      };
      const outcome = validateLiveProp({ prop: resolved });
      if (outcome.ok) eligible.push(outcome.prop);
      else rejected.push(`${raw.market}:${outcome.reasons.join(",")}`);
    }

    const wantedMarket = data.market ?? rawProps[0]?.market;
    const target = eligible.find((p) => p.raw.market === wantedMarket) ?? eligible[0];
    if (!target) {
      return {
        ok: false,
        state: "EMPTY",
        reason: rejected.length > 0 ? `no prop passed validation (${rejected.slice(0, 5).join("; ")})` : "no props for this player",
      };
    }

    // ── (6) EVEngine — the SINGLE production calculateEv path (evPointForIssued) ────
    const ev = evPointForIssued(target);

    const propView: IssuedPropView = {
      provider: target.raw.provider,
      providerEventId: target.raw.providerEventId,
      canonicalEventId: target.raw.canonicalEventId,
      providerPlayerId: target.raw.providerPlayerId,
      canonicalPlayerId: target.raw.canonicalPlayerId,
      playerName: target.raw.playerName,
      sport: target.raw.sport,
      market: target.raw.market,
      statType: target.raw.statType,
      period: target.raw.period,
      sportsbook: target.raw.sportsbook,
      line: target.raw.outcomes[0].line,
      overOdds: sideOdds(target, "over"),
      underOdds: sideOdds(target, "under"),
      retrievalTimestamp: target.raw.retrievalTimestamp,
      marketId: target.marketId,
    };

    // ── (7) PERSIST ONLY from issued AnalysisEligibleProp + real EV (WS1b §13). ─────
    //      Nothing is persisted today because no fair-probability source exists — the
    //      route returns the validated prop + honest "no EV" note instead of writing a
    //      fabricated analysis row. The guarded persist path below is the ONLY writer.
    if (ev !== null) {
      const prov = {
        provider: target.raw.provider,
        providerEventId: target.raw.providerEventId,
        canonicalEventId: target.raw.canonicalEventId,
        providerPlayerId: target.raw.providerPlayerId,
        canonicalPlayerId: target.raw.canonicalPlayerId,
        market: target.raw.market,
        statType: target.raw.statType,
        period: target.raw.period,
        line: target.raw.outcomes[0].line,
        overOdds: sideOf(target, "over"),
        underOdds: sideOf(target, "under"),
        sportsbook: target.raw.sportsbook,
        retrievalTimestamp: target.raw.retrievalTimestamp,
        marketId: target.marketId,
      };
      const recommendation = ev.side === "over" ? ("lean_over" as const) : ("lean_under" as const);
      const confidence = Math.min(99, Math.round(ev.fairProbability * 100));
      await client`
        INSERT INTO ai_analyses (
          user_id, player_name, sport, league, prop_type, prop_line,
          bet_type, confidence_score, recommendation, reasoning,
          key_factors, projected_stat, analysis_data, event_id, outcome, result, confidence_tier
        ) VALUES (
          ${userId}, ${target.raw.playerName}, ${target.raw.sport}, null, ${target.raw.statType},
          ${target.raw.outcomes[0].line}, ${recommendation}, ${confidence}, ${recommendation},
          ${`EV ${Number(ev.ev).toFixed(4)} per unit from validated provider prop (${target.marketId})`},
          ${JSON.stringify([])}, null, ${JSON.stringify(prov)}, ${target.raw.providerEventId},
          'pending', 'pending', ${"medium"}
        )
        RETURNING id
      `;
      await logUsage(userId, "analysis", { playerName, sport, market: target.raw.market });
    }

    return {
      ok: true,
      state: "AVAILABLE",
      prop: propView,
      ev,
      reason: ev === null ? "EV requires a server-side fair-probability model; none configured" : undefined,
    };
  });

/* -----------------------------------------------------------------------------
 * The single production calculateEv invocation path (WS1b §7).
 * fairProbability must come from a REAL server-side source. There is none
 * configured today (PROBABILITY_SOURCE unset) — so evPointForIssued returns
 * null and NO EV is ever fabricated. When a genuine probability source lands,
 * this stays the only call site.
 * --------------------------------------------------------------------------- */
function evPointForIssued(prop: EligibleMarket): EvView | null {
  const fairProbability = serverFairProbability(prop);
  if (fairProbability === null) return null;
  const side: "over" | "under" = fairProbability >= 0.5 ? "over" : "under";
  const result = calculateEv(prop, fairProbability, side);
  return {
    side: result.side,
    ev: result.ev,
    fairProbability: result.fairProbability,
    impliedProbability: result.impliedProbability,
    odds: result.odds,
  };
}

/** Real fair-probability model source. Today: none exist, so null (honest). */
function serverFairProbability(_prop: EligibleMarket): number | null {
  // Future integration points (real models only; never stash a constant here):
  //   - OPENAI_PROBABILITY_API (default) → real model probability
  //   - MLE_PROBABILITY_ENDPOINT → real endpoint
  return null;
}

function sideOf(prop: EligibleMarket, side: "over" | "under"): number {
  const o = prop.raw.outcomes.find((x) => x.side === side);
  return o?.odds ?? Number.NaN;
}

function toEntityError(err: unknown): EntityResolutionError {
  return err instanceof EntityResolutionError ? err : new EntityResolutionError("AMBIGUOUS", String(err));
}

function providerIdForKind(): string {
  return sportsData.kind() === "real" ? "real-provider" : sportsData.kind();
}