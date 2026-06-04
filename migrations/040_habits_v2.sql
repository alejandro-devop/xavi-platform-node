-- UP

-- habits: 5 nuevas columnas
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS habit_type VARCHAR(10) NOT NULL DEFAULT 'boolean'
    CONSTRAINT habits_habit_type_check CHECK (habit_type IN ('boolean', 'count', 'time')),
  ADD COLUMN IF NOT EXISTS period_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restart_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_lifelines INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CONSTRAINT habits_status_check CHECK (status IN ('active', 'completed', 'archived'));

CREATE INDEX IF NOT EXISTS idx_habits_status ON habits(user_id, status);

-- habit_logs: 2 nuevas columnas
ALTER TABLE habit_logs
  ADD COLUMN IF NOT EXISTS difficulty SMALLINT
    CONSTRAINT habit_logs_difficulty_check CHECK (difficulty IS NULL OR (difficulty BETWEEN 0 AND 4)),
  ADD COLUMN IF NOT EXISTS is_lifeline BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_habit_logs_lifeline ON habit_logs(habit_id, is_lifeline, completed_date);

-- Migración de datos existentes

-- Poblar habit_type desde flags (is_timer tiene precedencia)
UPDATE habits SET habit_type = CASE
  WHEN is_timer = TRUE THEN 'time'
  WHEN is_counter = TRUE THEN 'count'
  ELSE 'boolean'
END;

-- Poblar period_days desde fechas cuando ambas existen
UPDATE habits
SET period_days = (end_date - start_date)
WHERE start_date IS NOT NULL AND end_date IS NOT NULL;

-- Poblar status desde is_active
UPDATE habits SET status = CASE
  WHEN is_active = TRUE THEN 'active'
  ELSE 'archived'
END;

-- DOWN

-- ALTER TABLE habits DROP COLUMN IF EXISTS habit_type, DROP COLUMN IF EXISTS period_days, DROP COLUMN IF EXISTS restart_count, DROP COLUMN IF EXISTS weekly_lifelines, DROP COLUMN IF EXISTS status;
-- ALTER TABLE habit_logs DROP COLUMN IF EXISTS difficulty, DROP COLUMN IF EXISTS is_lifeline;
-- DROP INDEX IF EXISTS idx_habits_status;
-- DROP INDEX IF EXISTS idx_habit_logs_lifeline;
