/**
 * Database migration runner.
 * Server-only function that runs the schema SQL against Neon Postgres.
 * Call this from an API route or server function to initialize tables.
 */
import { sql } from "~/db";
import { SCHEMA_SQL } from "./schema";

export async function runMigrations(): Promise<{ success: boolean; message: string }> {
  try {
    const client = sql();
    await client(SCHEMA_SQL);
    return { success: true, message: "Schema applied successfully" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", msg);
    return { success: false, message: msg };
  }
}

/**
 * Sync a Clerk user into our users table.
 * Creates the user if they don't exist, or updates their info.
 */
export async function syncUser(clerkUserId: string, email: string, firstName?: string, lastName?: string, imageUrl?: string) {
  const client = sql();
  const existing = await client`SELECT id FROM users WHERE id = ${clerkUserId}`;

  if (existing.length === 0) {
    await client`
      INSERT INTO users (id, email, first_name, last_name, image_url)
      VALUES (${clerkUserId}, ${email}, ${firstName ?? null}, ${lastName ?? null}, ${imageUrl ?? null})
    `;
    // Create free subscription for new users
    await client`
      INSERT INTO subscriptions (user_id, tier, status)
      VALUES (${clerkUserId}, 'free', 'active')
    `;
  } else {
    await client`
      UPDATE users SET 
        email = ${email},
        first_name = ${firstName ?? null},
        last_name = ${lastName ?? null},
        image_url = ${imageUrl ?? null},
        updated_at = NOW()
      WHERE id = ${clerkUserId}
    `;
  }
}

/**
 * Count usage for a user within a time period (for free tier limits).
 */
export async function countUsage(userId: string, action: string, since: Date): Promise<number> {
  const client = sql();
  const rows = await client`
    SELECT COUNT(*) as count FROM usage_log 
    WHERE user_id = ${userId} AND action = ${action} AND created_at >= ${since.toISOString()}
  `;
  return parseInt(String(rows[0]?.count ?? "0"), 10);
}

/**
 * Log a usage action.
 */
export async function logUsage(userId: string, action: string, metadata?: Record<string, unknown>) {
  const client = sql();
  await client`
    INSERT INTO usage_log (user_id, action, metadata)
    VALUES (${userId}, ${action}, ${metadata ? JSON.stringify(metadata) : null})
  `;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

/**
 * Seed the database with mock players, games, odds, and prop lines.
 * All inserts are idempotent (ON CONFLICT / IF NOT EXISTS).
 * Call with: runSeed()
 */
export async function runSeed(): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
  const client = sql();
  const counts: Record<string, number> = {};

  try {
    // Seed players
    const players = getSeedPlayers();
    for (const p of players) {
      await client`
        INSERT INTO players (external_id, name, team, position, league, number)
        VALUES (${p.externalId}, ${p.name}, ${p.team}, ${p.position}, ${p.league}, ${p.number ?? null})
        ON CONFLICT DO NOTHING
      `;
    }
    counts.players = players.length;

    // Seed games
    const games = getSeedGames();
    for (const g of games) {
      await client`
        INSERT INTO games (external_id, home_team, away_team, start_time, status, league, venue)
        VALUES (${g.externalId}, ${g.homeTeam}, ${g.awayTeam}, ${g.startTime}, ${g.status}, ${g.league}, ${g.venue ?? null})
        ON CONFLICT DO NOTHING
      `;
    }
    counts.games = games.length;

    // Seed prop lines
    const props = getSeedPropLines();
    for (const p of props) {
      const playerRows = await client`SELECT id FROM players WHERE external_id = ${p.playerExternalId} LIMIT 1`;
      const gameRows = await client`SELECT id FROM games WHERE external_id = ${p.gameExternalId} LIMIT 1`;
      if (playerRows.length === 0 || gameRows.length === 0) continue;
      await client`
        INSERT INTO prop_lines (player_id, game_id, prop_type, line, over_odds, under_odds, provider)
        VALUES (${playerRows[0].id}, ${gameRows[0].id}, ${p.propType}, ${p.line}, ${p.overOdds}, ${p.underOdds}, ${p.provider})
        ON CONFLICT DO NOTHING
      `;
    }
    counts.propLines = props.length;

    return { success: true, message: "Seed data inserted", counts };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Seed failed:", msg);
    return { success: false, message: msg, counts };
  }
}

// ─── Mock Seed Data ───────────────────────────────────────────────────────────

function getSeedPlayers(): Array<{
  externalId: string; name: string; team: string; position: string; league: string; number?: number;
}> {
  return [
    { externalId: "nba-ljames", name: "LeBron James", team: "Los Angeles Lakers", position: "SF", league: "NBA", number: 23 },
    { externalId: "nba-scurry", name: "Stephen Curry", team: "Golden State Warriors", position: "PG", league: "NBA", number: 30 },
    { externalId: "nba-gantetokounmpo", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks", position: "PF", league: "NBA", number: 34 },
    { externalId: "nba-ndjokic", name: "Nikola Jokic", team: "Denver Nuggets", position: "C", league: "NBA", number: 15 },
    { externalId: "nba-jtatum", name: "Jayson Tatum", team: "Boston Celtics", position: "SF", league: "NBA", number: 0 },
    { externalId: "nba-kdurant", name: "Kevin Durant", team: "Phoenix Suns", position: "SF", league: "NBA", number: 35 },
    { externalId: "nba-ledwards", name: "Anthony Edwards", team: "Minnesota Timberwolves", position: "SG", league: "NBA", number: 5 },
    { externalId: "nba-luka", name: "Luka Doncic", team: "Dallas Mavericks", position: "PG", league: "NBA", number: 77 },
    { externalId: "nfl-pmahomes", name: "Patrick Mahomes", team: "Kansas City Chiefs", position: "QB", league: "NFL", number: 15 },
    { externalId: "nfl-jallen", name: "Josh Allen", team: "Buffalo Bills", position: "QB", league: "NFL", number: 17 },
    { externalId: "nfl-cmccaffrey", name: "Christian McCaffrey", team: "San Francisco 49ers", position: "RB", league: "NFL", number: 23 },
    { externalId: "nfl-jjefferson", name: "Justin Jefferson", team: "Minnesota Vikings", position: "WR", league: "NFL", number: 18 },
    { externalId: "mlb-sohtani", name: "Shohei Ohtani", team: "Los Angeles Dodgers", position: "DH/SP", league: "MLB", number: 17 },
    { externalId: "mlb-ajudge", name: "Aaron Judge", team: "New York Yankees", position: "RF", league: "MLB", number: 99 },
    { externalId: "nhl-cmcdavid", name: "Connor McDavid", team: "Edmonton Oilers", position: "C", league: "NHL", number: 97 },
    { externalId: "nhl-amatthews", name: "Auston Matthews", team: "Toronto Maple Leafs", position: "C", league: "NHL", number: 34 },
  ];
}

function getSeedGames(): Array<{
  externalId: string; homeTeam: string; awayTeam: string; startTime: string; status: string; league: string; venue?: string;
}> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const t = tomorrow.toISOString().split("T")[0];

  return [
    { externalId: "game-nba-001", homeTeam: "Los Angeles Lakers", awayTeam: "Golden State Warriors", startTime: `${t}T19:30:00-05:00`, status: "scheduled", league: "NBA", venue: "Crypto.com Arena" },
    { externalId: "game-nba-002", homeTeam: "Milwaukee Bucks", awayTeam: "Boston Celtics", startTime: `${t}T20:00:00-05:00`, status: "scheduled", league: "NBA", venue: "Fiserv Forum" },
    { externalId: "game-nba-003", homeTeam: "Denver Nuggets", awayTeam: "Phoenix Suns", startTime: `${t}T21:00:00-05:00`, status: "scheduled", league: "NBA", venue: "Ball Arena" },
    { externalId: "game-nba-004", homeTeam: "Dallas Mavericks", awayTeam: "Minnesota Timberwolves", startTime: `${t}T19:00:00-05:00`, status: "scheduled", league: "NBA", venue: "American Airlines Center" },
    { externalId: "game-nfl-001", homeTeam: "Kansas City Chiefs", awayTeam: "Buffalo Bills", startTime: `${t}T16:25:00-05:00`, status: "scheduled", league: "NFL", venue: "Arrowhead Stadium" },
    { externalId: "game-nfl-002", homeTeam: "San Francisco 49ers", awayTeam: "Minnesota Vikings", startTime: `${t}T13:00:00-05:00`, status: "scheduled", league: "NFL", venue: "Levi's Stadium" },
    { externalId: "game-mlb-001", homeTeam: "Los Angeles Dodgers", awayTeam: "New York Yankees", startTime: `${t}T19:05:00-05:00`, status: "scheduled", league: "MLB", venue: "Dodger Stadium" },
    { externalId: "game-nhl-001", homeTeam: "Edmonton Oilers", awayTeam: "Toronto Maple Leafs", startTime: `${t}T19:00:00-05:00`, status: "scheduled", league: "NHL", venue: "Rogers Place" },
  ];
}

function getSeedPropLines(): Array<{
  playerExternalId: string; gameExternalId: string; propType: string; line: number; overOdds: number; underOdds: number; provider: string;
}> {
  return [
    // NBA props
    { playerExternalId: "nba-ljames", gameExternalId: "game-nba-001", propType: "points", line: 26.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nba-ljames", gameExternalId: "game-nba-001", propType: "assists", line: 7.5, overOdds: -105, underOdds: -115, provider: "mock" },
    { playerExternalId: "nba-ljames", gameExternalId: "game-nba-001", propType: "rebounds", line: 8.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nba-scurry", gameExternalId: "game-nba-001", propType: "points", line: 28.5, overOdds: -115, underOdds: -105, provider: "mock" },
    { playerExternalId: "nba-scurry", gameExternalId: "game-nba-001", propType: "three_pointers", line: 4.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nba-gantetokounmpo", gameExternalId: "game-nba-002", propType: "points", line: 30.5, overOdds: -105, underOdds: -115, provider: "mock" },
    { playerExternalId: "nba-gantetokounmpo", gameExternalId: "game-nba-002", propType: "rebounds", line: 11.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nba-jtatum", gameExternalId: "game-nba-002", propType: "points", line: 27.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nba-ndjokic", gameExternalId: "game-nba-003", propType: "points", line: 25.5, overOdds: -115, underOdds: -105, provider: "mock" },
    { playerExternalId: "nba-ndjokic", gameExternalId: "game-nba-003", propType: "assists", line: 8.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nba-kdurant", gameExternalId: "game-nba-003", propType: "points", line: 26.5, overOdds: -110, underOdds: -110, provider: "mock" },
    // NFL props
    { playerExternalId: "nfl-pmahomes", gameExternalId: "game-nfl-001", propType: "passing_yards", line: 285.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nfl-pmahomes", gameExternalId: "game-nfl-001", propType: "touchdowns", line: 2.5, overOdds: 120, underOdds: -145, provider: "mock" },
    { playerExternalId: "nfl-jallen", gameExternalId: "game-nfl-001", propType: "passing_yards", line: 250.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nfl-cmccaffrey", gameExternalId: "game-nfl-002", propType: "rushing_yards", line: 85.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nfl-jjefferson", gameExternalId: "game-nfl-002", propType: "receiving_yards", line: 95.5, overOdds: -115, underOdds: -105, provider: "mock" },
    // MLB props
    { playerExternalId: "mlb-sohtani", gameExternalId: "game-mlb-001", propType: "home_runs", line: 0.5, overOdds: 200, underOdds: -250, provider: "mock" },
    { playerExternalId: "mlb-ajudge", gameExternalId: "game-mlb-001", propType: "home_runs", line: 0.5, overOdds: 180, underOdds: -220, provider: "mock" },
    // NHL props
    { playerExternalId: "nhl-cmcdavid", gameExternalId: "game-nhl-001", propType: "points", line: 1.5, overOdds: -110, underOdds: -110, provider: "mock" },
    { playerExternalId: "nhl-amatthews", gameExternalId: "game-nhl-001", propType: "goals", line: 0.5, overOdds: 150, underOdds: -180, provider: "mock" },
  ];
}
