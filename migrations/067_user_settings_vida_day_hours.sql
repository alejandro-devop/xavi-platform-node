-- UP

-- Vida: horario del día (inicio y fin) para pintar la agenda de la plantilla.
-- Nulos por defecto; el cliente cae a 06:30 y 23:00 mientras no se configuren.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS vida_day_start_time TIME,
  ADD COLUMN IF NOT EXISTS vida_day_end_time   TIME;

-- DOWN

-- ALTER TABLE user_settings DROP COLUMN IF EXISTS vida_day_end_time;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS vida_day_start_time;
