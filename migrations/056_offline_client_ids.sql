-- UP

-- Idempotencia offline: client_id UUID v7 opcional en tablas de escritura diaria (SERIAL PK).
ALTER TABLE habit_logs
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_client_id
  ON habit_logs(client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE activity_follow_ups
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_follow_ups_client_id
  ON activity_follow_ups(client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE activity_day_plan_items
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_day_plan_items_client_id
  ON activity_day_plan_items(client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE activity_subtasks
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_subtasks_client_id
  ON activity_subtasks(client_id)
  WHERE client_id IS NOT NULL;

-- DOWN

-- DROP INDEX IF EXISTS idx_activity_subtasks_client_id;
-- ALTER TABLE activity_subtasks DROP COLUMN IF EXISTS client_id;
-- DROP INDEX IF EXISTS idx_activity_day_plan_items_client_id;
-- ALTER TABLE activity_day_plan_items DROP COLUMN IF EXISTS client_id;
-- DROP INDEX IF EXISTS idx_activity_follow_ups_client_id;
-- ALTER TABLE activity_follow_ups DROP COLUMN IF EXISTS client_id;
-- DROP INDEX IF EXISTS idx_habit_logs_client_id;
-- ALTER TABLE habit_logs DROP COLUMN IF EXISTS client_id;
