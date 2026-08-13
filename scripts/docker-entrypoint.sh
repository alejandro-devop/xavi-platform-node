#!/bin/sh

# Exit on error
set -e

echo "🚀 Starting application..."

# RUN_MIGRATIONS=false omite la espera de BD y las migraciones al arrancar.
# Necesario en plataformas que reinician el contenedor con frecuencia (el free
# tier de Render duerme el servicio tras 15 min sin tráfico). Por defecto
# queda en true para no cambiar el comportamiento en Cloud Run ni en local.
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"

if [ "$RUN_MIGRATIONS" != "true" ]; then
  echo "⏭️  RUN_MIGRATIONS=$RUN_MIGRATIONS — se omiten espera de BD y migraciones"
  echo "🎯 Starting server..."
  exec "$@"
fi

# Wait for database to be ready
DB_WAIT_RETRIES="${DB_WAIT_RETRIES:-30}"
echo "⏳ Waiting for database to be ready (máx ${DB_WAIT_RETRIES} intentos)..."

db_ready() {
  if [ -n "$DATABASE_URL" ]; then
    # Use DATABASE_URL (for Neon, Cloud Run with secrets)
    psql "$DATABASE_URL" -c '\q' 2>/dev/null
  else
    # Use individual DB variables (for local development)
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null
  fi
}

# Espera acotada: sin límite, un DATABASE_URL mal configurado deja el
# contenedor colgado indefinidamente en vez de fallar de forma visible.
attempt=1
until db_ready; do
  if [ "$attempt" -ge "$DB_WAIT_RETRIES" ]; then
    echo "❌ Base de datos inalcanzable tras ${DB_WAIT_RETRIES} intentos. Abortando."
    exit 1
  fi
  echo "   Database is unavailable - sleeping... (${attempt}/${DB_WAIT_RETRIES})"
  attempt=$((attempt + 1))
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running migrations..."
npm run migrate

echo "✅ Migrations completed!"

# Start the application
echo "🎯 Starting server..."
exec "$@"
