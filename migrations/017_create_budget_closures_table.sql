-- ============================================
-- MIGRATION 017: CREATE BUDGET CLOSURES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_budget_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  budget_id UUID NOT NULL REFERENCES wallet_budgets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_amount DECIMAL(15, 2) NOT NULL,
  spent_amount DECIMAL(15, 2) NOT NULL,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  overspent_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  expenses_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  closed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_budget_closures_budget_id
  ON wallet_budget_closures(budget_id);

CREATE INDEX IF NOT EXISTS idx_wallet_budget_closures_user_id
  ON wallet_budget_closures(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_budget_closures_period
  ON wallet_budget_closures(budget_id, period_start, period_end);
