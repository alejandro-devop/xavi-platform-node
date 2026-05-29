-- Manual sort order for todos within the same folder (or uncategorized bucket)

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_todos_user_folder_order
  ON todos(user_id, folder_id, order_index);
