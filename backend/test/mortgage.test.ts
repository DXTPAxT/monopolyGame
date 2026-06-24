import { describe, it, expect } from 'vitest';
import { mortgage, unmortgage, sellDeed } from '../src/game/engine/mortgage';
import { GameState, TileState, Player } from '../src/game/types';

// brown group = tiles {1,3}, price 60. Helpers to build a minimal state.
function tile(id: number, ownerId: string | null, over: Partial<TileState> = {}): TileState {
  return { id, ownerId, houses: 0, hotel: false, mortgaged: false, ...over };
}
function player(id: string, money: number): Player {
  return {
    id, name: id, money, position: 0, isBankrupt: false, inJail: false,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default',
  };
}
function makeState(tiles: TileState[], money = 1000): GameState {
  return {
    players: [player('p1', money)],
    activePlayerIndex: 0,
    tiles,
  } as unknown as GameState;
}

describe('mortgage', () => {
  it('mortgaging adds floor(price/2) and sets mortgaged', () => {
    const state = makeState([tile(1, 'p1'), tile(3, 'p1')], 1000);
    const res = mortgage(state, 1);
    expect(res.ok).toBe(true);
    expect(state.players[0].money).toBe(1030); // 60/2 = 30
    expect(state.tiles.find((t) => t.id === 1)!.mortgaged).toBe(true);
  });

  it('fails when a tile in the same group has a house', () => {
    const state = makeState([tile(1, 'p1'), tile(3, 'p1', { houses: 1 })], 1000);
    const res = mortgage(state, 1);
    expect(res.ok).toBe(false);
    expect(state.players[0].money).toBe(1000);
  });

  it('fails when the tile is already mortgaged', () => {
    const state = makeState([tile(1, 'p1', { mortgaged: true }), tile(3, 'p1')], 1000);
    const res = mortgage(state, 1);
    expect(res.ok).toBe(false);
  });

  it('fails when not the owner', () => {
    const state = makeState([tile(1, 'p2'), tile(3, 'p2')], 1000);
    const res = mortgage(state, 1);
    expect(res.ok).toBe(false);
  });

  it('unmortgage costs ceil(price/2 * 1.1)', () => {
    const state = makeState([tile(1, 'p1', { mortgaged: true }), tile(3, 'p1')], 1000);
    const res = unmortgage(state, 1);
    expect(res.ok).toBe(true);
    // 60/2=30, *1.1=33, ceil=33
    expect(state.players[0].money).toBe(967);
    expect(state.tiles.find((t) => t.id === 1)!.mortgaged).toBe(false);
  });

  it('unmortgage fails without enough money', () => {
    const state = makeState([tile(1, 'p1', { mortgaged: true }), tile(3, 'p1')], 10);
    const res = unmortgage(state, 1);
    expect(res.ok).toBe(false);
    expect(state.tiles.find((t) => t.id === 1)!.mortgaged).toBe(true);
  });
});

describe('sellDeed (bán đứt sổ đỏ — 80%, không chuộc)', () => {
  // tile 1: price=60, housePrice=50
  it('refunds 80% of land price for an empty lot and returns tile to bank', () => {
    const state = makeState([tile(1, 'p1'), tile(3, 'p1')], 1000);
    const res = sellDeed(state, 1);
    expect(res.ok).toBe(true);
    // floor(0.8 * 60) = 48
    expect(state.players[0].money).toBe(1048);
    const ts = state.tiles.find((t) => t.id === 1)!;
    expect(ts.ownerId).toBeNull();
    expect(ts.houses).toBe(0);
    expect(ts.hotel).toBe(false);
    expect(ts.mortgaged).toBe(false);
  });

  it('refunds 80% of land + houses value', () => {
    const state = makeState([tile(1, 'p1', { houses: 2 }), tile(3, 'p1')], 1000);
    const res = sellDeed(state, 1);
    expect(res.ok).toBe(true);
    // floor(0.8 * (60 + 2*50)) = floor(0.8 * 160) = 128
    expect(state.players[0].money).toBe(1128);
    expect(state.tiles.find((t) => t.id === 1)!.ownerId).toBeNull();
  });

  it('refunds 80% of land + hotel (5 house-units) value', () => {
    const state = makeState([tile(1, 'p1', { hotel: true }), tile(3, 'p1')], 1000);
    const res = sellDeed(state, 1);
    expect(res.ok).toBe(true);
    // floor(0.8 * (60 + 5*50)) = floor(0.8 * 310) = 248
    expect(state.players[0].money).toBe(1248);
    const ts = state.tiles.find((t) => t.id === 1)!;
    expect(ts.ownerId).toBeNull();
    expect(ts.hotel).toBe(false);
  });

  it('also credits a mortgaged tile at 80% of land (debt cleared, no buildings)', () => {
    const state = makeState([tile(1, 'p1', { mortgaged: true }), tile(3, 'p1')], 1000);
    const res = sellDeed(state, 1);
    expect(res.ok).toBe(true);
    // floor(0.8 * 60) = 48
    expect(state.players[0].money).toBe(1048);
    expect(state.tiles.find((t) => t.id === 1)!.ownerId).toBeNull();
  });

  it('fails when not the owner', () => {
    const state = makeState([tile(1, 'p2'), tile(3, 'p2')], 1000);
    const res = sellDeed(state, 1);
    expect(res.ok).toBe(false);
    expect(state.players[0].money).toBe(1000);
  });
});
