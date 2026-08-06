/**
 * Database schema definition for BetIQ.
 * All CREATE TABLE statements with IF NOT EXISTS for idempotent migrations.
 */

export const SCHEMA_SQL = `
-- Users (mirroring Clerk users for app-level data)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (free/premium tier tracking)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bets (user wagers)
CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  event_id TEXT,
  event_name TEXT,
  player_name TEXT NOT NULL,
  prop_type TEXT NOT NULL,
  prop_line DECIMAL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('over', 'under')),
  odds DECIMAL NOT NULL,
  stake DECIMAL NOT NULL,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'push', 'pending')),
  profit DECIMAL,
  league TEXT,
  notes TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Production tables ───────────────────────────────────────────────────────

-- Players (canonical player records from external APIs)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  position TEXT NOT NULL,
  league TEXT NOT NULL,
  number INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_players_external ON players(external_id);
CREATE INDEX IF NOT EXISTS idx_players_league ON players(league);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- Games (scheduled/completed events)
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'final', 'postponed', 'canceled')),
  league TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  venue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_games_external ON games(external_id);
CREATE INDEX IF NOT EXISTS idx_games_league_date ON games(league, start_time);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Odds History (snapshot of odds at a point in time for tracking)
CREATE TABLE IF NOT EXISTS odds_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  prop_type TEXT NOT NULL,
  prop_line DECIMAL NOT NULL,
  over_odds DECIMAL NOT NULL,
  under_odds DECIMAL NOT NULL,
  bookmaker TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_odds_history_game ON odds_history(game_id);
CREATE INDEX IF NOT EXISTS idx_odds_history_player ON odds_history(player_id);
CREATE INDEX IF NOT EXISTS idx_odds_history_recorded ON odds_history(recorded_at DESC);

-- Prop Lines (current/latest prop offerings)
CREATE TABLE IF NOT EXISTS prop_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  prop_type TEXT NOT NULL,
  line DECIMAL NOT NULL,
  over_odds DECIMAL NOT NULL,
  under_odds DECIMAL NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_lines_player_game ON prop_lines(player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_prop_lines_type ON prop_lines(prop_type);

-- AI Analyses (player prop analysis results — enhanced)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT,
  prop_type TEXT NOT NULL,
  prop_line DECIMAL,
  bet_type TEXT CHECK (bet_type IN ('over', 'under', 'not_recommended')),
  confidence_score DECIMAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('lean_over', 'lean_under', 'no_bet')),
  reasoning TEXT,
  key_factors JSONB,
  projected_stat DECIMAL,
  analysis_data JSONB,
  event_id TEXT,
  game_date DATE,
  result TEXT CHECK (result IN ('correct', 'incorrect', 'pending')),
  actual_stat DECIMAL,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'push', 'pending')),
  settled_at TIMESTAMPTZ,
  confidence_tier TEXT CHECK (confidence_tier IN ('high', 'medium', 'low')),
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_player ON ai_analyses(player_name, sport);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_outcome ON ai_analyses(outcome);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_sport ON ai_analyses(sport);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_tier ON ai_analyses(confidence_tier);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_settled ON ai_analyses(settled_at) WHERE settled_at IS NOT NULL;

-- Prediction Outcomes (accuracy tracking for settled predictions)
CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  analysis_id TEXT NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_outcome TEXT NOT NULL,
  actual_outcome TEXT,
  predicted_stat DECIMAL,
  actual_stat DECIMAL,
  was_correct BOOLEAN,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_user ON prediction_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_analysis ON prediction_outcomes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_correct ON prediction_outcomes(was_correct) WHERE was_correct IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_settled ON prediction_outcomes(settled_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved Players/Teams
CREATE TABLE IF NOT EXISTS saved_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('player', 'team')),
  item_name TEXT NOT NULL,
  sport TEXT NOT NULL,
  team_name TEXT,
  league TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_name)
);

-- Usage tracking (for free tier limits)
CREATE TABLE IF NOT EXISTS usage_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_sport ON bets(sport);
CREATE INDEX IF NOT EXISTS idx_bets_outcome ON bets(outcome);
CREATE INDEX IF NOT EXISTS idx_bets_placed_at ON bets(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_player ON bets(player_name);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_action ON usage_log(user_id, action);
`;
