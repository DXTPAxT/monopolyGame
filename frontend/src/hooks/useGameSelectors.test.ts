import { describe, it, expect } from 'vitest';
import {
  getTileMeta,
  netWorth,
  myProperties,
  ownsFullGroup,
  canBuild,
  currentRent,
} from './useGameSelectors';
import type { GameState, TileState } from '../types/game';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal TileState. Defaults: unowned, 0 houses, no hotel, not mortgaged, ownerVisits=0. */
function tile(
  id: number,
  overrides: Partial<TileState> = {},
): TileState {
  return {
    id,
    ownerId: null,
    houses: 0,
    hotel: false,
    mortgaged: false,
    ownerVisits: 0,
    ...overrides,
  };
}

/**
 * Build a minimal GameState with only the tiles we care about.
 * All 40 board positions are covered — tiles not in `tileStates` default to unowned.
 */
function makeState(
  players: { id: string; money: number; position?: number }[],
  tileStates: TileState[],
): GameState {
  // Build a full 40-tile array; caller's overrides win.
  const allTiles: TileState[] = Array.from({ length: 40 }, (_, i) => {
    const override = tileStates.find((t) => t.id === i);
    return override ?? tile(i);
  });

  return {
    players: players.map((p) => ({
      id: p.id,
      money: p.money,
      name: p.id,
      position: p.position ?? 0,
      isBankrupt: false,
      inJail: false,
      jailTurns: 0,
      color: 'red',
      getOutOfJailCards: 0,
      tokenSkin: 'default',
    })),
    tiles: allTiles,
  } as unknown as GameState;
}

// ── Board ids used in tests ───────────────────────────────────────────────────
// brown:     {1, 3}        price=60, housePrice=50
// light_blue:{6, 8, 9}    price 100/100/120, housePrice=50
// orange:    {16, 18, 19}  price 180/180/200, housePrice=100
// railroad:  {5, 15, 25, 35}
// utility:   {12, 28}

// ─────────────────────────────────────────────────────────────────────────────
describe('getTileMeta', () => {
  it('returns metadata for a valid tile id', () => {
    const meta = getTileMeta(1);
    expect(meta.id).toBe(1);
    expect(meta.group).toBe('brown');
    expect(meta.price).toBe(60);
  });

  it('throws for an invalid tile id', () => {
    expect(() => getTileMeta(99)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('netWorth', () => {
  it('returns just money when player owns nothing', () => {
    const state = makeState([{ id: 'p1', money: 1500 }], []);
    expect(netWorth(state, 'p1')).toBe(1500);
  });

  it('adds full property price when not mortgaged', () => {
    // tile 1: price 60
    const state = makeState(
      [{ id: 'p1', money: 1000 }],
      [tile(1, { ownerId: 'p1' })],
    );
    expect(netWorth(state, 'p1')).toBe(1000 + 60);
  });

  it('adds half price (floored) when mortgaged', () => {
    // tile 1: price 60 -> floor(60/2) = 30
    const state = makeState(
      [{ id: 'p1', money: 1000 }],
      [tile(1, { ownerId: 'p1', mortgaged: true })],
    );
    expect(netWorth(state, 'p1')).toBe(1000 + 30);
  });

  it('adds houses * housePrice to value', () => {
    // tile 1: price=60, housePrice=50, 2 houses -> +60 +100
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(1, { ownerId: 'p1', houses: 2 })],
    );
    expect(netWorth(state, 'p1')).toBe(500 + 60 + 100);
  });

  it('counts a hotel as 5 * housePrice', () => {
    // tile 1: price=60, housePrice=50, hotel -> +60 +250
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(1, { ownerId: 'p1', hotel: true })],
    );
    expect(netWorth(state, 'p1')).toBe(500 + 60 + 250);
  });

  it('combines multiple properties correctly', () => {
    // tile 1: price=60, unmortgaged; tile 3: price=60, mortgaged (=30)
    const state = makeState(
      [{ id: 'p1', money: 200 }],
      [
        tile(1, { ownerId: 'p1' }),
        tile(3, { ownerId: 'p1', mortgaged: true }),
      ],
    );
    expect(netWorth(state, 'p1')).toBe(200 + 60 + 30);
  });

  it('ignores tiles owned by other players', () => {
    const state = makeState(
      [
        { id: 'p1', money: 500 },
        { id: 'p2', money: 100 },
      ],
      [
        tile(1, { ownerId: 'p1' }),
        tile(3, { ownerId: 'p2' }),
      ],
    );
    expect(netWorth(state, 'p1')).toBe(500 + 60);
  });

  it('returns 0 for unknown player', () => {
    const state = makeState([{ id: 'p1', money: 500 }], []);
    expect(netWorth(state, 'ghost')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('myProperties', () => {
  it('returns empty array when player owns nothing', () => {
    const state = makeState([{ id: 'p1', money: 1500 }], []);
    expect(myProperties(state, 'p1')).toEqual([]);
  });

  it('returns only tiles owned by the player', () => {
    const state = makeState(
      [
        { id: 'p1', money: 500 },
        { id: 'p2', money: 500 },
      ],
      [
        tile(1, { ownerId: 'p1' }),
        tile(3, { ownerId: 'p2' }),
        tile(16, { ownerId: 'p1' }),
      ],
    );
    const result = myProperties(state, 'p1');
    expect(result.map((r) => r.meta.id)).toEqual([1, 16]);
  });

  it('returns tiles sorted by id ascending', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(19, { ownerId: 'p1' }),
        tile(16, { ownerId: 'p1' }),
        tile(18, { ownerId: 'p1' }),
      ],
    );
    const result = myProperties(state, 'p1');
    expect(result.map((r) => r.meta.id)).toEqual([16, 18, 19]);
  });

  it('includes both meta and state in each entry', () => {
    const ts = tile(1, { ownerId: 'p1', houses: 2 });
    const state = makeState([{ id: 'p1', money: 500 }], [ts]);
    const [entry] = myProperties(state, 'p1');
    expect(entry.meta.id).toBe(1);
    expect(entry.meta.group).toBe('brown');
    expect(entry.state.houses).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ownsFullGroup', () => {
  it('returns false when player owns only part of a group', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(1, { ownerId: 'p1' })], // brown needs 1 AND 3
    );
    expect(ownsFullGroup(state, 'brown', 'p1')).toBe(false);
  });

  it('returns true when player owns entire group', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(1, { ownerId: 'p1' }),
        tile(3, { ownerId: 'p1' }),
      ],
    );
    expect(ownsFullGroup(state, 'brown', 'p1')).toBe(true);
  });

  it('returns false when another player owns a tile in the group', () => {
    const state = makeState(
      [
        { id: 'p1', money: 500 },
        { id: 'p2', money: 500 },
      ],
      [
        tile(1, { ownerId: 'p1' }),
        tile(3, { ownerId: 'p2' }),
      ],
    );
    expect(ownsFullGroup(state, 'brown', 'p1')).toBe(false);
  });

  it('returns false for a non-existent group', () => {
    const state = makeState([{ id: 'p1', money: 500 }], []);
    expect(ownsFullGroup(state, 'nonexistent', 'p1')).toBe(false);
  });

  it('works for a 3-tile group (orange)', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(16, { ownerId: 'p1' }),
        tile(18, { ownerId: 'p1' }),
        tile(19, { ownerId: 'p1' }),
      ],
    );
    expect(ownsFullGroup(state, 'orange', 'p1')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Luật xây mới 2026-06-23: xây khi đáp ô, không cần trọn nhóm màu.
describe('canBuild', () => {
  it('returns false when player does not own the tile', () => {
    // p1 đứng trên ô 1 nhưng không phải chủ
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [tile(1, { ownerId: 'p2' as unknown as string, ownerVisits: 1 })],
    );
    expect(canBuild(state, 1, 'p1')).toBe(false);
  });

  it('returns false when player is not standing on the tile', () => {
    // p1 sở hữu ô 1 nhưng đang đứng ở ô 0 (không đáp xuống)
    const state = makeState(
      [{ id: 'p1', money: 500, position: 0 }],
      [tile(1, { ownerId: 'p1', ownerVisits: 1 })],
    );
    expect(canBuild(state, 1, 'p1')).toBe(false);
  });

  it('returns true when player owns tile and is standing on it (không cần trọn nhóm)', () => {
    // Chỉ sở hữu 1 trong 2 ô nhóm brown vẫn được xây khi đứng trên ô đó
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [tile(1, { ownerId: 'p1', ownerVisits: 1 })], // chỉ có ô 1, không có ô 3
    );
    expect(canBuild(state, 1, 'p1')).toBe(true);
  });

  it('returns false when tile already has a hotel', () => {
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [tile(1, { ownerId: 'p1', hotel: true, ownerVisits: 2 })],
    );
    expect(canBuild(state, 1, 'p1')).toBe(false);
  });

  it('returns false when tile is mortgaged', () => {
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [tile(1, { ownerId: 'p1', mortgaged: true, ownerVisits: 1 })],
    );
    expect(canBuild(state, 1, 'p1')).toBe(false);
  });

  it('returns false for non-property tile (railroad)', () => {
    const state = makeState(
      [{ id: 'p1', money: 500, position: 5 }],
      [tile(5, { ownerId: 'p1', ownerVisits: 1 })],
    );
    expect(canBuild(state, 5, 'p1')).toBe(false);
  });

  it('chặn khách sạn khi ownerVisits < 2', () => {
    // 4 nhà sẵn nhưng ownerVisits = 1 (lần đáp đầu) → không lên khách sạn
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [tile(1, { ownerId: 'p1', houses: 4, ownerVisits: 1 })],
    );
    expect(canBuild(state, 1, 'p1')).toBe(false);
  });

  it('cho phép khách sạn khi ownerVisits >= 2 và đủ 4 nhà', () => {
    // ownerVisits = 2 (lần đáp thứ hai) và có 4 nhà → được lên khách sạn
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [tile(1, { ownerId: 'p1', houses: 4, ownerVisits: 2 })],
    );
    expect(canBuild(state, 1, 'p1')).toBe(true);
  });

  it('không bắt buộc xây đều — cho xây ô bất kỳ trong nhóm khi đứng trên đó', () => {
    // tile 1 có 2 nhà, tile 3 có 0 nhà; p1 đứng trên tile 1 → vẫn được xây
    const state = makeState(
      [{ id: 'p1', money: 500, position: 1 }],
      [
        tile(1, { ownerId: 'p1', houses: 2, ownerVisits: 1 }),
        tile(3, { ownerId: 'p1', houses: 0, ownerVisits: 1 }),
      ],
    );
    expect(canBuild(state, 1, 'p1')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('currentRent', () => {
  it('returns 0 for unowned tile', () => {
    const state = makeState([{ id: 'p1', money: 500 }], []);
    expect(currentRent(state, 1)).toBe(0);
  });

  it('returns 0 for mortgaged property', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(1, { ownerId: 'p1', mortgaged: true })],
    );
    expect(currentRent(state, 1)).toBe(0);
  });

  it('returns base rent when no full group', () => {
    // tile 1 only (not full brown group) -> rent[0] = 2
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(1, { ownerId: 'p1' })],
    );
    expect(currentRent(state, 1)).toBe(2);
  });

  it('returns double base rent when owns full group, no houses', () => {
    // full brown: tile 1 rent[0]=2 -> 4; tile 3 rent[0]=4 -> 8
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(1, { ownerId: 'p1' }),
        tile(3, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 1)).toBe(4);  // 2*2
    expect(currentRent(state, 3)).toBe(8);  // 4*2
  });

  it('returns rent[houses] when houses > 0', () => {
    // tile 1 with 2 houses: rent[2] = 30
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(1, { ownerId: 'p1', houses: 2 }),
        tile(3, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 1)).toBe(30);
  });

  it('returns rent[5] for hotel', () => {
    // tile 1 with hotel: rent[5] = 250
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(1, { ownerId: 'p1', hotel: true }),
        tile(3, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 1)).toBe(250);
  });

  // Railroad tests
  it('returns 25 for 1 railroad owned', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(5, { ownerId: 'p1' })],
    );
    expect(currentRent(state, 5)).toBe(25);
  });

  it('returns 50 for 2 railroads owned', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(5, { ownerId: 'p1' }),
        tile(15, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 5)).toBe(50);
    expect(currentRent(state, 15)).toBe(50);
  });

  it('returns 100 for 3 railroads owned', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(5, { ownerId: 'p1' }),
        tile(15, { ownerId: 'p1' }),
        tile(25, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 5)).toBe(100);
  });

  it('returns 200 for 4 railroads owned', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(5, { ownerId: 'p1' }),
        tile(15, { ownerId: 'p1' }),
        tile(25, { ownerId: 'p1' }),
        tile(35, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 5)).toBe(200);
  });

  it('returns 0 for mortgaged railroad', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(5, { ownerId: 'p1', mortgaged: true })],
    );
    expect(currentRent(state, 5)).toBe(0);
  });

  // Utility tests
  it('returns 4 * diceTotal for 1 utility owned', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(12, { ownerId: 'p1' })],
    );
    expect(currentRent(state, 12, 8)).toBe(32); // 4 * 8
  });

  it('returns 10 * diceTotal for 2 utilities owned', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(12, { ownerId: 'p1' }),
        tile(28, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 12, 6)).toBe(60); // 10 * 6
    expect(currentRent(state, 28, 6)).toBe(60);
  });

  it('uses default diceTotal=7 for utility when none provided', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(12, { ownerId: 'p1' })],
    );
    expect(currentRent(state, 12)).toBe(28); // 4 * 7
  });

  it('returns 0 for mortgaged utility', () => {
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [tile(12, { ownerId: 'p1', mortgaged: true })],
    );
    expect(currentRent(state, 12)).toBe(0);
  });

  it('returns 0 for non-rentable tile (GO)', () => {
    const state = makeState([{ id: 'p1', money: 500 }], []);
    expect(currentRent(state, 0)).toBe(0);
  });

  it('railroad: mortgaged ones do not count toward owned count', () => {
    // p1 owns 5 (mortgaged) and 15 (active) -> effective count = 1 -> rent = 25
    const state = makeState(
      [{ id: 'p1', money: 500 }],
      [
        tile(5, { ownerId: 'p1', mortgaged: true }),
        tile(15, { ownerId: 'p1' }),
      ],
    );
    expect(currentRent(state, 15)).toBe(25);
  });
});
