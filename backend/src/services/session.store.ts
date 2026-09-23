// ============================================================================
// NexusChat — Privacy-Safe Session Store
// ============================================================================
// Provides persistent storage for anonymous sessions and match continuity.
// Uses PostgreSQL if DATABASE_URL is set, otherwise seamlessly uses an
// in-memory store with automatic TTL expiration.
// ============================================================================

import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ChatMode } from './shared-types.js';

export type SessionStatus = 'active' | 'queued' | 'matched' | 'reconnecting' | 'expired' | 'ended';

export interface SessionRecord {
  sessionId: string;
  tokenHash: string;
  status: SessionStatus;
  mode: ChatMode | null;
  interests: string[];
  currentMatchId: string | null;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

export interface SessionMatchRecord {
  matchId: string;
  sessionId1: string;
  sessionId2: string;
  mode: ChatMode;
  sharedInterest: string | null;
  startedAt: number;
  endedAt: number | null;
  endReason: string | null;
}

export interface ISessionStore {
  init(): Promise<void>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  saveSession(session: SessionRecord): Promise<void>;
  updateSessionStatus(sessionId: string, status: SessionStatus, matchId?: string | null): Promise<void>;
  updateLastActive(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  recordMatch(match: SessionMatchRecord): Promise<void>;
  endMatchRecord(matchId: string, endReason: string): Promise<void>;
  pruneExpiredSessions(): Promise<number>;
  destroy?(): void;
}

// ── In-Memory Session Store (Fallback & High-Performance) ─────────────────────
class MemorySessionStore implements ISessionStore {
  private sessions: Map<string, SessionRecord> = new Map();
  private matches: Map<string, SessionMatchRecord> = new Map();
  private pruneInterval: NodeJS.Timeout | null = null;

  public async init(): Promise<void> {
    // Run cleanup every 60 seconds
    this.pruneInterval = setInterval(() => {
      this.pruneExpiredSessions().catch(() => {});
    }, 60000);
    logger.info('MemorySessionStore initialized with automatic TTL cleanup');
  }

  public destroy(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }
  }

  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    const record = this.sessions.get(sessionId);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return { ...record };
  }

  public async saveSession(session: SessionRecord): Promise<void> {
    this.sessions.set(session.sessionId, { ...session });
  }

  public async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    matchId?: string | null
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActiveAt = Date.now();
      if (matchId !== undefined) {
        session.currentMatchId = matchId;
      }
    }
  }

  public async updateLastActive(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  public async recordMatch(match: SessionMatchRecord): Promise<void> {
    this.matches.set(match.matchId, { ...match });
  }

  public async endMatchRecord(matchId: string, endReason: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (match) {
      match.endedAt = Date.now();
      match.endReason = endReason;
    }
  }

  public async pruneExpiredSessions(): Promise<number> {
    const now = Date.now();
    let pruned = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        pruned++;
      }
    }
    return pruned;
  }
}

// ── PostgreSQL Session Store (Relational Persistence) ─────────────────────────
class PostgresSessionStore implements ISessionStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }

  public async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS anonymous_sessions (
          session_id VARCHAR(64) PRIMARY KEY,
          token_hash VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          mode VARCHAR(16),
          interests TEXT[] DEFAULT '{}',
          current_match_id VARCHAR(64),
          created_at BIGINT NOT NULL,
          last_active_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON anonymous_sessions(expires_at);

        CREATE TABLE IF NOT EXISTS session_match_history (
          match_id VARCHAR(64) PRIMARY KEY,
          session_id_1 VARCHAR(64) NOT NULL,
          session_id_2 VARCHAR(64) NOT NULL,
          mode VARCHAR(16) NOT NULL,
          shared_interest VARCHAR(64),
          started_at BIGINT NOT NULL,
          ended_at BIGINT,
          end_reason VARCHAR(32)
        );
      `);
      logger.info('PostgresSessionStore initialized with schema tables');
    } finally {
      client.release();
    }
  }

  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    const res = await this.pool.query(
      `SELECT session_id, token_hash, status, mode, interests, current_match_id, created_at, last_active_at, expires_at
       FROM anonymous_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const session: SessionRecord = {
      sessionId: row.session_id,
      tokenHash: row.token_hash,
      status: row.status as SessionStatus,
      mode: row.mode as ChatMode | null,
      interests: row.interests || [],
      currentMatchId: row.current_match_id,
      createdAt: Number(row.created_at),
      lastActiveAt: Number(row.last_active_at),
      expiresAt: Number(row.expires_at),
    };

    if (Date.now() > session.expiresAt) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  public async saveSession(session: SessionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO anonymous_sessions
       (session_id, token_hash, status, mode, interests, current_match_id, created_at, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (session_id) DO UPDATE SET
         status = EXCLUDED.status,
         mode = EXCLUDED.mode,
         interests = EXCLUDED.interests,
         current_match_id = EXCLUDED.current_match_id,
         last_active_at = EXCLUDED.last_active_at,
         expires_at = EXCLUDED.expires_at`,
      [
        session.sessionId,
        session.tokenHash,
        session.status,
        session.mode,
        session.interests,
        session.currentMatchId,
        session.createdAt,
        session.lastActiveAt,
        session.expiresAt,
      ]
    );
  }

  public async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    matchId?: string | null
  ): Promise<void> {
    if (matchId !== undefined) {
      await this.pool.query(
        `UPDATE anonymous_sessions SET status = $1, current_match_id = $2, last_active_at = $3 WHERE session_id = $4`,
        [status, matchId, Date.now(), sessionId]
      );
    } else {
      await this.pool.query(
        `UPDATE anonymous_sessions SET status = $1, last_active_at = $2 WHERE session_id = $3`,
        [status, Date.now(), sessionId]
      );
    }
  }

  public async updateLastActive(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE anonymous_sessions SET last_active_at = $1 WHERE session_id = $2`,
      [Date.now(), sessionId]
    );
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query(`DELETE FROM anonymous_sessions WHERE session_id = $1`, [sessionId]);
  }

  public async recordMatch(match: SessionMatchRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO session_match_history
       (match_id, session_id_1, session_id_2, mode, shared_interest, started_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (match_id) DO NOTHING`,
      [
        match.matchId,
        match.sessionId1,
        match.sessionId2,
        match.mode,
        match.sharedInterest,
        match.startedAt,
      ]
    );
  }

  public async endMatchRecord(matchId: string, endReason: string): Promise<void> {
    await this.pool.query(
      `UPDATE session_match_history SET ended_at = $1, end_reason = $2 WHERE match_id = $3`,
      [Date.now(), endReason, matchId]
    );
  }

  public async pruneExpiredSessions(): Promise<number> {
    const res = await this.pool.query(
      `DELETE FROM anonymous_sessions WHERE expires_at < $1`,
      [Date.now()]
    );
    return res.rowCount || 0;
  }

  public destroy(): void {
    this.pool.end().catch(() => {});
  }
}

// ── Resilient Session Store (Zero Downtime Fallback) ─────────────────────────
class ResilientSessionStore implements ISessionStore {
  private activeStore: ISessionStore;
  private memoryFallback: MemorySessionStore;

  constructor() {
    this.memoryFallback = new MemorySessionStore();
    if (env.DATABASE_URL) {
      this.activeStore = new PostgresSessionStore(env.DATABASE_URL);
    } else {
      this.activeStore = this.memoryFallback;
    }
  }

  public async init(): Promise<void> {
    try {
      await this.activeStore.init();
      logger.info('Primary session store initialized successfully');
    } catch (err) {
      if (this.activeStore !== this.memoryFallback) {
        logger.warn('PostgreSQL session store initialization failed, gracefully falling back to MemorySessionStore', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.activeStore = this.memoryFallback;
        await this.activeStore.init();
      } else {
        throw err;
      }
    }
  }

  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    try {
      return await this.activeStore.getSession(sessionId);
    } catch (err) {
      if (this.activeStore !== this.memoryFallback) {
        logger.warn('Error querying PostgresSessionStore, switching to MemorySessionStore', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.activeStore = this.memoryFallback;
        return this.activeStore.getSession(sessionId);
      }
      throw err;
    }
  }

  public async saveSession(session: SessionRecord): Promise<void> {
    try {
      await this.activeStore.saveSession(session);
    } catch (err) {
      if (this.activeStore !== this.memoryFallback) {
        logger.warn('Error saving to PostgresSessionStore, switching to MemorySessionStore', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.activeStore = this.memoryFallback;
        await this.activeStore.saveSession(session);
      } else {
        throw err;
      }
    }
  }

  public async updateSessionStatus(sessionId: string, status: SessionStatus, matchId?: string | null): Promise<void> {
    try {
      await this.activeStore.updateSessionStatus(sessionId, status, matchId);
    } catch {
      if (this.activeStore !== this.memoryFallback) {
        this.activeStore = this.memoryFallback;
        await this.activeStore.updateSessionStatus(sessionId, status, matchId);
      }
    }
  }

  public async updateLastActive(sessionId: string): Promise<void> {
    try {
      await this.activeStore.updateLastActive(sessionId);
    } catch {
      if (this.activeStore !== this.memoryFallback) {
        this.activeStore = this.memoryFallback;
        await this.activeStore.updateLastActive(sessionId);
      }
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.activeStore.deleteSession(sessionId);
    } catch {
      if (this.activeStore !== this.memoryFallback) {
        this.activeStore = this.memoryFallback;
        await this.activeStore.deleteSession(sessionId);
      }
    }
  }

  public async recordMatch(match: SessionMatchRecord): Promise<void> {
    try {
      await this.activeStore.recordMatch(match);
    } catch {
      if (this.activeStore !== this.memoryFallback) {
        this.activeStore = this.memoryFallback;
        await this.activeStore.recordMatch(match);
      }
    }
  }

  public async endMatchRecord(matchId: string, endReason: string): Promise<void> {
    try {
      await this.activeStore.endMatchRecord(matchId, endReason);
    } catch {
      if (this.activeStore !== this.memoryFallback) {
        this.activeStore = this.memoryFallback;
        await this.activeStore.endMatchRecord(matchId, endReason);
      }
    }
  }

  public async pruneExpiredSessions(): Promise<number> {
    return this.activeStore.pruneExpiredSessions();
  }

  public destroy(): void {
    if (this.activeStore.destroy) this.activeStore.destroy();
    this.memoryFallback.destroy();
  }
}

export const sessionStore: ISessionStore = new ResilientSessionStore();

