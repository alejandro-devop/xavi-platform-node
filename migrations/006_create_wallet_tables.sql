-- Create wallet_accounts table
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'savings', 'investment', 'other')),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  color VARCHAR(7),
  icon VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create wallet_categories table
CREATE TABLE IF NOT EXISTS wallet_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
  color VARCHAR(7),
  icon VARCHAR(50),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES wallet_categories(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wallet_accounts_user_id ON wallet_accounts(user_id);
CREATE INDEX idx_wallet_accounts_is_active ON wallet_accounts(is_active);

CREATE INDEX idx_wallet_categories_user_id ON wallet_categories(user_id);
CREATE INDEX idx_wallet_categories_type ON wallet_categories(type);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_account_id ON wallet_transactions(account_id);
CREATE INDEX idx_wallet_transactions_category_id ON wallet_transactions(category_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_date ON wallet_transactions(transaction_date);

-- Create updated_at trigger for wallet_accounts
CREATE TRIGGER update_wallet_accounts_updated_at
  BEFORE UPDATE ON wallet_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for wallet_categories
CREATE TRIGGER update_wallet_categories_updated_at
  BEFORE UPDATE ON wallet_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for wallet_transactions
CREATE TRIGGER update_wallet_transactions_updated_at
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories
INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Food & Dining', 'expense', '🍔', '#FF6B6B', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Transportation', 'expense', '🚗', '#4ECDC4', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Shopping', 'expense', '🛒', '#95E1D3', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Entertainment', 'expense', '🎮', '#F38181', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Bills & Utilities', 'expense', '📄', '#AA96DA', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Health', 'expense', '🏥', '#FCBAD3', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

-- Insert default income categories
INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Salary', 'income', '💰', '#6BCF7F', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Business', 'income', '💼', '#4D96FF', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Investment', 'income', '📈', '#FFB830', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO wallet_categories (user_id, name, type, icon, color, is_system)
SELECT id, 'Other Income', 'income', '💵', '#20BF55', true FROM users
ON CONFLICT (user_id, name, type) DO NOTHING;
