-- UP

-- Entrenamiento: catálogo de ejercicios, plantilla en Activity, sesión 1:1 con follow-up, sets

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS is_workout BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_region TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT exercises_body_region_check CHECK (body_region IN ('upper', 'lower'))
);

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_user_name_lower
  ON exercises (user_id, lower(name));

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS activity_workout_exercises (
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_workout_exercises_exercise
  ON activity_workout_exercises(exercise_id);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_follow_up_id INTEGER NOT NULL REFERENCES activity_follow_ups(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workout_sessions_follow_up_unique UNIQUE (activity_follow_up_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_activity_id ON workout_sessions(activity_id);

CREATE TRIGGER update_workout_sessions_updated_at BEFORE UPDATE ON workout_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workout_session_exercises_session_exercise_unique UNIQUE (session_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session
  ON workout_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_exercise
  ON workout_session_exercises(exercise_id);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  session_exercise_id UUID NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight_kg NUMERIC(8, 2) NOT NULL,
  reps INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workout_sets_set_index_positive CHECK (set_index >= 1),
  CONSTRAINT workout_sets_reps_positive CHECK (reps > 0),
  CONSTRAINT workout_sets_weight_non_negative CHECK (weight_kg >= 0),
  CONSTRAINT workout_sets_session_exercise_index_unique UNIQUE (session_exercise_id, set_index)
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session_exercise
  ON workout_sets(session_exercise_id);

CREATE TRIGGER update_workout_sets_updated_at BEFORE UPDATE ON workout_sets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN

-- DROP TRIGGER IF EXISTS update_workout_sets_updated_at ON workout_sets;
-- DROP INDEX IF EXISTS idx_workout_sets_session_exercise;
-- DROP TABLE IF EXISTS workout_sets;
-- DROP INDEX IF EXISTS idx_workout_session_exercises_exercise;
-- DROP INDEX IF EXISTS idx_workout_session_exercises_session;
-- DROP TABLE IF EXISTS workout_session_exercises;
-- DROP TRIGGER IF EXISTS update_workout_sessions_updated_at ON workout_sessions;
-- DROP INDEX IF EXISTS idx_workout_sessions_activity_id;
-- DROP INDEX IF EXISTS idx_workout_sessions_user_id;
-- DROP TABLE IF EXISTS workout_sessions;
-- DROP INDEX IF EXISTS idx_activity_workout_exercises_exercise;
-- DROP TABLE IF EXISTS activity_workout_exercises;
-- DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
-- DROP INDEX IF EXISTS idx_exercises_user_name_lower;
-- DROP INDEX IF EXISTS idx_exercises_user_id;
-- DROP TABLE IF EXISTS exercises;
-- ALTER TABLE activities DROP COLUMN IF EXISTS is_workout;
