-- UP

-- Vida: metas con minutos objetivo. Una categoría apunta a una meta (goal_id);
-- varias categorías pueden apuntar a la misma.
--
-- La identidad de la meta es el `slug`, no el nombre: el día que exista la
-- pantalla de editar y el usuario renombre «Trabajo» a «Curro», un `ensure` por
-- nombre crearía una segunda fila; por slug, no. Y es el índice único
-- (user_id, slug) el que hace atómica la creación automática: el servicio
-- inserta con ON CONFLICT ... DO UPDATE ... RETURNING *, así que dos toques a
-- la vez no pueden dejar dos metas «Trabajo».
CREATE TABLE IF NOT EXISTS vida_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  color VARCHAR(255),
  target_minutes INTEGER NOT NULL
    CHECK (target_minutes > 0 AND target_minutes <= 1440),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vida_goals_user_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_vida_goals_user_id ON vida_goals(user_id);

CREATE TRIGGER update_vida_goals_updated_at BEFORE UPDATE ON vida_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Puntero nullable: nadie tiene metas todavía, así que goal_id nace NULL para
-- todos y no hace falta ningún UPDATE de relleno. ON DELETE SET NULL (y no
-- CASCADE): borrar una meta desapunta categorías, nunca las borra.
ALTER TABLE activity_categories
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES vida_goals(id) ON DELETE SET NULL;

-- Índice parcial: la inmensa mayoría de las filas tendrán goal_id a NULL.
CREATE INDEX IF NOT EXISTS idx_activity_categories_goal_id
  ON activity_categories(goal_id) WHERE goal_id IS NOT NULL;

-- DOWN

-- DROP INDEX IF EXISTS idx_activity_categories_goal_id;
-- ALTER TABLE activity_categories DROP COLUMN IF EXISTS goal_id;
-- DROP TRIGGER IF EXISTS update_vida_goals_updated_at ON vida_goals;
-- DROP INDEX IF EXISTS idx_vida_goals_user_id;
-- DROP TABLE IF EXISTS vida_goals;
