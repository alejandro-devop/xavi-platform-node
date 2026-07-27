-- UP

-- Housework: Activity canónica para el wizard de organizar la casa
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS housework_activity_id INTEGER
    REFERENCES activities(id) ON DELETE SET NULL;

-- DOWN

-- ALTER TABLE user_settings DROP COLUMN IF EXISTS housework_activity_id;
