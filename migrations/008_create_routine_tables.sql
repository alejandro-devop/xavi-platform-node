-- Create routines table
CREATE TABLE IF NOT EXISTS routines (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  days_of_week TEXT[] NOT NULL DEFAULT '{}',
  time_of_day VARCHAR(50) CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'anytime')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create routine_steps table
CREATE TABLE IF NOT EXISTS routine_steps (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_is_active ON routines(is_active);
CREATE INDEX idx_routines_time_of_day ON routines(time_of_day);
CREATE INDEX idx_routines_days_of_week ON routines USING GIN(days_of_week);

CREATE INDEX idx_routine_steps_routine_id ON routine_steps(routine_id);
CREATE INDEX idx_routine_steps_order_index ON routine_steps(order_index);

-- Create updated_at trigger for routines
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for routine_steps
CREATE TRIGGER update_routine_steps_updated_at
  BEFORE UPDATE ON routine_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
