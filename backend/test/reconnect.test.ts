import { describe, it, expect, beforeEach } from 'vitest';
import { ReconnectRegistry, DEFAULT_GRACE_MS } from '../src/realtime/reconnect';

describe('ReconnectRegistry', () => {
  let registry: ReconnectRegistry;
  const BASE_NOW = 1_000_000; // fixed epoch ms for deterministic tests

  beforeEach(() => {
    registry = new ReconnectRegistry();
  });

  // 1. register + get returns the entry
  it('register then get returns the stored entry', () => {
    registry.register('tok_abc', 'ROOM1', 'socket-1');
    const entry = registry.get('tok_abc');
    expect(entry).toBeDefined();
    expect(entry!.roomCode).toBe('ROOM1');
    expect(entry!.playerId).toBe('socket-1');
    expect(entry!.disconnectedAt).toBeNull();
  });

  // 2. generateToken returns unique non-empty strings across calls
  it('generateToken returns non-empty unique strings', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const tok = registry.generateToken();
      expect(typeof tok).toBe('string');
      expect(tok.length).toBeGreaterThan(0);
      tokens.add(tok);
    }
    // All 100 tokens should be unique
    expect(tokens.size).toBe(100);
  });

  // 3. markDisconnected then isWithinGrace: true just after, false after graceMs elapses
  it('isWithinGrace is true just after markDisconnected and false after grace elapses', () => {
    const GRACE = 30_000;
    registry.register('tok_xyz', 'ROOM2', 'socket-2');
    registry.markDisconnected('tok_xyz', BASE_NOW);

    // Immediately after disconnect: still within grace
    expect(registry.isWithinGrace('tok_xyz', BASE_NOW, GRACE)).toBe(true);

    // Just at the edge of grace (exactly graceMs elapsed): still within grace
    expect(registry.isWithinGrace('tok_xyz', BASE_NOW + GRACE, GRACE)).toBe(true);

    // One ms beyond grace: expired
    expect(registry.isWithinGrace('tok_xyz', BASE_NOW + GRACE + 1, GRACE)).toBe(false);
  });

  // 3b. isWithinGrace is true when not disconnected (disconnectedAt === null)
  it('isWithinGrace is true for a connected (not disconnected) player', () => {
    registry.register('tok_connected', 'ROOM3', 'socket-3');
    // disconnectedAt is null -> always within grace
    expect(registry.isWithinGrace('tok_connected', BASE_NOW, DEFAULT_GRACE_MS)).toBe(true);
  });

  // 3c. isWithinGrace returns false for unknown token
  it('isWithinGrace returns false for unknown token', () => {
    expect(registry.isWithinGrace('tok_unknown', BASE_NOW, DEFAULT_GRACE_MS)).toBe(false);
  });

  // 4. reconnect within grace updates playerId and clears disconnectedAt
  it('reconnect within grace period updates playerId and clears disconnectedAt', () => {
    const GRACE = 60_000;
    registry.register('tok_r1', 'ROOM4', 'socket-old');
    registry.markDisconnected('tok_r1', BASE_NOW);

    // Reconnect 10 seconds later (well within grace)
    const result = registry.reconnect('tok_r1', 'socket-new', BASE_NOW + 10_000, GRACE);

    expect(result).toBeDefined();
    expect(result!.playerId).toBe('socket-new');
    expect(result!.disconnectedAt).toBeNull();
    expect(result!.roomCode).toBe('ROOM4');

    // get() should also reflect the updated entry
    const entry = registry.get('tok_r1');
    expect(entry).toBeDefined();
    expect(entry!.playerId).toBe('socket-new');
    expect(entry!.disconnectedAt).toBeNull();
  });

  // 5. reconnect after grace expired returns undefined and token is removed
  it('reconnect after grace expired returns undefined and removes the token', () => {
    const GRACE = 30_000;
    registry.register('tok_expired', 'ROOM5', 'socket-5');
    registry.markDisconnected('tok_expired', BASE_NOW);

    // Try to reconnect after grace has fully elapsed (graceMs + 1 ms beyond)
    const result = registry.reconnect('tok_expired', 'socket-5-new', BASE_NOW + GRACE + 1, GRACE);

    expect(result).toBeUndefined();

    // Token should have been removed
    expect(registry.get('tok_expired')).toBeUndefined();
  });

  // 6. reconnect with unknown token returns undefined
  it('reconnect with unknown token returns undefined', () => {
    const result = registry.reconnect('tok_doesnt_exist', 'socket-x', BASE_NOW, DEFAULT_GRACE_MS);
    expect(result).toBeUndefined();
  });

  // Extra: remove deletes the token
  it('remove deletes the token from the registry', () => {
    registry.register('tok_del', 'ROOM6', 'socket-6');
    expect(registry.get('tok_del')).toBeDefined();
    registry.remove('tok_del');
    expect(registry.get('tok_del')).toBeUndefined();
  });

  // Extra: markDisconnected on unknown token does nothing (no throw)
  it('markDisconnected on unknown token does not throw', () => {
    expect(() => registry.markDisconnected('tok_unknown', BASE_NOW)).not.toThrow();
  });

  // Extra: reconnect without prior disconnect (disconnectedAt null) succeeds
  it('reconnect without prior disconnect succeeds and updates playerId', () => {
    const GRACE = 60_000;
    registry.register('tok_nodisconn', 'ROOM7', 'socket-7');
    // Never called markDisconnected — disconnectedAt is null
    const result = registry.reconnect('tok_nodisconn', 'socket-7-new', BASE_NOW, GRACE);
    expect(result).toBeDefined();
    expect(result!.playerId).toBe('socket-7-new');
    expect(result!.disconnectedAt).toBeNull();
  });
});
