#!/bin/sh

# Exit on error
set -e

echo "🚀 Starting application..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."

# Check if we have DATABASE_URL or individual DB vars
if [ -n "$DATABASE_URL" ]; then
  # Use DATABASE_URL (for Neon, Cloud Run with secrets)
  until psql "$DATABASE_URL" -c '\q' 2>/dev/null; do
    echo "   Database is unavailable - sleeping..."
    sleep 2
  done
else
  # Use individual DB variables (for local development)
  until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
    echo "   Database is unavailable - sleeping..."
    sleep 2
  done
fi

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running migrations..."
npm run migrate

echo "✅ Migrations completed!"

# Start the application
echo "🎯 Starting server..."
exec "$@"
