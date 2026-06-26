import { describe, it, expect } from 'vitest';
import {
  initializeGame, buyProperty, endTurn, rollDiceAndMove, declareBankruptcy,
} from '../src/game/gameEngine';
import { Player } from '../src/game/types';

function basePlayer(id: string): Player {
  return {
    id, name: id, money: 1500, position: 0, isBankrupt: false, inJail: false,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default',
  };
}

describe('gameEngine facade integration', () => {
  it('initializeGame produces a valid fresh state', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    expect(s.players).toHaveLength(2);
    // Tiền khởi điểm mặc định (DEFAULT_ROOM_SETTINGS) là $2000 — initializeGame ghi đè
    // money của mọi người chơi bằng settings.startingMoney, không dùng money truyền vào.
    expect(s.players[0].money).toBe(2000);
    expect(s.tiles).toHaveLength(40);
    expect(s.settings.startingMoney).toBe(2000);
    expect(s.freeParkingPot).toBe(0);
    expect(s.activePlayerIndex).toBe(0);
  });

  it('buyProperty transfers ownership and deducts price', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.players[0].position = 1; // Hồ Cốc, price 60
    s.currentActionRequired = 'buy_or_pass';
    const { state } = buyProperty(s);
    expect(state.tiles.find((t) => t.id === 1)!.ownerId).toBe('p1');
    // 2000 (mặc định) − 60 (giá Hồ Cốc) = 1940
    expect(state.players[0].money).toBe(1940);
    expect(state.currentActionRequired).toBe('none');
  });

  it('endTurn advances to the next player when no doubles', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.diceRolled = true;
    s.rolledDoubles = false;
    const { state } = endTurn(s);
    expect(state.activePlayerIndex).toBe(1);
    expect(state.diceRolled).toBe(false);
  });

  it('rollDiceAndMove moves the active player and sets diceRolled', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    const { state } = rollDiceAndMove(s);
    expect(state.diceRolled).toBe(true);
    // Player moved somewhere (or to jail) — position is a valid tile index.
    expect(state.players[0].position).toBeGreaterThanOrEqual(0);
    expect(state.players[0].position).toBeLessThan(40);
  });

  it('rollDiceAndMove rejects a second roll in the same turn', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    rollDiceAndMove(s);
    const { event } = rollDiceAndMove(s);
    expect(event).toContain('đã đổ xúc xắc');
  });

  it('declareBankruptcy to the bank ends the game with the survivor as winner', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.tiles.find((t) => t.id === 1)!.ownerId = 'p1';
    s.pendingPayment = { fromPlayerId: 'p1', toPlayerId: 'bank', amount: 100, purpose: 'tax' };
    const { state } = declareBankruptcy(s);
    expect(state.players[0].isBankrupt).toBe(true);
    expect(state.winnerId).toBe('p2');
    // tile returned to bank
    expect(state.tiles.find((t) => t.id === 1)!.ownerId).toBeNull();
  });
});
