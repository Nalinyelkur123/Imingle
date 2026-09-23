// ============================================================================
// NexusChat — Frontend Real-Time Socket Service
// ============================================================================

import { io, Socket } from "socket.io-client";
import { getStoredSessionToken } from "./session";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  !window.location.hostname.includes("127.0.0.1")
    ? "https://imingle-backend.onrender.com"
    : typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "http://localhost:3001");

let socketInstance: Socket | null = null;

export function getSocket(explicitToken?: string): Socket {
  const token = explicitToken || getStoredSessionToken();

  if (!socketInstance) {
    socketInstance = io(WS_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        const currentToken = explicitToken || getStoredSessionToken();
        cb({ sessionToken: currentToken || undefined });
      },
    });
  } else if (token) {
    socketInstance.auth = { sessionToken: token };
  }
  return socketInstance;
}

export function connectSocket(token?: string): Socket {
  const socket = getSocket(token);
  if (token) {
    socket.auth = { sessionToken: token };
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
}

