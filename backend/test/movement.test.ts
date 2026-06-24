import { describe, it, expect } from 'vitest';
import { moveBy, moveTo } from '../src/game/engine/movement';
import { GameState, Player } from '../src/game/types';

// Minimal stub — only the fields movement.ts actually touches
function makePlayer(position: number, money = 1500): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    money,
    position,
    isBankrupt: false,
    inJail: false,
    jailTurns: 0,
    color: '#ff0000',
    getOutOfJailCards: 0,
    tokenSkin: 'default',
  };
}

// GameState is not used by the pure movement logic; cast an empty object
const state = {} as unknown as GameState;

describe('moveBy', () => {
  it('case 1: player at 38, moveBy 4 → newPosition 2, passedGo true, +200', () => {
    const player = makePlayer(38, 1500);
    const result = moveBy(state, player, 4);

    expect(result.newPosition).toBe(2);
    expect(result.passedGo).toBe(true);
    expect(player.position).toBe(2);
    expect(player.money).toBe(1700);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('case 2: player at 5, moveBy 3 → newPosition 8, passedGo false, money unchanged', () => {
    const player = makePlayer(5, 1500);
    const result = moveBy(state, player, 3);

    expect(result.newPosition).toBe(8);
    expect(result.passedGo).toBe(false);
    expect(player.position).toBe(8);
    expect(player.money).toBe(1500);
    expect(result.events.length).toBe(0);
  });

  it('case 3: player at 5, moveBy -3 (backward) → newPosition 2, passedGo false, money unchanged', () => {
    const player = makePlayer(5, 1500);
    const result = moveBy(state, player, -3);

    expect(result.newPosition).toBe(2);
    expect(result.passedGo).toBe(false);
    expect(player.position).toBe(2);
    expect(player.money).toBe(1500);
  });

  it('case 4: player at 2, moveBy -5 (wrap backward) → newPosition 37, passedGo false, no salary', () => {
    const player = makePlayer(2, 1500);
    const result = moveBy(state, player, -5);

    expect(result.newPosition).toBe(37);
    expect(result.passedGo).toBe(false);
    expect(player.position).toBe(37);
    expect(player.money).toBe(1500);
  });
});

describe('moveTo', () => {
  it('case 5: from 36 to tileId 5 (default grantGo) → passedGo true, +200', () => {
    const player = makePlayer(36, 1500);
    const result = moveTo(state, player, 5);

    expect(result.newPosition).toBe(5);
    expect(result.passedGo).toBe(true);
    expect(player.position).toBe(5);
    expect(player.money).toBe(1700);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('case 6: from 30 to tileId 10 with { grantGo: false } → passedGo false, no salary', () => {
    const player = makePlayer(30, 1500);
    const result = moveTo(state, player, 10, { grantGo: false });

    expect(result.newPosition).toBe(10);
    expect(result.passedGo).toBe(false);
    expect(player.position).toBe(10);
    expect(player.money).toBe(1500);
  });

  it('landing exactly on GO (tileId 0) from higher position → passedGo true, +200', () => {
    const player = makePlayer(15, 1500);
    const result = moveTo(state, player, 0);

    expect(result.newPosition).toBe(0);
    expect(result.passedGo).toBe(true);
    expect(player.money).toBe(1700);
  });

  it('moveTo a higher tileId (no wrap) → passedGo false, no salary', () => {
    const player = makePlayer(5, 1500);
    const result = moveTo(state, player, 20);

    expect(result.newPosition).toBe(20);
    expect(result.passedGo).toBe(false);
    expect(player.money).toBe(1500);
  });
});
