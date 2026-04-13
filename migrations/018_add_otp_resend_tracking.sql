-- Migration: Add OTP resend tracking
-- This migration adds a field to track when the last OTP was sent
-- to implement rate limiting for OTP resend requests

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMP;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_otp_last_sent ON users(otp_last_sent_at);

-- Add comment for documentation
COMMENT ON COLUMN users.otp_last_sent_at IS 'Timestamp of the last OTP send for rate limiting purposes';
