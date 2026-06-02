-- Fix case-sensitive unique constraint on todo_tags
-- Replace UNIQUE (user_id, name) with a functional index on LOWER(name)

ALTER TABLE todo_tags DROP CONSTRAINT todo_tags_user_name_unique;

CREATE UNIQUE INDEX todo_tags_user_name_lower_unique
  ON todo_tags (user_id, LOWER(name));
