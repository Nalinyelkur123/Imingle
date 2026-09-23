// ============================================================================
// NexusChat — Environment Configuration
// ============================================================================
// Loads and VALIDATES environment variables at startup using Zod.
// If a required variable is missing or invalid, the server crashes
// immediately with a clear error — not later when a query fails.
// ============================================================================

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file from project root
dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  TURN_SERVER_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_PASSWORD: z.string().optional(),
  SESSION_SECRET: z.string().min(16).default('dev-session-secret-change-in-production'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
