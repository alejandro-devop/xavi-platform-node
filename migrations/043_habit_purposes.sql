-- Nueva tabla de propósitos de identidad
CREATE TABLE habit_purposes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(100),
  placement VARCHAR(10) NOT NULL DEFAULT 'pool'
    CHECK (placement IN ('pool', 'want', 'avoid')),
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_habit_purposes_user_id ON habit_purposes(user_id, placement);

-- Añadir referencia opcional a propósito en la tabla de hábitos
ALTER TABLE habits
  ADD COLUMN purpose_id INTEGER REFERENCES habit_purposes(id) ON DELETE SET NULL;

-- DOWN
-- ALTER TABLE habits DROP COLUMN IF EXISTS purpose_id;
-- DROP TABLE IF EXISTS habit_purposes;
