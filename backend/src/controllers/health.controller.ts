// ============================================================================
// NexusChat — Health Check Controller
// ============================================================================

import { Request, Response } from 'express';

export function healthCheck(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: 'umingle-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0',
    checks: {
      server: 'healthy',
    },
  });
}
