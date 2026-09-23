// ============================================================================
// NexusChat — Socket.IO Real-Time Service with Session Continuity
// ============================================================================
// Manages authenticated WebSocket communication, matchmaking lifecycles,
// WebRTC signaling relay, chat messaging, and reconnection grace periods.
// ============================================================================

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { corsOptions } from '../config/cors.js';
import { logger } from '../utils/logger.js';
import { matchmaker, ChatMode } from './matchmaker.service.js';
import { sessionService } from './session.service.js';
import {
  ClientEvents,
  ServerEvents,
  MatchEndReason,
  ErrorCode,
  MAX_MESSAGE_LENGTH,
  SendMessagePayload,
  ReportPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  ICECandidatePayload,
} from './shared-types.js';

let ioInstance: SocketIOServer | null = null;

export function initSocketService(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: corsOptions,
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  ioInstance = io;

  // ── Authentication Middleware ─────────────────────────────────────────────
  // Validates cryptographically signed sessionToken during handshake, or auto-provisions
  // an anonymous session to prevent connection drops.
  io.use(async (socket, next) => {
    let token =
      socket.handshake.auth?.sessionToken ||
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.substring(7).trim()
        : null);

    if (!token && socket.handshake.headers?.cookie) {
      const match = socket.handshake.headers.cookie.match(/umingle_session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    let verified = sessionService.verifyToken(token);

    if (!verified) {
      try {
        const freshSession = await sessionService.createOrResumeSession(null, 'video');
        token = freshSession.token;
        verified = { sessionId: freshSession.sessionId, expiresAt: freshSession.expiresAt };
        logger.info(`Auto-provisioned anonymous session ${freshSession.sessionId} for socket ${socket.id}`);
      } catch (err) {
        logger.error('Failed to auto-provision anonymous session on socket handshake', {
          error: err instanceof Error ? err.message : String(err),
        });
        return next(new Error('AUTHENTICATION_ERROR: Valid anonymous session token required'));
      }
    }

    socket.data.sessionId = verified.sessionId;
    socket.data.sessionToken = token;
    next();
  });

  const broadcastOnlineCount = () => {
    const stats = matchmaker.getStats();
    io.emit('online_count', { count: stats.onlineUsers });
  };

  io.on('connection', (socket: Socket) => {
    const sessionId = socket.data.sessionId as string;
    const sessionToken = socket.data.sessionToken as string;
    matchmaker.onSocketConnected(socket.id, sessionId);
    logger.info(`Socket connected: ${socket.id} (Session: ${sessionId})`);
    broadcastOnlineCount();

    // Inform client of active session identity
    socket.emit('session_established', {
      sessionId,
      sessionToken,
    });

    // ── CHECK RECONNECTION TO ACTIVE MATCH ──────────────────────────────────
    const reconnectResult = matchmaker.handleReconnect(sessionId, socket.id);
    if (reconnectResult.resumed && reconnectResult.match && reconnectResult.partnerSocketId) {
      logger.info(`Session ${sessionId} re-established match ${reconnectResult.match.matchId}`);

      socket.emit('match_reconnected', {
        matchId: reconnectResult.match.matchId,
        partnerId: reconnectResult.partnerSocketId,
        isInitiator: reconnectResult.isInitiator,
        sharedInterest: reconnectResult.match.sharedInterest,
      });

      io.to(reconnectResult.partnerSocketId).emit('peer_reconnected', {
        matchId: reconnectResult.match.matchId,
        partnerId: socket.id,
      });
    }

    // ── JOIN QUEUE ──────────────────────────────────────────────────────────
    socket.on(
      ClientEvents.JOIN_QUEUE,
      (payload: { mode?: ChatMode; interests?: string[] }) => {
        const mode: ChatMode = payload?.mode === 'video' ? 'video' : 'text';
        const interests: string[] = Array.isArray(payload?.interests)
          ? payload.interests
          : [];

        logger.info(`Session ${sessionId} (Socket ${socket.id}) joining queue for mode: ${mode}`);

        const result = matchmaker.joinQueue(sessionId, socket.id, mode, interests);

        if (result.matched && result.match && result.partnerSocketId) {
          const partnerSocket = io.sockets.sockets.get(result.partnerSocketId);

          if (!partnerSocket) {
            // Partner dropped before pairing was finalized
            matchmaker.endMatch(result.match.matchId, 'partner_missing');
            matchmaker.joinQueue(sessionId, socket.id, mode, interests);
            return;
          }

          logger.info(
            `Match formed: ${result.match.matchId} between ${sessionId} (${socket.id}) and ${result.partnerSessionId} (${result.partnerSocketId})`
          );

          // Emit MATCH_FOUND to initiating peer (socket)
          socket.emit(ServerEvents.MATCH_FOUND, {
            matchId: result.match.matchId,
            partnerId: result.partnerSocketId,
            isInitiator: true,
            sharedInterest: result.match.sharedInterest,
          });

          // Emit MATCH_FOUND to answering peer (partner)
          partnerSocket.emit(ServerEvents.MATCH_FOUND, {
            matchId: result.match.matchId,
            partnerId: socket.id,
            isInitiator: false,
            sharedInterest: result.match.sharedInterest,
          });
        }
      }
    );

    // ── LEAVE QUEUE ─────────────────────────────────────────────────────────
    socket.on(ClientEvents.LEAVE_QUEUE, () => {
      matchmaker.leaveQueue(sessionId);
    });

    // ── SEND MESSAGE ────────────────────────────────────────────────────────
    socket.on(ClientEvents.SEND_MESSAGE, (payload: SendMessagePayload) => {
      const match = matchmaker.getMatchBySocket(socket.id);
      if (!match) {
        socket.emit(ServerEvents.ERROR, {
          code: ErrorCode.NOT_IN_MATCH,
          message: 'You are not currently connected with a stranger.',
        });
        return;
      }

      const content = (payload?.content || '').trim();
      if (!content) return;

      if (content.length > MAX_MESSAGE_LENGTH) {
        socket.emit(ServerEvents.ERROR, {
          code: ErrorCode.INVALID_MESSAGE,
          message: `Message exceeds limit of ${MAX_MESSAGE_LENGTH} characters.`,
        });
        return;
      }

      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (!partnerSocketId) return;

      const messagePayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        content,
        timestamp: new Date().toISOString(),
      };

      io.to(partnerSocketId).emit(ServerEvents.MESSAGE_RECEIVED, messagePayload);
    });

    // ── WEBRTC SIGNALING: OFFER ─────────────────────────────────────────────
    socket.on(ClientEvents.WEBRTC_OFFER, (payload: WebRTCOfferPayload) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.WEBRTC_OFFER, payload);
      }
    });

    // ── WEBRTC SIGNALING: ANSWER ────────────────────────────────────────────
    socket.on(ClientEvents.WEBRTC_ANSWER, (payload: WebRTCAnswerPayload) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.WEBRTC_ANSWER, payload);
      }
    });

    // ── WEBRTC SIGNALING: ICE CANDIDATE ─────────────────────────────────────
    socket.on(ClientEvents.ICE_CANDIDATE, (payload: ICECandidatePayload) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.ICE_CANDIDATE, payload);
      }
    });

    // ── NEXT ────────────────────────────────────────────────────────────────
    socket.on(ClientEvents.NEXT, () => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const match = matchmaker.getMatchBySocket(socket.id);

      if (match) {
        matchmaker.endMatch(match.matchId, 'next_stranger');
      }

      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.MATCH_ENDED, {
          reason: MatchEndReason.PARTNER_LEFT,
        });
      }
    });

    // ── STOP ────────────────────────────────────────────────────────────────
    socket.on(ClientEvents.STOP, () => {
      matchmaker.leaveQueue(sessionId);
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const match = matchmaker.getMatchBySocket(socket.id);

      if (match) {
        matchmaker.endMatch(match.matchId, 'user_stop');
      }

      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.MATCH_ENDED, {
          reason: MatchEndReason.USER_STOP,
        });
      }
    });

    // ── REPORT USER ─────────────────────────────────────────────────────────
    socket.on(ClientEvents.REPORT_USER, (payload: ReportPayload) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const match = matchmaker.getMatchBySocket(socket.id);

      logger.warn(`Session ${sessionId} reported partner socket ${partnerSocketId}`, {
        reason: payload?.reason,
        description: payload?.description,
      });

      if (match) {
        matchmaker.endMatch(match.matchId, 'reported');
      }

      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.MATCH_ENDED, {
          reason: MatchEndReason.REPORTED,
        });
      }
    });

    // ── DISCONNECT ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} (Session: ${sessionId})`);

      const cleanup = matchmaker.onSocketDisconnected(socket.id, (_expiredMatch, expiredPartnerSocketId) => {
        // Callback fired if 15s grace period expires without user reconnecting
        if (expiredPartnerSocketId) {
          io.to(expiredPartnerSocketId).emit(ServerEvents.PARTNER_DISCONNECTED, {});
          io.to(expiredPartnerSocketId).emit(ServerEvents.MATCH_ENDED, {
            reason: MatchEndReason.PARTNER_DISCONNECTED,
          });
        }
      });

      // If in active match, notify partner of temporary connection drop
      if (cleanup.matchPaused && cleanup.partnerSocketId) {
        io.to(cleanup.partnerSocketId).emit('peer_reconnecting', {
          graceSeconds: cleanup.graceSeconds,
        });
      }

      broadcastOnlineCount();
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
