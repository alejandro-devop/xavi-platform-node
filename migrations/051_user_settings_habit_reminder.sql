-- UP

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS habit_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS habit_reminder_time TIME;

-- DOWN

-- ALTER TABLE user_settings DROP COLUMN IF EXISTS habit_reminder_time;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS habit_reminder_enabled;
