-- UP

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS day_start_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_start_reminder_time TIME;

-- DOWN

-- ALTER TABLE user_settings DROP COLUMN IF EXISTS day_start_reminder_time;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS day_start_reminder_enabled;
