-- UP

ALTER TABLE sleep_logs
  ADD COLUMN IF NOT EXISTS activity_follow_up_id INTEGER
    REFERENCES activity_follow_ups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sleep_logs_activity_follow_up_id
  ON sleep_logs(activity_follow_up_id)
  WHERE activity_follow_up_id IS NOT NULL;

-- DOWN

-- DROP INDEX IF EXISTS idx_sleep_logs_activity_follow_up_id;
-- ALTER TABLE sleep_logs DROP COLUMN IF EXISTS activity_follow_up_id;
