-- Create learning_resources table
CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('article', 'video', 'book', 'course', 'podcast', 'tutorial', 'other')),
  url TEXT,
  category VARCHAR(100),
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'archived')),
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create learning_progress table
CREATE TABLE IF NOT EXISTS learning_progress (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  session_date TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_learning_resources_user_id ON learning_resources(user_id);
CREATE INDEX idx_learning_resources_resource_type ON learning_resources(resource_type);
CREATE INDEX idx_learning_resources_status ON learning_resources(status);
CREATE INDEX idx_learning_resources_priority ON learning_resources(priority);
CREATE INDEX idx_learning_resources_category ON learning_resources(category);

CREATE INDEX idx_learning_progress_resource_id ON learning_progress(resource_id);
CREATE INDEX idx_learning_progress_session_date ON learning_progress(session_date);

-- Create updated_at trigger for learning_resources
CREATE TRIGGER update_learning_resources_updated_at
  BEFORE UPDATE ON learning_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for learning_progress
CREATE TRIGGER update_learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
