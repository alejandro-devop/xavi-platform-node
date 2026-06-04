-- IMPORTANTE: Solo ejecutar post-deploy del código de Fase 3
-- Dropea las 4 columnas legacy que fueron reemplazadas por habit_type
ALTER TABLE habits
  DROP COLUMN IF EXISTS is_incremental,
  DROP COLUMN IF EXISTS is_decremental,
  DROP COLUMN IF EXISTS is_counter,
  DROP COLUMN IF EXISTS is_timer;

-- DOWN: re-add las 4 columnas con sus defaults originales
-- ALTER TABLE habits
--   ADD COLUMN IF NOT EXISTS is_counter    BOOLEAN NOT NULL DEFAULT TRUE,
--   ADD COLUMN IF NOT EXISTS is_timer      BOOLEAN NOT NULL DEFAULT FALSE,
--   ADD COLUMN IF NOT EXISTS is_incremental BOOLEAN NOT NULL DEFAULT FALSE,
--   ADD COLUMN IF NOT EXISTS is_decremental BOOLEAN NOT NULL DEFAULT FALSE;
