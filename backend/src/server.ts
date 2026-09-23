// ============================================================================
// NexusChat — Server Entry Point
// ============================================================================
// This is the MAIN FILE that starts the Express server.
//
// The middleware chain runs top-to-bottom on every request:
//   Request → helmet → cors → json → requestId → morgan → routes → errorHandler
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';

import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';
import { initSocketService } from './services/socket.service.js';
import { sessionService } from './services/session.service.js';

// ── Create Express app ──────────────────────────────────────────────────────
const app = express();

// ── Create HTTP server (shared with Socket.IO) ──────────────────────────────
const httpServer = createServer(app);

// ── Initialize Services ─────────────────────────────────────────────────────
sessionService.init().catch((err) => {
  logger.error('Failed to initialize session store:', {
    error: err instanceof Error ? err.message : String(err),
  });
});
initSocketService(httpServer);

// ── Middleware chain ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Routes ──────────────────────────────────────────────────────────────────
app.use(routes);

// ── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ────────────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  logger.info(`🚀 NexusChat server running`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    corsOrigin: env.CORS_ORIGIN,
  });
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully...`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

export { app, httpServer };
