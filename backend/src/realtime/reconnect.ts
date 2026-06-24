// A registry mapping a stable playerToken -> the player's CURRENT socket id and room.

export interface ReconnectEntry {
  roomCode: string;
  playerId: string;
  disconnectedAt: number | null;
}

export class ReconnectRegistry {
  private entries: Map<string, ReconnectEntry> = new Map();

  /** Generate a random opaque token */
  generateToken(): string {
    return `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }

  /** Remember that playerToken belongs to (roomCode, playerId) */
  register(token: string, roomCode: string, playerId: string): void {
    this.entries.set(token, { roomCode, playerId, disconnectedAt: null });
  }

  /** Look up an entry by token (or undefined) */
  get(token: string): ReconnectEntry | undefined {
    return this.entries.get(token);
  }

  /** Mark a token as disconnected at time `now` (epoch ms) */
  markDisconnected(token: string, now: number): void {
    const entry = this.entries.get(token);
    if (entry) {
      entry.disconnectedAt = now;
    }
  }

  /**
   * When a socket reconnects with token, update the stored playerId to the new socket id,
   * clear disconnectedAt; returns the entry or undefined if unknown/expired.
   */
  reconnect(token: string, newPlayerId: string, now: number, graceMs: number): ReconnectEntry | undefined {
    const entry = this.entries.get(token);
    if (!entry) {
      return undefined;
    }
    // If disconnected and grace period has elapsed, expire and remove
    if (entry.disconnectedAt !== null && (now - entry.disconnectedAt) > graceMs) {
      this.entries.delete(token);
      return undefined;
    }
    // Update to new socket id and clear disconnected status
    entry.playerId = newPlayerId;
    entry.disconnectedAt = null;
    return entry;
  }

  /**
   * True if the token is still within the grace window (or not disconnected).
   * - entry missing -> false
   * - disconnectedAt is null -> true (still connected)
   * - else (now - disconnectedAt) <= graceMs
   */
  isWithinGrace(token: string, now: number, graceMs: number): boolean {
    const entry = this.entries.get(token);
    if (!entry) {
      return false;
    }
    if (entry.disconnectedAt === null) {
      return true;
    }
    return (now - entry.disconnectedAt) <= graceMs;
  }

  /** Remove a token */
  remove(token: string): void {
    this.entries.delete(token);
  }
}

export const DEFAULT_GRACE_MS = 60_000;
