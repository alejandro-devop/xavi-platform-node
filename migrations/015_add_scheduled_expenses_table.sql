-- UP
-- Migration: add_scheduled_expenses_table
-- Description: Creates wallet_scheduled_expenses table with support for recurring expenses

-- Drop old table if it exists (to ensure correct schema)
DROP TABLE IF EXISTS wallet_scheduled_expenses CASCADE;

-- Create wallet_scheduled_expenses table
CREATE TABLE wallet_scheduled_expenses (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallet_wallets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES wallet_expense_categories(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES wallet_budgets(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES wallet_scheduled_expenses(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES wallet_expenses(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date TIMESTAMP,
  repeat_type VARCHAR(20), -- 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  end_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_scheduled_expenses_user_id ON wallet_scheduled_expenses(user_id);
CREATE INDEX idx_scheduled_expenses_wallet_id ON wallet_scheduled_expenses(wallet_id);
CREATE INDEX idx_scheduled_expenses_category_id ON wallet_scheduled_expenses(category_id);
CREATE INDEX idx_scheduled_expenses_budget_id ON wallet_scheduled_expenses(budget_id);
CREATE INDEX idx_scheduled_expenses_parent_id ON wallet_scheduled_expenses(parent_id);
CREATE INDEX idx_scheduled_expenses_expense_id ON wallet_scheduled_expenses(expense_id);
CREATE INDEX idx_scheduled_expenses_is_paid ON wallet_scheduled_expenses(is_paid);
CREATE INDEX idx_scheduled_expenses_due_date ON wallet_scheduled_expenses(due_date);

-- Add updated_at trigger
CREATE TRIGGER update_scheduled_expenses_updated_at 
  BEFORE UPDATE ON wallet_scheduled_expenses
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- DOWN

-- Drop the table and all its indexes (CASCADE will handle it)
DROP TABLE IF EXISTS wallet_scheduled_expenses CASCADE;


