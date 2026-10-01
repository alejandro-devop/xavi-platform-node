-- UP

-- Vida: el Pomodoro. La configuración vive en los ajustes de la cuenta como un
-- único JSONB porque el cliente siempre la lee y la escribe entera
-- (enabled, categoryIds, workMinutes, breakMinutes, longBreakMinutes,
-- longBreakEvery). La forma la valida Zod en la API, no la base.
--
-- Nulo por defecto: mientras nadie configure su Pomodoro, el cliente no lo
-- ofrece.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS vida_pomodoro JSONB;

-- Cuántos bloques de trabajo y cuántos descansos tuvo cada sesión. Nulos:
-- las sesiones viejas, o las que no usaron Pomodoro, no tienen el dato, y eso
-- es distinto de «cero bloques».
ALTER TABLE activity_follow_ups
  ADD COLUMN IF NOT EXISTS pomodoro_blocks INTEGER
    CHECK (pomodoro_blocks IS NULL OR pomodoro_blocks >= 0),
  ADD COLUMN IF NOT EXISTS pomodoro_breaks INTEGER
    CHECK (pomodoro_breaks IS NULL OR pomodoro_breaks >= 0);

-- DOWN

-- ALTER TABLE activity_follow_ups DROP COLUMN IF EXISTS pomodoro_breaks;
-- ALTER TABLE activity_follow_ups DROP COLUMN IF EXISTS pomodoro_blocks;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS vida_pomodoro;
