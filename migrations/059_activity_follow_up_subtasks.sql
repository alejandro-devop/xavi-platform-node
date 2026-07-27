-- UP

-- Subtareas seleccionadas para una ejecución (follow-up) concreta.
-- El progreso es de la sesión; no muta activity_subtasks de la plantilla.
CREATE TABLE IF NOT EXISTS activity_follow_up_subtasks (
  id SERIAL PRIMARY KEY,
  follow_up_id INTEGER NOT NULL REFERENCES activity_follow_ups(id) ON DELETE CASCADE,
  activity_subtask_id INTEGER REFERENCES activity_subtasks(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_afu_subtasks_follow_up_id
  ON activity_follow_up_subtasks(follow_up_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_afu_subtasks_follow_up_activity_subtask
  ON activity_follow_up_subtasks(follow_up_id, activity_subtask_id)
  WHERE activity_subtask_id IS NOT NULL;

CREATE TRIGGER update_activity_follow_up_subtasks_updated_at
  BEFORE UPDATE ON activity_follow_up_subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN

-- DROP TRIGGER IF EXISTS update_activity_follow_up_subtasks_updated_at ON activity_follow_up_subtasks;
-- DROP INDEX IF EXISTS uq_afu_subtasks_follow_up_activity_subtask;
-- DROP INDEX IF EXISTS idx_afu_subtasks_follow_up_id;
-- DROP TABLE IF EXISTS activity_follow_up_subtasks;
