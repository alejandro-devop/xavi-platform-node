-- Habit tracker Phase 2: categories, measures, legacy habit fields, extended logs (follow-ups)

CREATE TABLE IF NOT EXISTS habit_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  order_index INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  color VARCHAR(255),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_habit_categories_user_id ON habit_categories(user_id);

CREATE TRIGGER update_habit_categories_updated_at
  BEFORE UPDATE ON habit_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS habit_measures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(50),
  type VARCHAR(50),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_habit_measures_user_id ON habit_measures(user_id);

CREATE TRIGGER update_habit_measures_updated_at
  BEFORE UPDATE ON habit_measures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Extend habits
ALTER TABLE habits ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS should_avoid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS should_keep BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_counter BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_timer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_incremental BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_decremental BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS max_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS daily_goal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS timer_goal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS times_goal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS step INTEGER;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES habit_categories(id) ON DELETE SET NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS measure_id UUID REFERENCES habit_measures(id) ON DELETE SET NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL;

-- Sync legacy simple fields into new goals where unset
UPDATE habits
SET daily_goal = target_count
WHERE daily_goal = 0 AND target_count > 0;

UPDATE habits
SET should_keep = TRUE
WHERE should_keep = FALSE AND should_avoid = FALSE;

-- Extend habit_logs (follow-ups)
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS time INTEGER NOT NULL DEFAULT 0;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS story TEXT;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS is_accomplished BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS is_failed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE habit_logs hl
SET user_id = h.user_id
FROM habits h
WHERE hl.habit_id = h.id AND hl.user_id IS NULL;

-- Default category per user with existing habits
INSERT INTO habit_categories (name, description, user_id, order_index)
SELECT 'General', 'Default category', u.user_id, 0
FROM (SELECT DISTINCT user_id FROM habits WHERE category_id IS NULL) u
WHERE NOT EXISTS (
  SELECT 1 FROM habit_categories c WHERE c.user_id = u.user_id AND c.name = 'General'
);

UPDATE habits h
SET category_id = c.id
FROM habit_categories c
WHERE h.user_id = c.user_id
  AND c.name = 'General'
  AND h.category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_habits_category_id ON habits(category_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_archived ON habit_logs(archived);

CREATE TRIGGER update_habit_logs_updated_at
  BEFORE UPDATE ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- DOWN
DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON habit_logs;
ALTER TABLE habit_logs
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS is_failed,
  DROP COLUMN IF EXISTS is_accomplished,
  DROP COLUMN IF EXISTS archived,
  DROP COLUMN IF EXISTS story,
  DROP COLUMN IF EXISTS time,
  DROP COLUMN IF EXISTS user_id;
ALTER TABLE habits
  DROP COLUMN IF EXISTS activity_id,
  DROP COLUMN IF EXISTS measure_id,
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS step,
  DROP COLUMN IF EXISTS times_goal,
  DROP COLUMN IF EXISTS timer_goal,
  DROP COLUMN IF EXISTS daily_goal,
  DROP COLUMN IF EXISTS max_streak,
  DROP COLUMN IF EXISTS streak,
  DROP COLUMN IF EXISTS days,
  DROP COLUMN IF EXISTS is_decremental,
  DROP COLUMN IF EXISTS is_incremental,
  DROP COLUMN IF EXISTS is_timer,
  DROP COLUMN IF EXISTS is_counter,
  DROP COLUMN IF EXISTS should_keep,
  DROP COLUMN IF EXISTS should_avoid,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS order_index;
DROP TABLE IF EXISTS habit_measures;
DROP TABLE IF EXISTS habit_categories;
