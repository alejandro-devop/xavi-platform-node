-- UP

-- Vida: plantilla semanal (actividad ↔ días, sin hora) + marcas "tomado hoy"

CREATE TABLE IF NOT EXISTS vida_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  days TEXT[] NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  client_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vida_items_days_not_empty CHECK (cardinality(days) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_vida_items_user_id ON vida_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vida_items_user_active ON vida_items(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vida_items_activity_id ON vida_items(activity_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vida_items_client_id
  ON vida_items(client_id)
  WHERE client_id IS NOT NULL;

CREATE TRIGGER update_vida_items_updated_at BEFORE UPDATE ON vida_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS vida_taken_today (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vida_item_id UUID NOT NULL REFERENCES vida_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, vida_item_id, date)
);

CREATE INDEX IF NOT EXISTS idx_vida_taken_today_user_date ON vida_taken_today(user_id, date);
CREATE INDEX IF NOT EXISTS idx_vida_taken_today_item ON vida_taken_today(vida_item_id);

-- DOWN

-- DROP INDEX IF EXISTS idx_vida_taken_today_item;
-- DROP INDEX IF EXISTS idx_vida_taken_today_user_date;
-- DROP TABLE IF EXISTS vida_taken_today;
-- DROP TRIGGER IF EXISTS update_vida_items_updated_at ON vida_items;
-- DROP INDEX IF EXISTS idx_vida_items_client_id;
-- DROP INDEX IF EXISTS idx_vida_items_activity_id;
-- DROP INDEX IF EXISTS idx_vida_items_user_active;
-- DROP INDEX IF EXISTS idx_vida_items_user_id;
-- DROP TABLE IF EXISTS vida_items;
