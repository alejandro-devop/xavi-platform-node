-- UP

-- Vida: los días de la semana en que una meta cuenta.
--
-- Forma copiada de `vida_items.days` (migración 058) y de `routines.days_of_week`
-- (008): TEXT[] con el mismo vocabulario que el enum VidaDayOfWeek del SDL, así
-- que no hay traducción en ningún borde y se lee en psql sin descifrar nada.
--
-- El DEFAULT de lunes a viernes hace dos cosas a la vez, y las dos importan:
--   1. Rellena las filas que ya existen en producción en este mismo ALTER TABLE
--      (Postgres >= 11 no reescribe la tabla): la meta «Trabajo» ya creada
--      amanece con L-V marcados y nadie se queda sin arco el lunes siguiente.
--      No hace falta UPDATE de relleno ni despliegue en dos pasos.
--   2. Se queda en el esquema: `ensureDefaultGoal()` no lista esta columna en su
--      INSERT y sigue creando metas correctas sin tocar ese upsert.
ALTER TABLE vida_goals
  ADD COLUMN IF NOT EXISTS active_days TEXT[] NOT NULL
  DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday']::TEXT[];

-- Una meta con cero días es un arco que desaparece para siempre sin que nada lo
-- explique. Para quitar el arco ya existe el camino bueno: desapuntar la
-- categoría. El CHECK va en su propio ALTER para que el DOWN pueda quitarlo suelto.
ALTER TABLE vida_goals
  ADD CONSTRAINT vida_goals_active_days_not_empty CHECK (cardinality(active_days) >= 1);

-- DOWN

-- ALTER TABLE vida_goals DROP CONSTRAINT IF EXISTS vida_goals_active_days_not_empty;
-- ALTER TABLE vida_goals DROP COLUMN IF EXISTS active_days;
