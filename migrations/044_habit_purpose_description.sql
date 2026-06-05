-- Añadir descripción opcional a propósitos de hábitos
ALTER TABLE habit_purposes
  ADD COLUMN IF NOT EXISTS description TEXT;

-- DOWN
-- ALTER TABLE habit_purposes DROP COLUMN IF EXISTS description;
