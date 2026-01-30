-- Create sleep_logs table
CREATE TABLE IF NOT EXISTS sleep_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_date DATE NOT NULL,
  bedtime TIMESTAMP NOT NULL,
  wake_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  quality VARCHAR(50) CHECK (quality IN ('poor', 'fair', 'good', 'excellent')),
  mood_on_waking VARCHAR(50) CHECK (mood_on_waking IN ('tired', 'groggy', 'refreshed', 'energized')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, sleep_date)
);

-- Create indexes
CREATE INDEX idx_sleep_logs_user_id ON sleep_logs(user_id);
CREATE INDEX idx_sleep_logs_sleep_date ON sleep_logs(sleep_date);
CREATE INDEX idx_sleep_logs_quality ON sleep_logs(quality);

-- Create updated_at trigger for sleep_logs
CREATE TRIGGER update_sleep_logs_updated_at
  BEFORE UPDATE ON sleep_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
