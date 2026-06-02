-- Weekly schedule slots for quarters: plan which projects to work each day of the week

CREATE TABLE IF NOT EXISTS week_schedule_slots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  quarter_id   UUID    NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  project_id   UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  VARCHAR(10) NOT NULL
    CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  start_time   TIME,
  hours        NUMERIC(4,1) NOT NULL DEFAULT 1 CHECK (hours > 0),
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_week_schedule_slots_quarter_id ON week_schedule_slots(quarter_id);
CREATE INDEX idx_week_schedule_slots_project_id ON week_schedule_slots(project_id);
CREATE INDEX idx_week_schedule_slots_day ON week_schedule_slots(quarter_id, day_of_week);

CREATE TRIGGER update_week_schedule_slots_updated_at
  BEFORE UPDATE ON week_schedule_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
