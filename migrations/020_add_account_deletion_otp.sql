-- Migration: Add account deletion OTP fields
-- Supports secure two-step account deletion flow with OTP confirmation.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_pending_deletion BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_deletion_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_deletion_code_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS account_deletion_otp_last_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_is_pending_deletion ON users(is_pending_deletion);
CREATE INDEX IF NOT EXISTS idx_users_account_deletion_code ON users(account_deletion_code);
CREATE INDEX IF NOT EXISTS idx_users_account_deletion_otp_last_sent
  ON users(account_deletion_otp_last_sent_at);

COMMENT ON COLUMN users.is_pending_deletion IS 'Marks user account as pending deletion confirmation';
COMMENT ON COLUMN users.account_deletion_code IS 'Base64-encoded OTP for account deletion confirmation';
COMMENT ON COLUMN users.account_deletion_code_expires_at IS 'Expiration timestamp for account deletion OTP';
COMMENT ON COLUMN users.account_deletion_otp_last_sent_at IS 'Timestamp of last account deletion OTP send';
