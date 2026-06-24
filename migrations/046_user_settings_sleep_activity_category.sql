-- UP

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS sleep_activity_category_id UUID
    REFERENCES activity_categories(id) ON DELETE SET NULL;

-- DOWN

-- ALTER TABLE user_settings DROP COLUMN IF EXISTS sleep_activity_category_id;
