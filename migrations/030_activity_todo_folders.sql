-- Link activities to todo folders (notebooks) for task pool on time tracking start

CREATE TABLE IF NOT EXISTS activity_todo_folders (
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  folder_id INTEGER NOT NULL REFERENCES todo_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_todo_folders_folder_id ON activity_todo_folders(folder_id);
