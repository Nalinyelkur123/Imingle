// ============================================================================
// NexusChat — Matchmaker Service
// ============================================================================
// Manages waiting queues and active matches for both text and video modes.
// Supports priority pairing based on shared interests.
// ============================================================================

export type ChatMode = 'video' | 'text';

export interface QueueEntry {
  socketId: string;
  mode: ChatMode;
  interests: string[];
  joinedAt: number;
}

export interface ActiveMatch {
  matchId: string;
  mode: ChatMode;
  user1: {
    socketId: string;
    interests: string[];
  };
  user2: {
    socketId: string;
    interests: string[];
  };
  sharedInterest: string | null;
  startedAt: number;
}

class MatchmakerService {
  // Waiting queues separated by mode
  private textQueue: QueueEntry[] = [];
  private videoQueue: QueueEntry[] = [];

  // Active matches indexed by matchId
  private activeMatches: Map<string, ActiveMatch> = new Map();

  // Reverse index: socketId -> matchId
  private socketToMatch: Map<string, string> = new Map();

  // Reverse index: socketId -> QueueEntry
  private socketToQueue: Map<string, QueueEntry> = new Map();

  // Total active socket connections
  private connectedSocketsCount = 0;

  /**
   * Tracks socket connection
   */
  public onSocketConnected(): void {
    this.connectedSocketsCount++;
  }

  /**
   * Tracks socket disconnection and cleans up all associated state
   */
  public onSocketDisconnected(socketId: string): { matchEnded?: ActiveMatch; partnerSocketId?: string } {
    if (this.connectedSocketsCount > 0) {
      this.connectedSocketsCount--;
    }

    this.leaveQueue(socketId);

    const matchInfo = this.getMatchBySocket(socketId);
    if (matchInfo) {
      const partnerSocketId = this.getPartnerSocketId(socketId);
      this.endMatch(matchInfo.matchId);
      return { matchEnded: matchInfo, partnerSocketId };
    }

    return {};
  }

  /**
   * Adds a user to the appropriate queue and attempts to find a match
   */
  public joinQueue(
    socketId: string,
    mode: ChatMode,
    interests: string[] = []
  ): { matched: boolean; match?: ActiveMatch; partnerSocketId?: string } {
    // If user is already in a match, remove them from it first
    const existingMatch = this.getMatchBySocket(socketId);
    if (existingMatch) {
      this.endMatch(existingMatch.matchId);
    }

    // If already in queue, remove previous entry
    this.leaveQueue(socketId);

    const normalizedInterests = interests
      .map((i) => i.trim().toLowerCase())
      .filter((i) => i.length > 0);

    const queue = mode === 'video' ? this.videoQueue : this.textQueue;

    // Try to find a partner
    let partnerIndex = -1;
    let sharedInterest: string | null = null;

    // 1. First priority: match on shared interest
    if (normalizedInterests.length > 0) {
      for (let i = 0; i < queue.length; i++) {
        const candidate = queue[i];
        if (candidate.socketId === socketId) continue;

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

    // 2. Second priority: match with the first waiting candidate if no interest match
    if (partnerIndex === -1 && queue.length > 0) {
      partnerIndex = 0;
    }

    // If partner found, pair them
    if (partnerIndex !== -1) {
      const partner = queue.splice(partnerIndex, 1)[0];
      this.socketToQueue.delete(partner.socketId);

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const activeMatch: ActiveMatch = {
        matchId,
        mode,
        user1: {
          socketId,
          interests: normalizedInterests,
        },
        user2: {
          socketId: partner.socketId,
          interests: partner.interests,
        },
        sharedInterest,
        startedAt: Date.now(),
      };

      this.activeMatches.set(matchId, activeMatch);
      this.socketToMatch.set(socketId, matchId);
      this.socketToMatch.set(partner.socketId, matchId);

      return {
        matched: true,
        match: activeMatch,
        partnerSocketId: partner.socketId,
      };
    }

    // Otherwise, add to waiting queue
    const entry: QueueEntry = {
      socketId,
      mode,
      interests: normalizedInterests,
      joinedAt: Date.now(),
    };

    queue.push(entry);
    this.socketToQueue.set(socketId, entry);

    return { matched: false };
  }

  /**
   * Removes a user from queue
   */
  public leaveQueue(socketId: string): boolean {
    const entry = this.socketToQueue.get(socketId);
    if (!entry) return false;

    this.socketToQueue.delete(socketId);
    if (entry.mode === 'video') {
      this.videoQueue = this.videoQueue.filter((e) => e.socketId !== socketId);
    } else {
      this.textQueue = this.textQueue.filter((e) => e.socketId !== socketId);
    }
    return true;
  }

  /**
   * Retrieves active match for a given socketId
   */
  public getMatchBySocket(socketId: string): ActiveMatch | undefined {
    const matchId = this.socketToMatch.get(socketId);
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
   * Ends an active match
   */
  public endMatch(matchId: string): ActiveMatch | undefined {
    const match = this.activeMatches.get(matchId);
    if (!match) return undefined;

    this.socketToMatch.delete(match.user1.socketId);
    this.socketToMatch.delete(match.user2.socketId);
    this.activeMatches.delete(matchId);

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
