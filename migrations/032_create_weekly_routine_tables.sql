-- Weekly routines: agenda-style weekly schedule templates linked to activities

CREATE TABLE IF NOT EXISTS weekly_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_day VARCHAR(10) NOT NULL DEFAULT 'monday'
    CHECK (start_day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weekly_routines_user_id ON weekly_routines(user_id);
CREATE INDEX idx_weekly_routines_is_active ON weekly_routines(user_id, is_active);

CREATE TRIGGER update_weekly_routines_updated_at
  BEFORE UPDATE ON weekly_routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Individual activity slots within a weekly routine
CREATE TABLE IF NOT EXISTS weekly_routine_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  routine_id UUID NOT NULL REFERENCES weekly_routines(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL
    CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weekly_routine_activities_routine_id ON weekly_routine_activities(routine_id);
CREATE INDEX idx_weekly_routine_activities_activity_id ON weekly_routine_activities(activity_id);
CREATE INDEX idx_weekly_routine_activities_day ON weekly_routine_activities(routine_id, day_of_week);

CREATE TRIGGER update_weekly_routine_activities_updated_at
  BEFORE UPDATE ON weekly_routine_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
