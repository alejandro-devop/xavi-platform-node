import { createApp } from './app';
import { initializeServices } from './shared/config';
import { closeDbPool } from './shared/database/pool';
import { closeRedisClient } from './shared/redis/client';
import { logger } from './shared/logger';

const PORT = process.env.PORT || 8080;
let server: any;

// Add console.log for debugging Cloud Run
console.log('=== STARTING XAVI API ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('K_SERVICE:', process.env.K_SERVICE);

async function start() {
  try {
    console.log('Entering start function...');
    logger.info('Starting server initialization...');

    // Create Express app FIRST (before DB/Redis)
    console.log('Creating Express app...');
    const app = createApp();

    // Start server immediately
    console.log('Starting HTTP server on port', PORT);
    server = app.listen(PORT, () => {
      console.log('✅ Server listening on port', PORT);
      logger.info({ port: PORT }, 'Server started successfully');
    });

    // Initialize services (DB, Redis, etc.) AFTER server is listening
    console.log('Initializing services...');
    logger.info('Initializing database and Redis connections...');
    await initializeServices();
    console.log('✅ Services initialized');
    logger.info('Services initialized successfully');

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
    console.error('❌ FATAL ERROR:', error);
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
    console.error('❌ Shutdown error:', error);
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

console.log('Calling start()...');
start();
