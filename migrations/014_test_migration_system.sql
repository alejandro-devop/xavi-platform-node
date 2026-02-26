-- UP
-- Migration: test_migration_system
-- This is a TEST migration to validate the migration system
-- Will be rolled back immediately after testing

-- Create a simple test table
CREATE TABLE IF NOT EXISTS test_migrations_verification (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert a test record
INSERT INTO test_migrations_verification (test_name) 
VALUES ('Migration system test');


-- DOWN

-- Remove test table
DROP TABLE IF EXISTS test_migrations_verification;

