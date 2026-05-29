-- Todo tags (per user) and many-to-many assignments on todos

CREATE TABLE IF NOT EXISTS todo_tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT todo_tags_user_name_unique UNIQUE (user_id, name),
  CONSTRAINT todo_tags_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX idx_todo_tags_user_id ON todo_tags(user_id);

CREATE TRIGGER update_todo_tags_updated_at
  BEFORE UPDATE ON todo_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS todo_tag_assignments (
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES todo_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (todo_id, tag_id)
);

CREATE INDEX idx_todo_tag_assignments_tag_id ON todo_tag_assignments(tag_id);
