-- UP

-- Plan del día: actividades agendadas para una fecha con rango horario
CREATE TABLE IF NOT EXISTS activity_day_plan_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, activity_id, date)
);

CREATE INDEX IF NOT EXISTS idx_activity_day_plan_items_user_date ON activity_day_plan_items(user_id, date);

CREATE TRIGGER update_activity_day_plan_items_updated_at BEFORE UPDATE ON activity_day_plan_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN

-- DROP TRIGGER IF EXISTS update_activity_day_plan_items_updated_at ON activity_day_plan_items;
-- DROP TABLE IF EXISTS activity_day_plan_items;
