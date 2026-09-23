// ============================================================================
// NexusChat — Centralized Error Handler
// ============================================================================
// Catches ALL errors from route handlers and sends consistent JSON responses.
// NEVER exposes internal stack traces to users (security risk).
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn('Application error', {
      requestId: req.requestId,
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
    });

    res.status(err.statusCode).json({
      error: { message: err.message, code: err.statusCode },
    });
    return;
  }

  logger.error('Unexpected error', {
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: { message: 'Internal server error', code: 500 },
  });
}
