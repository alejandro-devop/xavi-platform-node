import Redis from 'ioredis';
import { logger } from '../logger';

let redisClient: Redis | null = null;

export function initializeRedisClient(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,

    // Retry strategy
    retryStrategy: (times) => {
      if (times > 3) {
        logger.error('Redis retry limit exceeded');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },

    // Connection settings optimized for Cloud Run
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true, // Allow queueing during connection
    lazyConnect: false, // Connect immediately

    // Keep-alive
    keepAlive: 30000,
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  return redisClient;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedisClient() first.');
  }
  return redisClient;
}
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client closed');
  }
}
export async function shutdownRedisClient(): Promise<void> {
  if (redisClient) {
    logger.info('Closing Redis client...');
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client closed');
  }
}
