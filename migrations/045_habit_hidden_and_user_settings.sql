-- UP

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_habits_user_hidden ON habits(user_id, hidden) WHERE hidden = TRUE;

CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hide_hidden_habits BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- DOWN

-- DROP TABLE IF EXISTS user_settings;
-- ALTER TABLE habits DROP COLUMN IF EXISTS hidden;
-- DROP INDEX IF EXISTS idx_habits_user_hidden;
