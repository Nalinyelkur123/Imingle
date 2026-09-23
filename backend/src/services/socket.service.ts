// ============================================================================
// NexusChat — Socket.IO Real-Time Service
// ============================================================================
// Manages real-time WebSocket communication, matchmaking lifecycles,
// WebRTC signaling relay, and chat messaging.
// ============================================================================

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { corsOptions } from '../config/cors.js';
import { logger } from '../utils/logger.js';
import { matchmaker, ChatMode } from './matchmaker.service.js';
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

  const broadcastOnlineCount = () => {
    const stats = matchmaker.getStats();
    io.emit('online_count', { count: stats.onlineUsers });
  };

  io.on('connection', (socket: Socket) => {
    matchmaker.onSocketConnected();
    logger.info(`Socket connected: ${socket.id}`);
    broadcastOnlineCount();

    // ── JOIN QUEUE ──────────────────────────────────────────────────────────
    socket.on(
      ClientEvents.JOIN_QUEUE,
      (payload: { mode?: ChatMode; interests?: string[] }) => {
        const mode: ChatMode = payload?.mode === 'video' ? 'video' : 'text';
        const interests: string[] = Array.isArray(payload?.interests)
          ? payload.interests
          : [];

        logger.info(`Socket ${socket.id} joining queue for mode: ${mode}`);

        const result = matchmaker.joinQueue(socket.id, mode, interests);

        if (result.matched && result.match && result.partnerSocketId) {
          const partnerSocket = io.sockets.sockets.get(result.partnerSocketId);

          if (!partnerSocket) {
            // Partner dropped before pairing was finalized
            matchmaker.endMatch(result.match.matchId);
            matchmaker.joinQueue(socket.id, mode, interests);
            return;
          }

          logger.info(
            `Match formed: ${result.match.matchId} between ${socket.id} and ${result.partnerSocketId}`
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
      matchmaker.leaveQueue(socket.id);
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
        matchmaker.endMatch(match.matchId);
      }

      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.MATCH_ENDED, {
          reason: MatchEndReason.PARTNER_LEFT,
        });
      }
    });

    // ── STOP ────────────────────────────────────────────────────────────────
    socket.on(ClientEvents.STOP, () => {
      matchmaker.leaveQueue(socket.id);
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const match = matchmaker.getMatchBySocket(socket.id);

      if (match) {
        matchmaker.endMatch(match.matchId);
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

      logger.warn(`User ${socket.id} reported partner ${partnerSocketId}`, {
        reason: payload?.reason,
        description: payload?.description,
      });

      if (match) {
        matchmaker.endMatch(match.matchId);
      }

      if (partnerSocketId) {
        io.to(partnerSocketId).emit(ServerEvents.MATCH_ENDED, {
          reason: MatchEndReason.REPORTED,
        });
      }
    });

    // ── DISCONNECT ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      const cleanup = matchmaker.onSocketDisconnected(socket.id);

      if (cleanup.partnerSocketId) {
        io.to(cleanup.partnerSocketId).emit(ServerEvents.PARTNER_DISCONNECTED, {});
        io.to(cleanup.partnerSocketId).emit(ServerEvents.MATCH_ENDED, {
          reason: MatchEndReason.PARTNER_DISCONNECTED,
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
