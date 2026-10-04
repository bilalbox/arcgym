-- Migration 0001: Create learner_progress table
-- Stores pseudonymous learner progress using the Hybrid Document Pattern.

CREATE TABLE IF NOT EXISTS learner_progress (
  learner_id TEXT PRIMARY KEY,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  completed_drills_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_learner_progress_updated_at ON learner_progress(updated_at);
