-- Activity categories (simple) and time-tracking follow-ups

CREATE TABLE IF NOT EXISTS activity_categories (
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

CREATE INDEX idx_activity_categories_user_id ON activity_categories(user_id);

CREATE TRIGGER update_activity_categories_updated_at
  BEFORE UPDATE ON activity_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES activity_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_category_id ON activities(category_id);

CREATE TABLE IF NOT EXISTS activity_follow_ups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_follow_ups_activity_id ON activity_follow_ups(activity_id);
CREATE INDEX idx_activity_follow_ups_user_date ON activity_follow_ups(user_id, date);

CREATE TRIGGER update_activity_follow_ups_updated_at
  BEFORE UPDATE ON activity_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default category per user who already has activities
INSERT INTO activity_categories (name, description, user_id, order_index)
SELECT 'General', 'Default category', u.user_id, 0
FROM (SELECT DISTINCT user_id FROM activities) u
WHERE NOT EXISTS (
  SELECT 1 FROM activity_categories c
  WHERE c.user_id = u.user_id AND c.name = 'General'
);
