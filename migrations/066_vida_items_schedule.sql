-- UP

-- Vida: la plantilla pasa de "qué días" a agenda ("a esta hora, por tanto tiempo").
-- Ambas columnas son opcionales: los ítems existentes quedan en NULL.
ALTER TABLE vida_items
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE vida_items
  DROP CONSTRAINT IF EXISTS vida_items_duration_positive;

ALTER TABLE vida_items
  ADD CONSTRAINT vida_items_duration_positive
    CHECK (duration_minutes IS NULL OR duration_minutes > 0);

-- DOWN

-- ALTER TABLE vida_items DROP CONSTRAINT IF EXISTS vida_items_duration_positive;
-- ALTER TABLE vida_items DROP COLUMN IF EXISTS duration_minutes;
-- ALTER TABLE vida_items DROP COLUMN IF EXISTS start_time;
