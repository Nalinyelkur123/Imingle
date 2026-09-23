// ============================================================================
// NexusChat — Socket.IO Event Definitions
// ============================================================================
// Single source of truth for all WebSocket event names.
// The frontend imports a copy of these types from its own services/api folder.
// ============================================================================

// ── Client → Server Events ──────────────────────────────────────────────────
export const JOIN_QUEUE = 'join_queue' as const;
export const LEAVE_QUEUE = 'leave_queue' as const;
export const NEXT = 'next' as const;
export const STOP = 'stop' as const;
export const SEND_MESSAGE = 'send_message' as const;
export const REPORT_USER = 'report_user' as const;
export const BLOCK_USER = 'block_user' as const;
export const WEBRTC_OFFER = 'webrtc_offer' as const;
export const WEBRTC_ANSWER = 'webrtc_answer' as const;
export const ICE_CANDIDATE = 'ice_candidate' as const;

// ── Server → Client Events ──────────────────────────────────────────────────
export const MATCH_FOUND = 'match_found' as const;
export const MATCH_ENDED = 'match_ended' as const;
export const PARTNER_DISCONNECTED = 'partner_disconnected' as const;
export const MESSAGE_RECEIVED = 'message_received' as const;
export const QUEUE_STATUS = 'queue_status' as const;
export const ERROR = 'error' as const;

export const ClientEvents = {
  JOIN_QUEUE, LEAVE_QUEUE, NEXT, STOP, SEND_MESSAGE,
  REPORT_USER, BLOCK_USER, WEBRTC_OFFER, WEBRTC_ANSWER, ICE_CANDIDATE,
} as const;

export const ServerEvents = {
  MATCH_FOUND, MATCH_ENDED, PARTNER_DISCONNECTED, MESSAGE_RECEIVED,
  QUEUE_STATUS, ERROR, WEBRTC_OFFER, WEBRTC_ANSWER, ICE_CANDIDATE,
} as const;

// ── Chat State ──────────────────────────────────────────────────────────────
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

// ── Match ───────────────────────────────────────────────────────────────────
export interface MatchInfo {
  matchId: string;
  partnerId: string;
  isInitiator: boolean;
}

// ── Messages ────────────────────────────────────────────────────────────────
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

// ── Reports ─────────────────────────────────────────────────────────────────
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

// ── WebRTC Signaling ────────────────────────────────────────────────────────
export interface WebRTCOfferPayload { sdp: string; }
export interface WebRTCAnswerPayload { sdp: string; }
export interface ICECandidatePayload {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

// ── Queue / Error ───────────────────────────────────────────────────────────
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

// ── Moderation ──────────────────────────────────────────────────────────────
export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  ACTIONED = 'actioned',
  DISMISSED = 'dismissed',
}

export enum BanStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  LIFTED = 'lifted',
}

// ── ICE Servers ─────────────────────────────────────────────────────────────
export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────
export const MAX_MESSAGE_LENGTH = 500;
export const MESSAGE_RATE_LIMIT = 30;
export const REPORT_RATE_LIMIT = 5;
export const QUEUE_TIMEOUT_SECONDS = 120;
export const WEBRTC_CONNECTION_TIMEOUT_SECONDS = 15;
export const MAX_REPORT_DESCRIPTION_LENGTH = 1000;
export const NEXT_COOLDOWN_MS = 2000;
export const HEALTH_CHECK_PATH = '/health';
