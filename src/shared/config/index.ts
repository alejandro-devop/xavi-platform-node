import { initializeDbPool, shutdownDbPool } from '../database/pool';
import { initializeDrizzle, closeDrizzle, getDrizzlePool } from '../database/drizzle';
import { initializeRedisClient, shutdownRedisClient } from '../redis/client';
import { logger } from '../logger';

export async function initializeServices(): Promise<void> {
  try {
    // Initialize Drizzle ORM
    const db = initializeDrizzle();
    logger.info('Drizzle ORM initialized');

    // Test database connection using Drizzle's pool
    const pool = getDrizzlePool();
    await pool.query('SELECT 1');
    logger.info('Database connection verified (Drizzle)');

    // Keep legacy pool for services that haven't been migrated yet
    const dbPool = initializeDbPool();
    logger.info('Legacy database pool initialized (for non-migrated services)');

    // Initialize Redis client (only if enabled)
    if (process.env.ENABLE_REDIS_CACHE === 'true') {
      const redis = initializeRedisClient();
      logger.info('Redis client initialized, waiting for ready...');

      // Wait for Redis to be ready before proceeding
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis ready timeout after 10s'));
        }, 10000);

        if (redis.status === 'ready') {
          clearTimeout(timeout);
          resolve();
        } else {
          redis.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });
          redis.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }
      });

      logger.info('Redis connection verified');
    } else {
      logger.info('Redis cache disabled by configuration');
    }

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to initialize services'
    );
    throw error;
  }
}

export async function shutdownServices(): Promise<void> {
  logger.info('Shutting down services...');

  try {
    const shutdownPromises = [closeDrizzle(), shutdownDbPool()];

    if (process.env.ENABLE_REDIS_CACHE === 'true') {
      shutdownPromises.push(shutdownRedisClient());
    }

    await Promise.all(shutdownPromises);

    logger.info('All services shut down successfully');
  } catch (error) {
    logger.error({ error }, 'Error during service shutdown');
    throw error;
  }
}
