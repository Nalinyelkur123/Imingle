// ============================================================================
// NexusChat — Matchmaker Service with Session Continuity
// ============================================================================
// Manages queues and active matches keyed by anonymous sessionId.
// Supports priority pairing based on shared interests, duplicate entry prevention,
// and a 15-second reconnection grace period for temporary connection drops.
// ============================================================================

import { sessionStore } from './session.store.js';
import { logger } from '../utils/logger.js';

export type ChatMode = 'video' | 'text';

export interface QueueEntry {
  sessionId: string;
  socketId: string;
  mode: ChatMode;
  interests: string[];
  joinedAt: number;
}

export interface ActiveMatch {
  matchId: string;
  mode: ChatMode;
  user1: {
    sessionId: string;
    socketId: string;
    interests: string[];
  };
  user2: {
    sessionId: string;
    socketId: string;
    interests: string[];
  };
  sharedInterest: string | null;
  startedAt: number;
  status: 'active' | 'reconnecting';
}

const RECONNECT_GRACE_PERIOD_MS = 15000; // 15 seconds

class MatchmakerService {
  // Waiting queues separated by mode
  private textQueue: QueueEntry[] = [];
  private videoQueue: QueueEntry[] = [];

  // Active matches indexed by matchId
  private activeMatches: Map<string, ActiveMatch> = new Map();

  // Reverse index: sessionId -> matchId
  private sessionToMatch: Map<string, string> = new Map();

  // Reverse index: socketId -> sessionId
  private socketToSession: Map<string, string> = new Map();

  // Reconnection timers indexed by sessionId
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Total active socket connections
  private connectedSocketsCount = 0;

  /**
   * Tracks socket connection and binds sessionId
   */
  public onSocketConnected(socketId: string, sessionId: string): void {
    this.connectedSocketsCount++;
    this.socketToSession.set(socketId, sessionId);
  }

  /**
   * Handles user reconnection with the same sessionId.
   * Restores active match if within the 15-second grace period.
   */
  public handleReconnect(
    sessionId: string,
    newSocketId: string
  ): {
    resumed: boolean;
    match?: ActiveMatch;
    partnerSocketId?: string;
    isInitiator?: boolean;
  } {
    this.socketToSession.set(newSocketId, sessionId);

    // Check if user was in a match that was paused for reconnection
    const matchId = this.sessionToMatch.get(sessionId);
    if (!matchId) return { resumed: false };

    const match = this.activeMatches.get(matchId);
    if (!match) return { resumed: false };

    // Clear reconnect timer if active
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    // Update socketId in the match
    let isInitiator = false;
    let partnerSocketId = '';

    if (match.user1.sessionId === sessionId) {
      match.user1.socketId = newSocketId;
      partnerSocketId = match.user2.socketId;
      isInitiator = true;
    } else if (match.user2.sessionId === sessionId) {
      match.user2.socketId = newSocketId;
      partnerSocketId = match.user1.socketId;
      isInitiator = false;
    } else {
      return { resumed: false };
    }

    match.status = 'active';

    // Update session store
    sessionStore.updateSessionStatus(sessionId, 'matched', matchId).catch(() => {});

    logger.info(`Session ${sessionId} reconnected to active match ${matchId} on socket ${newSocketId}`);

    return {
      resumed: true,
      match,
      partnerSocketId,
      isInitiator,
    };
  }

  /**
   * Tracks socket disconnection.
   * If user was in an active match, holds it in grace period before ending.
   */
  public onSocketDisconnected(
    socketId: string,
    onGraceExpired: (match: ActiveMatch, partnerSocketId: string) => void
  ): {
    matchPaused?: ActiveMatch;
    partnerSocketId?: string;
    graceSeconds: number;
  } {
    if (this.connectedSocketsCount > 0) {
      this.connectedSocketsCount--;
    }

    const sessionId = this.socketToSession.get(socketId);
    this.socketToSession.delete(socketId);

    if (!sessionId) return { graceSeconds: 0 };

    // Remove from waiting queue if queued
    this.leaveQueue(sessionId);

    // Check if in active match
    const matchId = this.sessionToMatch.get(sessionId);
    if (!matchId) return { graceSeconds: 0 };

    const match = this.activeMatches.get(matchId);
    if (!match) return { graceSeconds: 0 };

    const partner = match.user1.sessionId === sessionId ? match.user2 : match.user1;
    const partnerSocketId = partner.socketId;
    if (!partnerSocketId) return { graceSeconds: 0 };

    // Set match status to reconnecting
    match.status = 'reconnecting';
    sessionStore.updateSessionStatus(sessionId, 'reconnecting', matchId).catch(() => {});

    logger.info(`Session ${sessionId} disconnected. Starting ${RECONNECT_GRACE_PERIOD_MS / 1000}s grace timer for match ${matchId}`);

    // Set grace period timer
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(sessionId);
      const currentMatch = this.activeMatches.get(matchId);
      if (currentMatch && currentMatch.status === 'reconnecting') {
        logger.info(`Grace period expired for session ${sessionId} in match ${matchId}`);
        const currentPartnerSocketId = currentMatch.user1.sessionId === sessionId
          ? currentMatch.user2.socketId
          : currentMatch.user1.socketId;
        this.endMatch(matchId, 'partner_disconnected');
        onGraceExpired(currentMatch, currentPartnerSocketId);
      }
    }, RECONNECT_GRACE_PERIOD_MS);

    this.reconnectTimers.set(sessionId, timer);

    return {
      matchPaused: match,
      partnerSocketId,
      graceSeconds: RECONNECT_GRACE_PERIOD_MS / 1000,
    };
  }

  /**
   * Adds a user session to the appropriate queue and attempts to find a match
   */
  public joinQueue(
    sessionId: string,
    socketId: string,
    mode: ChatMode,
    interests: string[] = []
  ): { matched: boolean; match?: ActiveMatch; partnerSocketId?: string; partnerSessionId?: string } {
    // If user is already in a match, end it first
    const existingMatchId = this.sessionToMatch.get(sessionId);
    if (existingMatchId) {
      this.endMatch(existingMatchId, 'new_search');
    }

    // Remove any existing queue entry for this session
    this.leaveQueue(sessionId);

    const normalizedInterests = interests
      .map((i) => i.trim().toLowerCase())
      .filter((i) => i.length > 0);

    const queue = mode === 'video' ? this.videoQueue : this.textQueue;

    // Search for a partner in the waiting queue
    let partnerIndex = -1;
    let sharedInterest: string | null = null;

    // 1. Priority 1: match on shared interest
    if (normalizedInterests.length > 0) {
      for (let i = 0; i < queue.length; i++) {
        const candidate = queue[i];
        if (candidate.sessionId === sessionId) continue;

        const common = candidate.interests.find((tag) =>
          normalizedInterests.includes(tag)
        );
        if (common) {
          partnerIndex = i;
          sharedInterest = common;
          break;
        }
      }
    }

    // 2. Priority 2: match with the first waiting candidate
    if (partnerIndex === -1 && queue.length > 0) {
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].sessionId !== sessionId) {
          partnerIndex = i;
          break;
        }
      }
    }

    // If partner found, pair them
    if (partnerIndex !== -1) {
      const partner = queue.splice(partnerIndex, 1)[0];

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const activeMatch: ActiveMatch = {
        matchId,
        mode,
        user1: {
          sessionId,
          socketId,
          interests: normalizedInterests,
        },
        user2: {
          sessionId: partner.sessionId,
          socketId: partner.socketId,
          interests: partner.interests,
        },
        sharedInterest,
        startedAt: Date.now(),
        status: 'active',
      };

      this.activeMatches.set(matchId, activeMatch);
      this.sessionToMatch.set(sessionId, matchId);
      this.sessionToMatch.set(partner.sessionId, matchId);

      // Persist to session store / database
      sessionStore.updateSessionStatus(sessionId, 'matched', matchId).catch(() => {});
      sessionStore.updateSessionStatus(partner.sessionId, 'matched', matchId).catch(() => {});
      sessionStore.recordMatch({
        matchId,
        sessionId1: sessionId,
        sessionId2: partner.sessionId,
        mode,
        sharedInterest,
        startedAt: activeMatch.startedAt,
        endedAt: null,
        endReason: null,
      }).catch(() => {});

      return {
        matched: true,
        match: activeMatch,
        partnerSocketId: partner.socketId,
        partnerSessionId: partner.sessionId,
      };
    }

    // Otherwise, add to waiting queue
    const entry: QueueEntry = {
      sessionId,
      socketId,
      mode,
      interests: normalizedInterests,
      joinedAt: Date.now(),
    };

    queue.push(entry);
    sessionStore.updateSessionStatus(sessionId, 'queued').catch(() => {});

    return { matched: false };
  }

  /**
   * Removes a user from queue by sessionId
   */
  public leaveQueue(sessionId: string): boolean {
    const vLen = this.videoQueue.length;
    const tLen = this.textQueue.length;

    this.videoQueue = this.videoQueue.filter((e) => e.sessionId !== sessionId);
    this.textQueue = this.textQueue.filter((e) => e.sessionId !== sessionId);

    const removed = this.videoQueue.length !== vLen || this.textQueue.length !== tLen;
    if (removed) {
      sessionStore.updateSessionStatus(sessionId, 'active').catch(() => {});
    }
    return removed;
  }

  /**
   * Retrieves active match for a given socketId
   */
  public getMatchBySocket(socketId: string): ActiveMatch | undefined {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return undefined;
    const matchId = this.sessionToMatch.get(sessionId);
    if (!matchId) return undefined;
    return this.activeMatches.get(matchId);
  }

  /**
   * Retrieves active match for a given sessionId
   */
  public getMatchBySession(sessionId: string): ActiveMatch | undefined {
    const matchId = this.sessionToMatch.get(sessionId);
    if (!matchId) return undefined;
    return this.activeMatches.get(matchId);
  }

  /**
   * Gets partner's socketId in an active match
   */
  public getPartnerSocketId(socketId: string): string | undefined {
    const match = this.getMatchBySocket(socketId);
    if (!match) return undefined;

    if (match.user1.socketId === socketId) {
      return match.user2.socketId;
    }
    return match.user1.socketId;
  }

  /**
   * Ends an active match and records reason
   */
  public endMatch(matchId: string, endReason = 'user_action'): ActiveMatch | undefined {
    const match = this.activeMatches.get(matchId);
    if (!match) return undefined;

    // Clear any pending reconnect timers
    const timer1 = this.reconnectTimers.get(match.user1.sessionId);
    if (timer1) {
      clearTimeout(timer1);
      this.reconnectTimers.delete(match.user1.sessionId);
    }
    const timer2 = this.reconnectTimers.get(match.user2.sessionId);
    if (timer2) {
      clearTimeout(timer2);
      this.reconnectTimers.delete(match.user2.sessionId);
    }

    this.sessionToMatch.delete(match.user1.sessionId);
    this.sessionToMatch.delete(match.user2.sessionId);
    this.activeMatches.delete(matchId);

    // Update store
    sessionStore.updateSessionStatus(match.user1.sessionId, 'active', null).catch(() => {});
    sessionStore.updateSessionStatus(match.user2.sessionId, 'active', null).catch(() => {});
    sessionStore.endMatchRecord(matchId, endReason).catch(() => {});

    return match;
  }

  /**
   * Returns current statistics
   */
  public getStats(): {
    onlineUsers: number;
    activeMatches: number;
    textQueueCount: number;
    videoQueueCount: number;
  } {
    return {
      onlineUsers: Math.max(this.connectedSocketsCount, 1),
      activeMatches: this.activeMatches.size,
      textQueueCount: this.textQueue.length,
      videoQueueCount: this.videoQueue.length,
    };
  }
}

export const matchmaker = new MatchmakerService();
