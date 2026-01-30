import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../errors';
import { errorResponse } from '../utils/response';

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  // Log error with context
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        params: req.params,
        userId: req.user?.id,
        ip: req.ip,
      },
    },
    'Request error occurred'
  );

  // Handle known error types
  if (error instanceof ValidationError) {
    res.status(400).json(errorResponse(error.errors));
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(401).json(errorResponse(error.message));
    return;
  }

  if (error instanceof ForbiddenError) {
    res.status(403).json(errorResponse(error.message));
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json(errorResponse(error.message));
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json(errorResponse(error.message));
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json(errorResponse(error.message));
    return;
  }

  // Unknown error - return 500
  res.status(500).json(errorResponse('Internal server error'));
}
