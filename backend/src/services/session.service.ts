// ============================================================================
// NexusChat — Anonymous Session Service
// ============================================================================
// Manages the cryptographic creation, validation, and lifecycle of anonymous
// user sessions without biometrics, gender profiling, or persistent trackers.
// ============================================================================

import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sessionStore, SessionRecord, SessionStatus } from './session.store.js';
import { ChatMode } from './shared-types.js';

// Default session expiration: 2 hours of inactivity
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export interface AnonymousSession {
  sessionId: string;
  token: string;
  expiresAt: number;
  status: SessionStatus;
  mode: ChatMode | null;
  interests: string[];
  currentMatchId: string | null;
}

export class SessionService {
  /**
   * Generates a cryptographically signed session token:
   * Format: <sessionId>.<expiresAt>.<signature>
   */
  public signSessionToken(sessionId: string, expiresAt: number): string {
    const payload = `${sessionId}.${expiresAt}`;
    const hmac = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    return `${payload}.${hmac}`;
  }

  /**
   * Verifies a session token signature and checks expiration
   */
  public verifyToken(token: string | null | undefined): { sessionId: string; expiresAt: number } | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    const [sessionId, expiresAtStr, signature] = parts;
    const expiresAt = Number(expiresAtStr);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return null;
    }

    const payload = `${sessionId}.${expiresAt}`;
    const expectedHmac = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(payload)
      .digest('base64url');

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedHmac);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    return { sessionId, expiresAt };
  }

  /**
   * Computes a SHA-256 hash of the token for database indexing
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Initializes the session store
   */
  public async init(): Promise<void> {
    await sessionStore.init();
  }

  /**
   * Creates a new anonymous session or resumes an existing valid session
   */
  public async createOrResumeSession(
    existingToken?: string | null,
    mode?: ChatMode,
    interests?: string[]
  ): Promise<AnonymousSession> {
    const verified = this.verifyToken(existingToken);

    if (verified) {
      const existingSession = await sessionStore.getSession(verified.sessionId);
      if (existingSession && existingSession.status !== 'ended') {
        // Renew expiration on active resumption
        const newExpiresAt = Date.now() + SESSION_TTL_MS;
        const renewedToken = this.signSessionToken(existingSession.sessionId, newExpiresAt);
        existingSession.expiresAt = newExpiresAt;
        existingSession.lastActiveAt = Date.now();
        existingSession.tokenHash = this.hashToken(renewedToken);
        if (mode) existingSession.mode = mode;
        if (interests) existingSession.interests = interests;

        await sessionStore.saveSession(existingSession);

        logger.info(`Resumed existing anonymous session: ${existingSession.sessionId}`);

        return {
          sessionId: existingSession.sessionId,
          token: renewedToken,
          expiresAt: newExpiresAt,
          status: existingSession.status,
          mode: existingSession.mode,
          interests: existingSession.interests,
          currentMatchId: existingSession.currentMatchId,
        };
      }
    }

    // Generate fresh anonymous session
    const sessionId = `sess_${crypto.randomUUID()}`;
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    const token = this.signSessionToken(sessionId, expiresAt);
    const tokenHash = this.hashToken(token);

    const newRecord: SessionRecord = {
      sessionId,
      tokenHash,
      status: 'active',
      mode: mode || null,
      interests: interests || [],
      currentMatchId: null,
      createdAt: now,
      lastActiveAt: now,
      expiresAt,
    };

    await sessionStore.saveSession(newRecord);

    logger.info(`Created new anonymous session: ${sessionId}`);

    return {
      sessionId,
      token,
      expiresAt,
      status: 'active',
      mode: newRecord.mode,
      interests: newRecord.interests,
      currentMatchId: null,
    };
  }

  /**
   * Retrieves session by ID
   */
  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    return sessionStore.getSession(sessionId);
  }

  /**
   * Updates session status (queued, matched, idle, etc.)
   */
  public async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    matchId?: string | null
  ): Promise<void> {
    await sessionStore.updateSessionStatus(sessionId, status, matchId);
  }

  /**
   * Updates last active timestamp
   */
  public async touchSession(sessionId: string): Promise<void> {
    await sessionStore.updateLastActive(sessionId);
  }

  /**
   * Explicitly closes a session
   */
  public async endSession(sessionId: string): Promise<void> {
    await sessionStore.updateSessionStatus(sessionId, 'ended', null);
  }
}

export const sessionService = new SessionService();
