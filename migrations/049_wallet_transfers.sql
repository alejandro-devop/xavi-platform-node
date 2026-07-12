-- UP

CREATE TABLE wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_wallet_id UUID NOT NULL REFERENCES wallet_wallets(id) ON DELETE CASCADE,
  to_wallet_id UUID NOT NULL REFERENCES wallet_wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_transfers_different_wallets CHECK (from_wallet_id <> to_wallet_id)
);

CREATE INDEX idx_wallet_transfers_user_id ON wallet_transfers(user_id);
CREATE INDEX idx_wallet_transfers_date ON wallet_transfers(date);

ALTER TABLE wallet_expenses
  ADD COLUMN transfer_id UUID REFERENCES wallet_transfers(id) ON DELETE CASCADE;

CREATE INDEX idx_wallet_expenses_transfer_id ON wallet_expenses(transfer_id);

-- DOWN

DROP INDEX IF EXISTS idx_wallet_expenses_transfer_id;
ALTER TABLE wallet_expenses DROP COLUMN IF EXISTS transfer_id;
DROP INDEX IF EXISTS idx_wallet_transfers_date;
DROP INDEX IF EXISTS idx_wallet_transfers_user_id;
DROP TABLE IF EXISTS wallet_transfers;
