-- Migration 012: Create Advanced Wallet System (GraphQL Support)
-- Adds: wallets, expenses, scheduled_expenses, budgets, frequencies, periods

-- ============================================
-- 1. WALLET_WALLETS (Main wallet entity)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_wallets_user_id ON wallet_wallets(user_id);
CREATE INDEX idx_wallet_wallets_is_main ON wallet_wallets(is_main);

-- ============================================
-- 2. WALLET_EXPENSE_CATEGORIES (Enhanced)
-- ============================================
-- Rename wallet_categories to wallet_expense_categories for clarity
ALTER TABLE wallet_categories RENAME TO wallet_expense_categories;

-- Add missing columns
ALTER TABLE wallet_expense_categories 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_transaction BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 3. WALLET_FREQUENCIES (Recurrence patterns)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_frequencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency_type VARCHAR(50) NOT NULL CHECK (frequency_type IN ('Daily', 'Weekly', 'Monthly', 'Yearly')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_wallet_frequencies_user_id ON wallet_frequencies(user_id);
CREATE INDEX idx_wallet_frequencies_type ON wallet_frequencies(frequency_type);

-- Insert default frequencies for existing users
INSERT INTO wallet_frequencies (user_id, name, description, frequency_type)
SELECT id, 'Daily', 'Repeat every day', 'Daily' FROM users
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO wallet_frequencies (user_id, name, description, frequency_type)
SELECT id, 'Weekly', 'Repeat every week', 'Weekly' FROM users
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO wallet_frequencies (user_id, name, description, frequency_type)
SELECT id, 'Monthly', 'Repeat every month', 'Monthly' FROM users
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO wallet_frequencies (user_id, name, description, frequency_type)
SELECT id, 'Yearly', 'Repeat every year', 'Yearly' FROM users
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================
-- 4. WALLET_PERIODS (Time periods for budgets)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_period_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_wallet_periods_user_id ON wallet_periods(user_id);
CREATE INDEX idx_wallet_periods_dates ON wallet_periods(start_date, end_date);

-- ============================================
-- 5. WALLET_BUDGETS (Budget management)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallet_wallets(id) ON DELETE CASCADE,
  frequency_id UUID REFERENCES wallet_frequencies(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  amount DECIMAL(15, 2) NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_budget_dates CHECK (end_date >= start_date),
  CONSTRAINT check_budget_amount CHECK (amount > 0)
);

CREATE INDEX idx_wallet_budgets_user_id ON wallet_budgets(user_id);
CREATE INDEX idx_wallet_budgets_wallet_id ON wallet_budgets(wallet_id);
CREATE INDEX idx_wallet_budgets_is_active ON wallet_budgets(is_active);
CREATE INDEX idx_wallet_budgets_dates ON wallet_budgets(start_date, end_date);

-- ============================================
-- 6. WALLET_BUDGET_FOLLOW_UPS (Budget closure tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_budget_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES wallet_budgets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT,
  closure_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_budget_follow_ups_budget_id ON wallet_budget_follow_ups(budget_id);
CREATE INDEX idx_wallet_budget_follow_ups_user_id ON wallet_budget_follow_ups(user_id);

-- ============================================
-- 7. WALLET_EXPENSES (Individual expenses)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallet_wallets(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES wallet_expense_categories(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES wallet_budgets(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_income BOOLEAN NOT NULL DEFAULT false,
  is_outcome BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_expense_debit_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

CREATE INDEX idx_wallet_expenses_user_id ON wallet_expenses(user_id);
CREATE INDEX idx_wallet_expenses_wallet_id ON wallet_expenses(wallet_id);
CREATE INDEX idx_wallet_expenses_category_id ON wallet_expenses(category_id);
CREATE INDEX idx_wallet_expenses_budget_id ON wallet_expenses(budget_id);
CREATE INDEX idx_wallet_expenses_date ON wallet_expenses(date);
CREATE INDEX idx_wallet_expenses_is_income ON wallet_expenses(is_income);
CREATE INDEX idx_wallet_expenses_is_outcome ON wallet_expenses(is_outcome);

-- ============================================
-- 8. WALLET_SCHEDULED_EXPENSES (Scheduled/recurring expenses)
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_scheduled_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallet_wallets(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES wallet_expense_categories(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES wallet_budgets(id) ON DELETE SET NULL,
  frequency_id UUID REFERENCES wallet_frequencies(id) ON DELETE SET NULL,
  
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  
  -- Auto-generation fields (ADVANCED FEATURE)
  parent_id UUID REFERENCES wallet_scheduled_expenses(id) ON DELETE CASCADE,
  
  -- Payment tracking (ADVANCED FEATURE)
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date TIMESTAMP,
  expense_id UUID REFERENCES wallet_expenses(id) ON DELETE SET NULL,
  
  is_income BOOLEAN NOT NULL DEFAULT false,
  is_outcome BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_scheduled_amount CHECK (amount > 0)
);

CREATE INDEX idx_wallet_scheduled_user_id ON wallet_scheduled_expenses(user_id);
CREATE INDEX idx_wallet_scheduled_wallet_id ON wallet_scheduled_expenses(wallet_id);
CREATE INDEX idx_wallet_scheduled_category_id ON wallet_scheduled_expenses(category_id);
CREATE INDEX idx_wallet_scheduled_budget_id ON wallet_scheduled_expenses(budget_id);
CREATE INDEX idx_wallet_scheduled_frequency_id ON wallet_scheduled_expenses(frequency_id);
CREATE INDEX idx_wallet_scheduled_parent_id ON wallet_scheduled_expenses(parent_id);
CREATE INDEX idx_wallet_scheduled_is_paid ON wallet_scheduled_expenses(is_paid);
CREATE INDEX idx_wallet_scheduled_expense_id ON wallet_scheduled_expenses(expense_id);
CREATE INDEX idx_wallet_scheduled_date ON wallet_scheduled_expenses(date);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================

CREATE TRIGGER update_wallet_wallets_updated_at
  BEFORE UPDATE ON wallet_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_frequencies_updated_at
  BEFORE UPDATE ON wallet_frequencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_periods_updated_at
  BEFORE UPDATE ON wallet_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_budgets_updated_at
  BEFORE UPDATE ON wallet_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_budget_follow_ups_updated_at
  BEFORE UPDATE ON wallet_budget_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_expenses_updated_at
  BEFORE UPDATE ON wallet_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_scheduled_expenses_updated_at
  BEFORE UPDATE ON wallet_scheduled_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
