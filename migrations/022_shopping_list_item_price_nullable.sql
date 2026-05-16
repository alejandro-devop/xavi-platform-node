-- Optional line price on shopping lists (use catalog price or leave unset)
ALTER TABLE shopping_list_items
  ALTER COLUMN price DROP NOT NULL;
