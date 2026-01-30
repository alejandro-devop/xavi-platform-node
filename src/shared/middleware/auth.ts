import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { getRedisClient } from '../redis/client';
import { getDbPool } from '../database/pool';
import { UnauthorizedError } from '../errors';
import { logger } from '../logger';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  isAccountVerified: boolean;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    const payload = verifyAccessToken(token);

    // Check Redis cache first (if enabled)
    if (process.env.ENABLE_REDIS_CACHE === 'true') {
      try {
        const cacheKey = `session:${payload.jti}`;
        const redis = getRedisClient();
        const cachedUser = await redis.get(cacheKey);

        if (cachedUser) {
          req.user = JSON.parse(cachedUser);
          logger.debug({ userId: req.user!.id }, 'User authenticated from cache');
          return next();
        }
      } catch (error) {
        // If Redis fails, continue with database query
        logger.warn({ error }, 'Redis cache check failed, falling back to database');
      }
    }

    // Cache miss or Redis disabled - query database
    const db = getDbPool();
    const result = await db.query(
      'SELECT id, email, name, is_account_verified FROM users WHERE id = $1',
      [parseInt(payload.sub, 10)]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user: AuthenticatedUser = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      isAccountVerified: result.rows[0].is_account_verified,
    };

    // Cache user for 10 minutes (if Redis enabled)
    if (process.env.ENABLE_REDIS_CACHE === 'true') {
      try {
        const cacheKey = `session:${payload.jti}`;
        const redis = getRedisClient();
        await redis.setex(cacheKey, 600, JSON.stringify(user));
      } catch (error) {
        // Log but don't fail if caching fails
        logger.warn({ error }, 'Failed to cache user session');
      }
    }

    req.user = user;
    logger.debug({ userId: user.id }, 'User authenticated from database');

    next();
  } catch (error) {
    next(error);
  }
}

// Optional middleware to check resource ownership
export function ownerMiddleware(tableName: string, idParam: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const resourceId = parseInt(req.params[idParam], 10);
      if (isNaN(resourceId)) {
        return next();
      }

      const db = getDbPool();
      const result = await db.query(`SELECT user_id FROM ${tableName} WHERE id = $1`, [resourceId]);

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Resource not found');
      }

      if (result.rows[0].user_id !== req.user.id) {
        throw new UnauthorizedError('You do not own this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
