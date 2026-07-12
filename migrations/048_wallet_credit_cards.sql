-- UP

CREATE TABLE wallet_credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_debt DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cutoff_day SMALLINT NOT NULL CHECK (cutoff_day >= 1 AND cutoff_day <= 31),
  payment_day SMALLINT NOT NULL CHECK (payment_day >= 1 AND payment_day <= 31),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_credit_cards_user_id ON wallet_credit_cards(user_id);

CREATE TABLE wallet_credit_card_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES wallet_credit_cards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES wallet_expense_categories(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_credit_card_charges_user_id ON wallet_credit_card_charges(user_id);
CREATE INDEX idx_wallet_credit_card_charges_card_id ON wallet_credit_card_charges(credit_card_id);
CREATE INDEX idx_wallet_credit_card_charges_date ON wallet_credit_card_charges(date);

CREATE TABLE wallet_credit_card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES wallet_credit_cards(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES wallet_expenses(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  paid_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_credit_card_payments_card_id ON wallet_credit_card_payments(credit_card_id);

CREATE TABLE wallet_user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credit_card_payment_category_id UUID REFERENCES wallet_expense_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- DOWN

-- DROP TABLE IF EXISTS wallet_user_settings;
-- DROP TABLE IF EXISTS wallet_credit_card_payments;
-- DROP TABLE IF EXISTS wallet_credit_card_charges;
-- DROP TABLE IF EXISTS wallet_credit_cards;
