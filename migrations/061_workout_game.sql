-- UP

-- Entrenamiento Fase 8: progreso de juego (XP / racha) + awards idempotentes por sesión

CREATE TABLE IF NOT EXISTS workout_game_progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_workout_date DATE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_workout_game_progress_updated_at
  BEFORE UPDATE ON workout_game_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS workout_session_xp_awards (
  session_id UUID PRIMARY KEY REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_awarded INTEGER NOT NULL CHECK (xp_awarded > 0),
  valid_set_count INTEGER NOT NULL CHECK (valid_set_count >= 1),
  volume_kg NUMERIC(12, 2) NOT NULL CHECK (volume_kg >= 0),
  awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workout_session_xp_awards_user
  ON workout_session_xp_awards(user_id);

-- DOWN

-- DROP INDEX IF EXISTS idx_workout_session_xp_awards_user;
-- DROP TABLE IF EXISTS workout_session_xp_awards;
-- DROP TRIGGER IF EXISTS update_workout_game_progress_updated_at ON workout_game_progress;
-- DROP TABLE IF EXISTS workout_game_progress;
