-- Learning knowledge notes with FTS (spanish) and dedicated tags

-- UP
CREATE TABLE IF NOT EXISTS learning_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(content_markdown, '')), 'B')
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_notes_user_id ON learning_notes(user_id);
CREATE INDEX idx_learning_notes_user_updated ON learning_notes(user_id, updated_at DESC);
CREATE INDEX idx_learning_notes_search_vector ON learning_notes USING GIN (search_vector);

CREATE TRIGGER update_learning_notes_updated_at
  BEFORE UPDATE ON learning_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS learning_tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_tags_user_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX idx_learning_tags_user_id ON learning_tags(user_id);
CREATE INDEX idx_learning_tags_user_name_lower ON learning_tags (user_id, LOWER(name));

CREATE TRIGGER update_learning_tags_updated_at
  BEFORE UPDATE ON learning_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS learning_note_tags (
  note_id UUID NOT NULL REFERENCES learning_notes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES learning_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_learning_note_tags_note_id ON learning_note_tags(note_id);
CREATE INDEX idx_learning_note_tags_tag_id ON learning_note_tags(tag_id);

-- DOWN
DROP TABLE IF EXISTS learning_note_tags;
DROP TABLE IF EXISTS learning_tags;
DROP TABLE IF EXISTS learning_notes;
