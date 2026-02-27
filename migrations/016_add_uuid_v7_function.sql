-- UP
-- Migration: add_uuid_v7_function
-- Description: Creates uuid_generate_v7() function for time-ordered UUIDs

-- Enable pgcrypto extension for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create UUID v7 generation function
-- UUID v7 spec: https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID
AS $$
DECLARE
  unix_ts_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  -- Get current Unix timestamp in milliseconds
  unix_ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  
  -- Generate 16 random bytes
  uuid_bytes := gen_random_bytes(16);
  
  -- Set the timestamp (first 48 bits = 6 bytes)
  uuid_bytes := SET_BYTE(uuid_bytes, 0, ((unix_ts_ms >> 40) & 255)::INT);
  uuid_bytes := SET_BYTE(uuid_bytes, 1, ((unix_ts_ms >> 32) & 255)::INT);
  uuid_bytes := SET_BYTE(uuid_bytes, 2, ((unix_ts_ms >> 24) & 255)::INT);
  uuid_bytes := SET_BYTE(uuid_bytes, 3, ((unix_ts_ms >> 16) & 255)::INT);
  uuid_bytes := SET_BYTE(uuid_bytes, 4, ((unix_ts_ms >> 8) & 255)::INT);
  uuid_bytes := SET_BYTE(uuid_bytes, 5, (unix_ts_ms & 255)::INT);
  
  -- Set version (7) and variant bits
  uuid_bytes := SET_BYTE(uuid_bytes, 6, (GET_BYTE(uuid_bytes, 6) & 15) | 112); -- Version 7 = 0111xxxx
  uuid_bytes := SET_BYTE(uuid_bytes, 8, (GET_BYTE(uuid_bytes, 8) & 63) | 128); -- Variant = 10xxxxxx
  
  RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Update existing tables to use uuid_generate_v7()
ALTER TABLE wallet_wallets ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE wallet_expenses ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE wallet_budgets ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE wallet_scheduled_expenses ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- Note: wallet_expense_categories doesn't have a DEFAULT because it was created before
-- If needed, add: ALTER TABLE wallet_expense_categories ALTER COLUMN id SET DEFAULT uuid_generate_v7();

COMMENT ON FUNCTION uuid_generate_v7 IS 'Generates time-ordered UUID v7 (sortable by creation time)';


-- DOWN

-- Remove uuid_generate_v7 DEFAULT from tables
ALTER TABLE wallet_wallets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE wallet_expenses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE wallet_budgets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE wallet_scheduled_expenses ALTER COLUMN id DROP DEFAULT;

-- Drop the function
DROP FUNCTION IF EXISTS uuid_generate_v7();
