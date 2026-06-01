ALTER TABLE todos ADD COLUMN IF NOT EXISTS selected_today BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_todos_selected_today ON todos(user_id, selected_today);

-- DOWN
DROP INDEX IF EXISTS idx_todos_selected_today;
ALTER TABLE todos DROP COLUMN IF EXISTS selected_today;
