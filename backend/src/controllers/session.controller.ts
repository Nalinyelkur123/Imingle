// ============================================================================
// NexusChat — Session Controller
// ============================================================================
// Provides REST endpoints for anonymous session initialization, status checks,
// and graceful termination without user accounts or tracking profiles.
// ============================================================================

import { Request, Response } from 'express';
import { sessionService } from '../services/session.service.js';
import { logger } from '../utils/logger.js';
import { ChatMode } from '../services/shared-types.js';

// Helper to parse cookies from raw Cookie header
function parseCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const matches = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of matches) {
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

// Helper to extract session token from request
function extractToken(req: Request): string | null {
  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Request body token
  if (req.body && typeof req.body.token === 'string') {
    return req.body.token.trim();
  }

  // 3. Cookie header
  const cookieToken = parseCookie(req, 'umingle_sess');
  if (cookieToken) {
    return cookieToken.trim();
  }

  return null;
}

/**
 * POST /api/session/init
 * Initializes a new anonymous session or verifies and resumes an existing one.
 */
export async function initSession(req: Request, res: Response): Promise<void> {
  try {
    const existingToken = extractToken(req);
    const mode = (req.body?.mode === 'video' ? 'video' : req.body?.mode === 'text' ? 'text' : undefined) as ChatMode | undefined;
    const interests = Array.isArray(req.body?.interests) ? req.body.interests : undefined;

    const session = await sessionService.createOrResumeSession(existingToken, mode, interests);

    // Set privacy-conscious HttpOnly cookie
    // SameSite=None + Secure allows cross-origin requests from Cloudflare frontend
    const maxAgeSec = Math.floor((session.expiresAt - Date.now()) / 1000);
    res.setHeader(
      'Set-Cookie',
      `umingle_sess=${encodeURIComponent(session.token)}; Max-Age=${maxAgeSec}; Path=/; HttpOnly; Secure; SameSite=None`
    );

    const sessionData = {
      sessionId: session.sessionId,
      token: session.token,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      status: session.status,
      mode: session.mode,
      interests: session.interests,
      currentMatchId: session.currentMatchId,
    };

    res.status(200).json({
      status: 'ok',
      session: sessionData,
      data: sessionData,
    });
  } catch (err) {
    logger.error('Error initializing anonymous session', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Failed to initialize anonymous session' });
  }
}

/**
 * GET /api/session/status
 * Validates the current session token and returns its active state.
 */
export async function getSessionStatus(req: Request, res: Response): Promise<void> {
  try {
    const token = extractToken(req);
    const verified = sessionService.verifyToken(token);

    if (!verified) {
      res.status(401).json({
        status: 'expired',
        error: 'Session token is invalid or expired',
      });
      return;
    }

    const session = await sessionService.getSession(verified.sessionId);
    if (!session || session.status === 'ended') {
      res.status(401).json({
        status: 'ended',
        error: 'Session has ended or does not exist',
      });
      return;
    }

    const statusData = {
      sessionId: session.sessionId,
      status: session.status,
      mode: session.mode,
      interests: session.interests,
      currentMatchId: session.currentMatchId,
      expiresAt: session.expiresAt,
    };

    res.status(200).json({
      status: 'ok',
      session: statusData,
      data: statusData,
    });
  } catch (err) {
    logger.error('Error fetching session status', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Failed to fetch session status' });
  }
}

/**
 * POST /api/session/end
 * Explicitly terminates the current session.
 */
export async function endSession(req: Request, res: Response): Promise<void> {
  try {
    const token = extractToken(req);
    const verified = sessionService.verifyToken(token);

    if (verified) {
      await sessionService.endSession(verified.sessionId);
    }

    // Clear session cookie
    res.setHeader(
      'Set-Cookie',
      `umingle_sess=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None`
    );

    res.status(200).json({
      status: 'ok',
      success: true,
      message: 'Anonymous session ended successfully',
    });
  } catch (err) {
    logger.error('Error ending session', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Failed to end session' });
  }
}
