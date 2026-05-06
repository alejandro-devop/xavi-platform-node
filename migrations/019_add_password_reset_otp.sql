-- Migration: Add password reset OTP fields
-- Stores dedicated OTP metadata for forgot/reset password flow
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_code_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_reset_otp_last_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_code ON users(password_reset_code);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_otp_last_sent ON users(password_reset_otp_last_sent_at);

COMMENT ON COLUMN users.password_reset_code IS 'Base64-encoded OTP for password reset';
COMMENT ON COLUMN users.password_reset_code_expires_at IS 'Expiration timestamp for password reset OTP';
COMMENT ON COLUMN users.password_reset_otp_last_sent_at IS 'Timestamp of last password reset OTP send for rate limiting';
