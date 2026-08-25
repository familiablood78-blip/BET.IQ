/**
 * BetIQ — Canonical Entity Resolution (WS1b §4)
 *
 * Provider → canonical identity mapping for players and events. This is the
 * identity gate: names are SECONDARY evidence only. Unknown, contradictory,
 * ambiguous or mismatched identities FAIL CLOSED — they are rejected, never
 * approximated.
 *
 * Resolution requires a registry entry for the (provider, providerPlayerId) /
 * (provider, providerEventId) pair. Without a registry entry (i.e. before a
 * live identity integration exists) resolution rejects, which is the honest
 * fail-closed behaviour — providers cannot self-assert canonical identity.
 */

import type { League } from "./types";

export interface CanonicalPlayerIdentity {
  provider: string;
  providerPlayerId: string;
  canonicalPlayerId: string;
  sport: League;
  league?: string;
  team?: string;
}

export interface CanonicalEventIdentity {
  provider: string;
  providerEventId: string;
  canonicalEventId: string;
  sport: League;
  league?: string;
  /** Participant identities (team names or competitor names). */
  participants: string[];
}

/** Registered canonical player identities, keyed `${provider}:${providerPlayerId}`. */
const canonicalPlayers = new Map<string, CanonicalPlayerIdentity>();
/** Registered canonical event identities, keyed `${provider}:${providerEventId}`. */
const canonicalEvents = new Map<string, CanonicalEventIdentity>();

export class EntityResolutionError extends Error {
  readonly kind:
    | "UNKNOWN_PLAYER"
    | "UNKNOWN_EVENT"
    | "MISMATCHED_PLAYER"
    | "MISMATCHED_EVENT"
    | "WRONG_EVENT"
    | "AMBIGUOUS";
  constructor(kind: EntityResolutionError["kind"], message: string) {
    super(message);
    this.name = "EntityResolutionError";
    this.kind = kind;
  }
}

/** Register a canonical player mapping (seeded by integrations/tests only). */
export function registerCanonicalPlayer(identity: CanonicalPlayerIdentity): void {
  canonicalPlayers.set(`${identity.provider}:${identity.providerPlayerId}`, identity);
}

/** Register a canonical event mapping (seeded by integrations/tests only). */
export function registerCanonicalEvent(identity: CanonicalEventIdentity): void {
  canonicalEvents.set(`${identity.provider}:${identity.providerEventId}`, identity);
}

export type PlayerLookup = {
  provider: string;
  providerPlayerId: string;
  /** Claimed canonical id — must equal the registry value if present. */
  canonicalPlayerId?: string;
  sport: League;
  league?: string;
  team?: string;
  /** Names are secondary evidence only and never override identity. */
  name?: string;
};

export type EventLookup = {
  provider: string;
  providerEventId: string;
  canonicalEventId?: string;
  sport: League;
  league?: string;
  participants?: string[];
};

/** Resolve a provider player reference to a verified canonical identity. */
export function resolveCanonicalPlayer(lookup: PlayerLookup): CanonicalPlayerIdentity {
  const key = `${lookup.provider}:${lookup.providerPlayerId}`;
  const known = canonicalPlayers.get(key);

  if (!known) {
    throw new EntityResolutionError(
      "UNKNOWN_PLAYER",
      `No canonical mapping for ${lookup.provider} player ${lookup.providerPlayerId} — identity not verifiable, rejecting`,
    );
  }

  if (known.sport !== lookup.sport) {
    throw new EntityResolutionError(
      "MISMATCHED_PLAYER",
      `sport mismatch for ${key}: registry=${known.sport} claimed=${lookup.sport}`,
    );
  }
  if (lookup.league !== undefined && known.league !== undefined && known.league !== lookup.league) {
    throw new EntityResolutionError(
      "MISMATCHED_PLAYER",
      `league mismatch for ${key}: registry=${known.league} claimed=${lookup.league}`,
    );
  }
  if (lookup.team !== undefined && known.team !== undefined && known.team !== lookup.team) {
    throw new EntityResolutionError(
      "MISMATCHED_PLAYER",
      `team mismatch for ${key}: registry=${known.team} claimed=${lookup.team}`,
    );
  }
  if (lookup.canonicalPlayerId !== undefined && lookup.canonicalPlayerId !== known.canonicalPlayerId) {
    throw new EntityResolutionError(
      "MISMATCHED_PLAYER",
      `canonical id mismatch for ${key}: registry=${known.canonicalPlayerId} claimed=${lookup.canonicalPlayerId}`,
    );
  }
  return known;
}

/** Resolve a provider event reference to a verified canonical identity. */
export function resolveCanonicalEvent(lookup: EventLookup): CanonicalEventIdentity {
  const key = `${lookup.provider}:${lookup.providerEventId}`;
  const known = canonicalEvents.get(key);

  if (!known) {
    throw new EntityResolutionError(
      "UNKNOWN_EVENT",
      `no canonical mapping for ${lookup.provider} event ${lookup.providerEventId} — refusal, rejecting`,
    );
  }
  if (known.sport !== lookup.sport) {
    throw new EntityResolutionError(
      "MISMATCHED_EVENT",
      `sport mismatch for ${key}: registry=${known.sport} claimed=${lookup.sport}`,
    );
  }
  if (lookup.league !== undefined && known.league !== undefined && known.league !== lookup.league) {
    throw new EntityResolutionError(
      "MISMATCHED_EVENT",
      `league mismatch for ${key}: registry=${known.league} claimed=${lookup.league}`,
    );
  }
  if (lookup.canonicalEventId !== undefined && lookup.canonicalEventId !== known.canonicalEventId) {
    throw new EntityResolutionError(
      "MISMATCHED_EVENT",
      `canonical id mismatch for ${key}: registry=${known.canonicalEventId} claimed=${lookup.canonicalEventId}`,
    );
  }
  return known;
}

/**
 * Verify a player's event attachment (WS1b §4: "Player attached to wrong event
 * → rejected"). Uses registered canonical identities ONLY; team/participant
 * strings are secondary evidence. Fails closed on any mismatch.
 * Individual-sport events (PGA/UFC/Tennis) match participants by canonical
 * player id; team-sport events must contain the player's team.
 */
export function assertPlayerInEvent(player: CanonicalPlayerIdentity, event: CanonicalEventIdentity): void {
  if (player.provider !== event.provider) {
    throw new EntityResolutionError("WRONG_EVENT", "player and event come from different providers");
  }
  if (player.sport !== event.sport) {
    throw new EntityResolutionError("WRONG_EVENT", `player sport ${player.sport} != event sport ${event.sport}`);
  }
  const participants = event.participants.map(normalizeToken);
  if (isTeamSport(player.sport)) {
    if (player.team === undefined || player.team.trim() === "") {
      throw new EntityResolutionError("WRONG_EVENT", `team sport player ${player.canonicalPlayerId} has no team to match`);
    }
    if (!participants.includes(normalizeToken(player.team))) {
      throw new EntityResolutionError(
        "WRONG_EVENT",
        `player team "${player.team}" not among event participants ${JSON.stringify(event.participants)}`,
      );
    }
  } else {
    // Individual sports: participants must include the canonical player id token.
    if (!participants.includes(normalizeToken(player.canonicalPlayerId))) {
      throw new EntityResolutionError(
        "WRONG_EVENT",
        `player ${player.canonicalPlayerId} not among event participants ${JSON.stringify(event.participants)}`,
      );
    }
  }
}

/** Team vs individual sports — determines participant-match semantics above. */
export function isTeamSport(sport: League): boolean {
  return sport === "NFL" || sport === "NBA" || sport === "MLB" || sport === "NHL" ||
    sport === "Soccer" || sport === "CollegeFootball" || sport === "CollegeBasketball";
}

function normalizeToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}