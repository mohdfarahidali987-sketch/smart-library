import type { Server as SocketIOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

/**
 * Broadcast to all connected students that seats have changed.
 * This triggers sub-millisecond updates across all browsers!
 */
export function emitSeatsUpdated(payload?: unknown) {
  if (globalThis.io) {
    globalThis.io.emit("seats_updated", payload || { timestamp: new Date().toISOString() });
  }
}

/**
 * Broadcast an urgent security guard announcement or closing warning.
 * Triggers instant banner update and audio chime across all devices.
 */
export function emitGuardAnnouncement(payload: { announcement: string; closeTime?: string; alertLevel?: string }) {
  if (globalThis.io) {
    globalThis.io.emit("guard_announcement", payload);
  }
}
