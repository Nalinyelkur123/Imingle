// ============================================================================
// NexusChat — Frontend REST API Client
// ============================================================================

import { ReportPayload } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  !window.location.hostname.includes("127.0.0.1")
    ? "https://imingle-backend.onrender.com"
    : typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "http://localhost:3001");

export interface StatsResponse {
  status: string;
  timestamp: string;
  stats: {
    onlineUsers: number;
    activeMatches: number;
    waitingQueue: {
      text: number;
      video: number;
    };
  };
}

export async function fetchLiveStats(): Promise<StatsResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as StatsResponse;
  } catch {
    return null;
  }
}

export async function submitReportApi(
  payload: ReportPayload & { matchId?: string; reportedUserId?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
