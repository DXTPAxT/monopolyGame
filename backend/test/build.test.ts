import { describe, it, expect } from 'vitest';
import { buildHouse, sellHouse, houseInventory } from '../src/game/engine/build';
import { GameState, TileState, Player } from '../src/game/types';

// orange group = tiles {16,18,19}, housePrice 100. brown = {1,3} housePrice 50.
function tile(id: number, ownerId: string | null, over: Partial<TileState> = {}): TileState {
  return { id, ownerId, houses: 0, hotel: false, mortgaged: false, ownerVisits: 1, ...over };
}
function player(id: string, money: number, position = 0): Player {
  return {
    id, name: id, money, position, isBankrupt: false, inJail: false,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default',
  };
}
function makeState(tiles: TileState[], money = 5000, position = 0): GameState {
  return {
    players: [player('p1', money, position)],
    activePlayerIndex: 0,
    tiles,
  } as unknown as GameState;
}

describe('build — luật mới (xây khi đáp xuống ô)', () => {
  it('xây được dù KHÔNG sở hữu trọn nhóm màu, miễn đang đứng trên ô', () => {
    // chỉ sở hữu 1 ô lẻ (16) trong nhóm orange, đứng trên ô đó
    const state = makeState([tile(16, 'p1'), tile(18, 'p2'), tile(19, null)], 5000, 16);
    const res = buildHouse(state, 16);
    expect(res.ok).toBe(true);
    expect(state.tiles.find((t) => t.id === 16)!.houses).toBe(1);
    expect(state.players[0].money).toBe(4900); // housePrice 100
  });

  it('KHÔNG xây được nếu không đứng trên ô', () => {
    const state = makeState([tile(16, 'p1')], 5000, 39);
    expect(buildHouse(state, 16).ok).toBe(false);
  });

  it('xây nhiều cấp trên cùng ô không cần xây đều (ô khác trong nhóm 0 nhà)', () => {
    const state = makeState([tile(16, 'p1', { houses: 2 }), tile(18, 'p1', { houses: 0 }), tile(19, 'p1', { houses: 0 })], 5000, 16);
    const res = buildHouse(state, 16);
    expect(res.ok).toBe(true);
    expect(state.tiles.find((t) => t.id === 16)!.houses).toBe(3);
  });

  it('chặn khách sạn khi ownerVisits < 2', () => {
    const state = makeState([tile(16, 'p1', { houses: 4, ownerVisits: 1 })], 5000, 16);
    expect(buildHouse(state, 16).ok).toBe(false);
  });

  it('cho khách sạn khi ownerVisits >= 2 và đủ 4 nhà', () => {
    const state = makeState([tile(16, 'p1', { houses: 4, ownerVisits: 2 })], 5000, 16);
    const res = buildHouse(state, 16);
    expect(res.ok).toBe(true);
    expect(state.tiles.find((t) => t.id === 16)!.hotel).toBe(true);
  });

  it('không xây khi ô bị cầm cố', () => {
    const state = makeState([tile(16, 'p1', { mortgaged: true })], 5000, 16);
    expect(buildHouse(state, 16).ok).toBe(false);
  });

  it('không xây khi không đủ tiền', () => {
    const state = makeState([tile(16, 'p1')], 50, 16); // housePrice 100
    expect(buildHouse(state, 16).ok).toBe(false);
  });

  it('houseInventory counts houses and hotels; hotel tile = 0 houses', () => {
    const state = makeState([
      tile(16, 'p1', { hotel: true }),
      tile(18, 'p1', { houses: 3 }),
      tile(19, 'p1', { houses: 2 }),
    ]);
    const inv = houseInventory(state);
    expect(inv.hotelsUsed).toBe(1);
    expect(inv.housesUsed).toBe(5); // 3 + 2, hotel contributes 0
    expect(inv.housesLeft).toBe(27);
    expect(inv.hotelsLeft).toBe(11);
  });

  it('fails when housesLeft is 0', () => {
    // 32 houses used: put 4 houses on 8 separate property tiles
    const sinks = [34, 31, 32, 37, 39, 26, 27, 29].map((id) => tile(id, 'p1', { houses: 4 }));
    const state = makeState([tile(16, 'p1'), ...sinks], 5000, 16);
    const inv = houseInventory(state);
    expect(inv.housesUsed).toBe(32);
    expect(buildHouse(state, 16).ok).toBe(false);
  });
});

describe('sellHouse — bỏ bán đều', () => {
  it('bán được 1 ô lẻ trong nhóm mà không cần bán đều', () => {
    const state = makeState([tile(16, 'p1', { houses: 2 }), tile(18, 'p1', { houses: 0 }), tile(19, 'p1', { houses: 0 })], 1000);
    const res = sellHouse(state, 16);
    expect(res.ok).toBe(true);
    expect(state.tiles.find((t) => t.id === 16)!.houses).toBe(1);
    expect(state.players[0].money).toBe(1050); // refund 50
  });

  it('selling a hotel drops it back to 4 houses', () => {
    const state = makeState([tile(16, 'p1', { hotel: true })], 1000);
    const res = sellHouse(state, 16);
    expect(res.ok).toBe(true);
    const t16 = state.tiles.find((t) => t.id === 16)!;
    expect(t16.hotel).toBe(false);
    expect(t16.houses).toBe(4);
  });
});
