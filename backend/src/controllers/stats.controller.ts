// ============================================================================
// NexusChat — Stats Controller
// ============================================================================

import { Request, Response } from 'express';
import { matchmaker } from '../services/matchmaker.service.js';

export function getStats(_req: Request, res: Response): void {
  const stats = matchmaker.getStats();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats: {
      onlineUsers: stats.onlineUsers,
      activeMatches: stats.activeMatches,
      waitingQueue: {
        text: stats.textQueueCount,
        video: stats.videoQueueCount,
      },
    },
  });
}
