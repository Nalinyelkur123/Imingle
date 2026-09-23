// ============================================================================
// NexusChat — CORS Configuration
// ============================================================================
// CORS (Cross-Origin Resource Sharing) tells the browser which frontend
// URLs are allowed to make requests to this backend.
// Without CORS, the browser blocks http://localhost:3000 from calling
// http://localhost:3001 because they are different "origins" (different ports).
// ============================================================================

import cors from 'cors';
import { env } from './env.js';

export const corsOptions: cors.CorsOptions = {
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};
