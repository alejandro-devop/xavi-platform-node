import { createApp } from './app';
import { initializeServices } from './shared/config';
import { closeDbPool } from './shared/database/pool';
import { closeRedisClient } from './shared/redis/client';
import { logger } from './shared/logger';

const PORT = process.env.PORT || 8080;
let server: any;

async function start() {
  try {
    // Initialize services (DB, Redis, etc.)
    await initializeServices();

    // Create Express app
    const app = createApp();

    // Start server
    server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started successfully');
    });

    // Graceful shutdown on SIGTERM (Cloud Run sends this)
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      await shutdown();
    });

    // Graceful shutdown on SIGINT (Ctrl+C locally)
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, starting graceful shutdown');
      await shutdown();
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown() {
  try {
    // Stop accepting new requests
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    // Close database connections
    await closeDbPool();

    // Close Redis connections
    await closeRedisClient();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

start();
