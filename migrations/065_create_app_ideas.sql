-- App ideas: markdown notes for product/app concepts with FTS (spanish)

-- UP
CREATE TABLE IF NOT EXISTS app_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'exploring', 'building', 'shipped', 'archived')),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(content_markdown, '')), 'B')
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_ideas_user_id ON app_ideas(user_id);
CREATE INDEX idx_app_ideas_user_updated ON app_ideas(user_id, updated_at DESC);
CREATE INDEX idx_app_ideas_user_status ON app_ideas(user_id, status);
CREATE INDEX idx_app_ideas_search_vector ON app_ideas USING GIN (search_vector);

CREATE TRIGGER update_app_ideas_updated_at
  BEFORE UPDATE ON app_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- DOWN
DROP TRIGGER IF EXISTS update_app_ideas_updated_at ON app_ideas;
DROP TABLE IF EXISTS app_ideas;
