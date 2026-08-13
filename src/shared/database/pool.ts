import { Pool, PoolConfig } from 'pg';
import { logger } from '../logger';

let pool: Pool | null = null;

export function initializeDbPool(): Pool {
  if (pool) return pool;

  // Use DATABASE_URL if available (Neon, Heroku, etc.)
  // Otherwise fall back to individual env vars
  const databaseUrl = process.env.DATABASE_URL;

  let config: PoolConfig;

  if (databaseUrl) {
    // Use connection string (Neon, Heroku, etc.)
    config = {
      connectionString: databaseUrl,
      ssl:
        databaseUrl.includes('neon.tech') || databaseUrl.includes('amazonaws.com')
          ? { rejectUnauthorized: false }
          : undefined,

      // Connection pool settings optimized for Cloud Run
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      // 15s, no 5s — ver nota equivalente en drizzle.ts: Neon autosuspende y
      // la primera conexión tras inactividad paga el despertar.
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };
  } else {
    // Fall back to individual env vars for local development
    const isCloudRun = process.env.K_SERVICE !== undefined;

    config = {
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
    };
  }

  pool = new Pool(config);

  // Error handling
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error');
  });

  // Logging
  pool.on('connect', () => {
    logger.debug('New database connection established');
  });

  pool.on('remove', () => {
    logger.debug('Database connection removed from pool');
  });

  logger.info(
    {
      max: config.max,
      min: config.min,
      host: config.connectionString ? 'connection-string' : config.host,
    },
    'Database pool initialized'
  );

  return pool;
}

export function getDbPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDbPool() first.');
  }
  return pool;
}
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
export async function shutdownDbPool(): Promise<void> {
  if (pool) {
    logger.info('Closing database pool...');
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
