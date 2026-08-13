import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { logger } from '../logger';

// Type for the Drizzle instance with schema
type DrizzleDb = NodePgDatabase<typeof schema>;

let db: DrizzleDb | null = null;
let pool: Pool | null = null;

/**
 * Initialize Drizzle ORM instance
 */
export function initializeDrizzle(): DrizzleDb {
  if (db) return db;

  // Use DATABASE_URL if available (Neon, Heroku, etc.)
  // Otherwise fall back to individual env vars
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use connection string
    pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        databaseUrl.includes('neon.tech') || databaseUrl.includes('amazonaws.com')
          ? { rejectUnauthorized: false }
          : undefined,

      // Connection pool settings optimized for Cloud Run
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      // 15s, no 5s: Neon autosuspende, y la primera conexión tras un periodo
      // de inactividad tiene que esperar a que despierte. Con 5s el
      // `SELECT 1` de initializeServices() fallaba y tumbaba el arranque
      // (process.exit(1)) en el primer request de la mañana.
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  } else {
    // Fall back to individual env vars for local development
    const isCloudRun = process.env.K_SERVICE !== undefined;

    pool = new Pool({
      host: isCloudRun ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` : process.env.DB_HOST,
      port: isCloudRun ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  }

  // Error handling
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error (Drizzle)');
  });

  // Logging
  pool.on('connect', () => {
    logger.debug('New database connection established (Drizzle)');
  });

  pool.on('remove', () => {
    logger.debug('Database connection removed from pool (Drizzle)');
  });

  // Initialize Drizzle with the pool and schema
  db = drizzle(pool, { schema });

  logger.info(
    {
      max: pool.options.max,
      min: pool.options.min,
      host: databaseUrl ? 'connection-string' : pool.options.host,
    },
    'Drizzle ORM initialized'
  );

  return db;
}

/**
 * Get the Drizzle instance
 */
export function getDb(): DrizzleDb {
  if (!db) {
    throw new Error('Drizzle not initialized. Call initializeDrizzle() first.');
  }
  return db;
}

/**
 * Close the database connection pool
 */
export async function closeDrizzle(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    logger.info('Drizzle pool closed');
  }
}

/**
 * Get the underlying pool for raw queries if needed
 */
export function getDrizzlePool(): Pool {
  if (!pool) {
    throw new Error('Pool not initialized. Call initializeDrizzle() first.');
  }
  return pool;
}
