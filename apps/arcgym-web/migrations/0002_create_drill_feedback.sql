-- Migration 0002: Create drill_feedback and drill_rating_stats tables
-- Stores immutable feedback events and materialized rating rollups in Cloudflare D1.

CREATE TABLE IF NOT EXISTS drill_feedback (
  id TEXT PRIMARY KEY,
  drill_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  learner_id TEXT,
  dedup_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (drill_id, dedup_token)
);

CREATE INDEX IF NOT EXISTS idx_drill_feedback_drill_id ON drill_feedback(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_feedback_created_at ON drill_feedback(created_at);

CREATE TABLE IF NOT EXISTS drill_rating_stats (
  drill_id TEXT PRIMARY KEY,
  up_votes INTEGER NOT NULL DEFAULT 0,
  down_votes INTEGER NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  like_percentage INTEGER,
  tag_counts_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_drill_rating_stats_like_pct ON drill_rating_stats(like_percentage);
