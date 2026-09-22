-- UP

-- Vida: la noche. Dormir no es una actividad que se mete entre otras, es el
-- borde del día, así que vive en los ajustes y no en vida_items.
--
-- **No se valida que despertar sea posterior a acostarse, y es a propósito.**
-- «23:00 → 05:00» cruza la medianoche y «01:00 → 06:40» no la cruza: las dos
-- son noches legales. Cualquier CHECK de orden aquí rompería una de las dos.
--
-- Nulos por defecto: mientras nadie configure su noche, el cliente no pinta
-- ninguna franja.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS vida_night_bed_time  TIME,
  ADD COLUMN IF NOT EXISTS vida_night_wake_time TIME,
  ADD COLUMN IF NOT EXISTS vida_night_days      TEXT[];

-- DOWN

-- ALTER TABLE user_settings DROP COLUMN IF EXISTS vida_night_days;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS vida_night_wake_time;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS vida_night_bed_time;
