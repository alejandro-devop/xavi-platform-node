-- Migration: Change all IDs to UUID v7 (except users table)
-- DANGER: This is a destructive migration. Back up your data first!

-- Step 1: Drop existing foreign key constraints
ALTER TABLE wallet_expenses DROP CONSTRAINT IF EXISTS wallet_expenses_category_id_wallet_expense_categories_id_fk;

-- Step 2: Create temporary backup of wallet_expense_categories
CREATE TABLE wallet_expense_categories_backup AS SELECT * FROM wallet_expense_categories;

-- Step 3: Drop and recreate wallet_expense_categories with UUID
DROP TABLE IF EXISTS wallet_expense_categories CASCADE;

CREATE TABLE wallet_expense_categories (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  icon VARCHAR(50),
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_transaction BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 4: Update wallet_expenses table to use UUID for category_id
ALTER TABLE wallet_expenses 
  DROP COLUMN IF EXISTS category_id;

ALTER TABLE wallet_expenses 
  ADD COLUMN category_id UUID REFERENCES wallet_expense_categories(id) ON DELETE SET NULL;

-- Step 5: Add indexes
CREATE INDEX idx_wallet_expense_categories_user_id ON wallet_expense_categories(user_id);
CREATE INDEX idx_wallet_expense_categories_type ON wallet_expense_categories(type);
CREATE INDEX idx_wallet_expenses_category_id ON wallet_expenses(category_id);

-- Note: Data will need to be re-seeded with new UUID v7 values
-- The application will generate UUID v7 values using the uuidv7 library
