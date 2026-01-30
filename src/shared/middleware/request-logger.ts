import { Request, Response as ExpressResponse, NextFunction } from 'express';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(req: Request, res: ExpressResponse, next: NextFunction): void {
  const requestId = uuidv4();
  const startTime = Date.now();

  // Attach request ID to request
  req.headers['x-request-id'] = requestId;

  // Log incoming request
  logger.info(
    {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    },
    'Incoming request'
  );

  // Log response using response finished event
  const originalSend = res.send;
  res.send = function (data): ExpressResponse {
    const duration = Date.now() - startTime;

    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with error');
    } else {
      logger.info(logData, 'Request completed');
    }

    res.send = originalSend;
    return originalSend.call(this, data);
  };

  next();
}
