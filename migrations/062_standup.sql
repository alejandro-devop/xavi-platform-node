-- UP

-- My Stand up: catálogo de responsables, días abiertos/cerrados e ítems diarios

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS standup_todo_folder_id INTEGER REFERENCES todo_folders(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS standup_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT standup_members_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_standup_members_user_name_lower
  ON standup_members (user_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_standup_members_user_id ON standup_members(user_id);
CREATE INDEX IF NOT EXISTS idx_standup_members_user_active ON standup_members(user_id, is_active);

CREATE TRIGGER update_standup_members_updated_at BEFORE UPDATE ON standup_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS standup_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT standup_days_status_check CHECK (status IN ('open', 'closed')),
  CONSTRAINT standup_days_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_standup_days_user_date ON standup_days(user_id, date DESC);

CREATE TRIGGER update_standup_days_updated_at BEFORE UPDATE ON standup_days
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS standup_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES standup_days(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES standup_members(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  notes TEXT,
  ticket_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  backlog_started_on DATE NOT NULL,
  source_item_id UUID REFERENCES standup_items(id) ON DELETE SET NULL,
  linked_todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT standup_items_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT standup_items_status_check CHECK (status IN ('pending', 'in_progress', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_standup_items_day_id ON standup_items(day_id);
CREATE INDEX IF NOT EXISTS idx_standup_items_user_day ON standup_items(user_id, day_id);
CREATE INDEX IF NOT EXISTS idx_standup_items_member_id ON standup_items(member_id);
CREATE INDEX IF NOT EXISTS idx_standup_items_source_item_id ON standup_items(source_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_standup_items_day_source_unique
  ON standup_items(day_id, source_item_id)
  WHERE source_item_id IS NOT NULL;

CREATE TRIGGER update_standup_items_updated_at BEFORE UPDATE ON standup_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN

-- DROP TRIGGER IF EXISTS update_standup_items_updated_at ON standup_items;
-- DROP INDEX IF EXISTS idx_standup_items_day_source_unique;
-- DROP INDEX IF EXISTS idx_standup_items_source_item_id;
-- DROP INDEX IF EXISTS idx_standup_items_member_id;
-- DROP INDEX IF EXISTS idx_standup_items_user_day;
-- DROP INDEX IF EXISTS idx_standup_items_day_id;
-- DROP TABLE IF EXISTS standup_items;
-- DROP TRIGGER IF EXISTS update_standup_days_updated_at ON standup_days;
-- DROP INDEX IF EXISTS idx_standup_days_user_date;
-- DROP TABLE IF EXISTS standup_days;
-- DROP TRIGGER IF EXISTS update_standup_members_updated_at ON standup_members;
-- DROP INDEX IF EXISTS idx_standup_members_user_active;
-- DROP INDEX IF EXISTS idx_standup_members_user_id;
-- DROP INDEX IF EXISTS idx_standup_members_user_name_lower;
-- DROP TABLE IF EXISTS standup_members;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS standup_todo_folder_id;
