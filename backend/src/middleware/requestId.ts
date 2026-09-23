// ============================================================================
// NexusChat — Request ID Middleware
// ============================================================================
// Assigns a unique UUID to every incoming HTTP request for tracing through logs.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  req.requestId = (typeof existingId === 'string' ? existingId : uuidv4());
  next();
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
