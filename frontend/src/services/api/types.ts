// ============================================================================
// NexusChat — Shared Types (Frontend Copy)
// ============================================================================
// These types mirror backend/src/services/shared-types.ts
// They define the contract between frontend and backend.
//
// In a production monorepo you might use a shared package. In this simpler
// structure, we keep a copy in the frontend. If you change types, update
// BOTH files.
// ============================================================================

// ── Chat State Machine ──────────────────────────────────────────────────────
export enum ChatState {
  IDLE = 'IDLE',
  REQUESTING_PERMISSIONS = 'REQUESTING_PERMISSIONS',
  READY = 'READY',
  SEARCHING = 'SEARCHING',
  MATCHED = 'MATCHED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  ENDED = 'ENDED',
}

// ── Socket Events ───────────────────────────────────────────────────────────
export const SocketEvents = {
  // Client → Server
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  NEXT: 'next',
  STOP: 'stop',
  SEND_MESSAGE: 'send_message',
  REPORT_USER: 'report_user',
  BLOCK_USER: 'block_user',
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  ICE_CANDIDATE: 'ice_candidate',

  // Server → Client
  MATCH_FOUND: 'match_found',
  MATCH_ENDED: 'match_ended',
  PARTNER_DISCONNECTED: 'partner_disconnected',
  MESSAGE_RECEIVED: 'message_received',
  QUEUE_STATUS: 'queue_status',
  ERROR: 'error',

  // Session Continuity & Reconnection
  PEER_RECONNECTING: 'peer_reconnecting',
  PEER_RECONNECTED: 'peer_reconnected',
  MATCH_RECONNECTED: 'match_reconnected',
  SESSION_EXPIRED: 'session_expired',
} as const;

// ── Types ───────────────────────────────────────────────────────────────────
export interface MatchInfo {
  matchId: string;
  partnerId: string;
  isInitiator: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isLocal: boolean;
}

export interface SendMessagePayload {
  content: string;
}

export interface MessageReceivedPayload {
  id: string;
  content: string;
  timestamp: string;
}

export enum ReportReason {
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  SEXUAL_CONTENT = 'sexual_content',
  THREATENING = 'threatening',
  SCAM = 'scam',
  OTHER = 'other',
}

export interface ReportPayload {
  reason: ReportReason;
  description?: string;
}

export interface WebRTCOfferPayload { sdp: string; }
export interface WebRTCAnswerPayload { sdp: string; }
export interface ICECandidatePayload {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

export interface QueueStatusPayload {
  position: number;
  estimatedWait: number | null;
}

export enum ErrorCode {
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  NOT_IN_MATCH = 'NOT_IN_MATCH',
  ALREADY_IN_QUEUE = 'ALREADY_IN_QUEUE',
  MATCH_FAILED = 'MATCH_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BLOCKED_USER = 'BLOCKED_USER',
  BANNED = 'BANNED',
}

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export enum MatchEndReason {
  PARTNER_LEFT = 'partner_left',
  PARTNER_DISCONNECTED = 'partner_disconnected',
  USER_NEXT = 'user_next',
  USER_STOP = 'user_stop',
  REPORTED = 'reported',
  BLOCKED = 'blocked',
  ERROR = 'error',
}

export interface MatchEndedPayload {
  reason: MatchEndReason;
}

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────
export const MAX_MESSAGE_LENGTH = 500;
export const MESSAGE_RATE_LIMIT = 30;
export const QUEUE_TIMEOUT_SECONDS = 120;
export const WEBRTC_CONNECTION_TIMEOUT_SECONDS = 15;
export const NEXT_COOLDOWN_MS = 2000;
