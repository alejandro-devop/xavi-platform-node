-- UP

-- My Stand up: estado 'blocked' con motivo, para resaltar bloqueadores del equipo

ALTER TABLE standup_items
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

ALTER TABLE standup_items
  DROP CONSTRAINT IF EXISTS standup_items_status_check;

ALTER TABLE standup_items
  ADD CONSTRAINT standup_items_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked'));

-- DOWN

-- ALTER TABLE standup_items DROP CONSTRAINT IF EXISTS standup_items_status_check;
-- ALTER TABLE standup_items ADD CONSTRAINT standup_items_status_check CHECK (status IN ('pending', 'in_progress', 'completed'));
-- ALTER TABLE standup_items DROP COLUMN IF EXISTS blocked_reason;
