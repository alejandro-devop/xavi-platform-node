import { Pool, PoolConfig } from 'pg';
import { logger } from '../logger';

let pool: Pool | null = null;

export function initializeDbPool(): Pool {
  if (pool) return pool;

  const isCloudRun = process.env.K_SERVICE !== undefined;

  const config: PoolConfig = {
    host: isCloudRun
      ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` // Unix socket for Cloud SQL
      : process.env.DB_HOST, // TCP for local
    port: isCloudRun ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // Connection pool settings optimized for Cloud Run
    max: 10, // Max connections per container
    min: 2, // Min connections to keep alive
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000,

    // Keep-alive to prevent connection drops
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

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
      host: isCloudRun ? 'unix-socket' : config.host,
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
