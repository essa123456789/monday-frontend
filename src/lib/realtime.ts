import { getSession, tryRefresh } from "./auth";
import type { TaskCard } from "./types";

/** Random id for this browser tab; sent with API calls so the server can tag
 * broadcasts and this tab can ignore its own echoes. */
export const clientId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export interface RealtimeEvent {
  event: "task_changed" | "board_changed" | "notification" | "membership_changed";
  board?: number;
  origin?: string | null;
  /** task_changed: the single card to patch in place. */
  task?: TaskCard;
  /** notification: the notification payload. */
  notification?: unknown;
  /** membership_changed: which workspace, and how it changed. */
  workspace?: number;
  role?: string;
  removed?: boolean;
}

/** Socket close code the server uses when the access JWT is invalid/expired. */
const TOKEN_EXPIRED_CODE = 4401;

type Handler = (e: RealtimeEvent) => void;

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api")
  .replace(/^http/, "ws")
  .replace(/\/api\/?$/, "");

let socket: WebSocket | null = null;
let handlers: Handler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function connect() {
  const session = getSession();
  if (!session) return;
  try {
    socket = new WebSocket(`${WS_BASE}/ws/?token=${encodeURIComponent(session.access)}`);
  } catch {
    scheduleReconnect();
    return;
  }
  socket.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data) as RealtimeEvent;
      handlers.forEach((h) => h(data));
    } catch {
      /* ignore malformed frames */
    }
  };
  socket.onclose = (ev) => {
    socket = null;
    // Expired/invalid token: refresh before reconnecting, otherwise we'd just
    // loop reconnecting with the same dead token until an API call refreshes it.
    if (ev.code === TOKEN_EXPIRED_CODE) {
      tryRefresh().finally(scheduleReconnect);
      return;
    }
    scheduleReconnect();
  };
  socket.onerror = () => {
    socket?.close();
  };
}

function scheduleReconnect() {
  if (!started || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

/** Start (or keep) the singleton connection. Safe to call repeatedly. */
export function ensureRealtime() {
  started = true;
  if (typeof window === "undefined") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING))
    return;
  connect();
}

export function onRealtimeEvent(handler: Handler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}

/** Join a board group created after the socket connected. */
export function subscribeBoard(boardId: number) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "subscribe_board", board: boardId }));
  }
}

export function stopRealtime() {
  started = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}
