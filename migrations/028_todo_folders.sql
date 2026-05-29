-- Todo folders: one optional folder per task (grouping)

CREATE TABLE IF NOT EXISTS todo_folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT todo_folders_user_name_unique UNIQUE (user_id, name),
  CONSTRAINT todo_folders_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX idx_todo_folders_user_id ON todo_folders(user_id);

CREATE TRIGGER update_todo_folders_updated_at
  BEFORE UPDATE ON todo_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES todo_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_todos_folder_id ON todos(folder_id);
