-- UP

-- Subtareas de una actividad (espejo de todo_subtasks)
CREATE TABLE IF NOT EXISTS activity_subtasks (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_subtasks_activity_id ON activity_subtasks(activity_id);

CREATE TRIGGER update_activity_subtasks_updated_at BEFORE UPDATE ON activity_subtasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN

-- DROP TRIGGER IF EXISTS update_activity_subtasks_updated_at ON activity_subtasks;
-- DROP TABLE IF EXISTS activity_subtasks;
