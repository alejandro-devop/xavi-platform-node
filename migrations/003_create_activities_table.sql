-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scheduled_date ON activities(scheduled_date);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- Create updated_at trigger
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
