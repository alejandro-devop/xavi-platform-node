#!/bin/bash

# Script to update existing migrations table to support the new batch system
# Run this ONCE if you're upgrading from the old migration system

echo "🔄 Updating migrations table schema..."
echo "This script will add the 'batch' column to your existing migrations table."
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Check if we're using Docker or local PostgreSQL
read -p "Are you using Docker? (y/n): " use_docker

if [ "$use_docker" = "y" ] || [ "$use_docker" = "Y" ]; then
  echo "Using Docker..."
  docker compose exec postgres psql -U ${DB_USER:-xavi_user} -d ${DB_NAME:-xavi_db} <<EOF
    -- Add batch column to migrations table
    ALTER TABLE migrations 
      ADD COLUMN IF NOT EXISTS batch INTEGER NOT NULL DEFAULT 1;
    
    -- Show result
    \d migrations
EOF
else
  echo "Using local PostgreSQL..."
  PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST:-localhost} -U ${DB_USER} -d ${DB_NAME} <<EOF
    -- Add batch column to migrations table
    ALTER TABLE migrations 
      ADD COLUMN IF NOT EXISTS batch INTEGER NOT NULL DEFAULT 1;
    
    -- Show result
    \d migrations
EOF
fi

echo ""
echo "✅ Migration table updated successfully!"
echo "All existing migrations are now in batch 1."
echo ""
echo "You can now use:"
echo "  - npm run migrate:status"
echo "  - npm run migrate:rollback"
