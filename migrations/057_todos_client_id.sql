-- UP

-- Idempotencia offline para captura rápida de tareas (pool/inbox de la app iOS).
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_client_id
  ON todos(client_id)
  WHERE client_id IS NOT NULL;

-- DOWN

-- DROP INDEX IF EXISTS idx_todos_client_id;
-- ALTER TABLE todos DROP COLUMN IF EXISTS client_id;
