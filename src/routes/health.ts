import { Router } from 'express';
import { successResponse } from '../shared/utils/response';

const router = Router();

// Liveness probe - is the container running?
router.get('/health', (req, res) => {
  res.status(200).json(successResponse({ status: 'healthy' }));
});

// Readiness probe - is the container ready to receive traffic?
router.get('/ready', async (req, res) => {
  try {
    // Check database connectivity
    const { getDbPool } = await import('../shared/database/pool');
    const db = getDbPool();
    await db.query('SELECT 1');

    // Check Redis connectivity (optional)
    try {
      if (process.env.ENABLE_REDIS_CACHE === 'true') {
        const { getRedisClient } = await import('../shared/redis/client');
        const redis = getRedisClient();
        await redis.ping();
      }
    } catch (error) {
      // Redis is optional - don't fail readiness check
    }

    res.status(200).json(successResponse({ status: 'ready' }));
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service not ready',
    });
  }
});

export default router;
