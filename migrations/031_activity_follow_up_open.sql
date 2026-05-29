-- Open (in-progress) activity follow-ups for cross-device time tracking

ALTER TABLE activity_follow_ups
  ALTER COLUMN duration_minutes DROP NOT NULL;

ALTER TABLE activity_follow_ups
  DROP CONSTRAINT IF EXISTS activity_follow_ups_duration_minutes_check;

ALTER TABLE activity_follow_ups
  ADD CONSTRAINT activity_follow_ups_duration_minutes_check
  CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE activity_follow_ups
  ADD COLUMN IF NOT EXISTS linked_todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_follow_ups_linked_todo_id
  ON activity_follow_ups(linked_todo_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_follow_ups_one_open_per_user
  ON activity_follow_ups (user_id)
  WHERE duration_minutes IS NULL;
