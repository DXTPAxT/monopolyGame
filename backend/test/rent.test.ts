import { describe, it, expect } from 'vitest';
import { calcRent } from '../src/game/engine/rent';
import { GameState, TileState, Player } from '../src/game/types';
import { DEFAULT_ROOM_SETTINGS } from '../src/game/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTileState(overrides: Partial<TileState> & { id: number }): TileState {
  return {
    ownerId: null,
    houses: 0,
    hotel: false,
    mortgaged: false,
    ...overrides,
  };
}

function makeState(tiles: TileState[]): GameState {
  // We only need tiles; cast all other fields.
  return {
    roomCode: 'TEST',
    players: [] as Player[],
    tiles,
    activePlayerIndex: 0,
    dice: [1, 1],
    diceRolled: false,
    hasMoved: false,
    currentActionRequired: 'none',
    pendingPayment: null,
    winnerId: null,
    logs: [],
    activeCard: null,
    activeModal: null,
    modalPayload: null,
    settings: DEFAULT_ROOM_SETTINGS,
    freeParkingPot: 0,
    auction: null,
    pendingTrades: [],
    rolledDoubles: false,
    doublesCount: 0,
    turnDeadline: null,
  } as GameState;
}

// Tile ids used in tests:
//   Property brown group: id 1 (rent [2,10,30,90,160,250]) and id 3 (rent [4,20,60,180,320,450])
//   Railroad: id 5, 15, 25, 35
//   Utility: id 12 and id 28
const OWNER = 'player1';

// ---------------------------------------------------------------------------
// 1. Property — no houses, owner does NOT own full group → rent[0]
// ---------------------------------------------------------------------------
describe('Property - partial group ownership', () => {
  it('returns rent[0] when owner does not own the full color group', () => {
    const tiles = [
      makeTileState({ id: 1, ownerId: OWNER }),
      makeTileState({ id: 3, ownerId: null }), // other brown tile, unowned
    ];
    const state = makeState(tiles);
    // rent[0] for tile 1 is 2
    expect(calcRent(state, 1, 7)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Property — no houses, owner OWNS full group → rent[0] * 2
// ---------------------------------------------------------------------------
describe('Property - full group monopoly', () => {
  it('returns rent[0]*2 when owner owns the full color group', () => {
    const tiles = [
      makeTileState({ id: 1, ownerId: OWNER }),
      makeTileState({ id: 3, ownerId: OWNER }), // both brown tiles owned
    ];
    const state = makeState(tiles);
    // rent[0] for tile 1 is 2 → 2*2 = 4
    expect(calcRent(state, 1, 7)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 3. Property with 3 houses → rent[3]
// ---------------------------------------------------------------------------
describe('Property - 3 houses', () => {
  it('returns rent[3] when tile has 3 houses', () => {
    const tiles = [
      makeTileState({ id: 1, ownerId: OWNER, houses: 3 }),
      makeTileState({ id: 3, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    // rent[3] for tile 1 is 90
    expect(calcRent(state, 1, 7)).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// 4. Property with hotel → rent[5]
// ---------------------------------------------------------------------------
describe('Property - hotel', () => {
  it('returns rent[5] when tile has a hotel', () => {
    const tiles = [
      makeTileState({ id: 1, ownerId: OWNER, hotel: true }),
      makeTileState({ id: 3, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    // rent[5] for tile 1 is 250
    expect(calcRent(state, 1, 7)).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// 5. Property mortgaged → 0
// ---------------------------------------------------------------------------
describe('Property - mortgaged', () => {
  it('returns 0 when tile is mortgaged', () => {
    const tiles = [
      makeTileState({ id: 1, ownerId: OWNER, mortgaged: true }),
      makeTileState({ id: 3, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 1, 7)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Railroad: 1 / 2 / 4 railroads → 25 / 50 / 200
// ---------------------------------------------------------------------------
describe('Railroad rent', () => {
  it('returns 25 when owner has 1 railroad', () => {
    const tiles = [
      makeTileState({ id: 5, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 5, 7)).toBe(25);
  });

  it('returns 50 when owner has 2 railroads', () => {
    const tiles = [
      makeTileState({ id: 5, ownerId: OWNER }),
      makeTileState({ id: 15, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 5, 7)).toBe(50);
  });

  it('returns 200 when owner has 4 railroads', () => {
    const tiles = [
      makeTileState({ id: 5, ownerId: OWNER }),
      makeTileState({ id: 15, ownerId: OWNER }),
      makeTileState({ id: 25, ownerId: OWNER }),
      makeTileState({ id: 35, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 5, 7)).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 7. Utility: 1 utility with diceTotal=10 → 40; 2 utilities → 100
// ---------------------------------------------------------------------------
describe('Utility rent', () => {
  it('returns 4 * diceTotal (=40) when owner has 1 utility and diceTotal=10', () => {
    const tiles = [
      makeTileState({ id: 12, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 12, 10)).toBe(40);
  });

  it('returns 10 * diceTotal (=100) when owner has 2 utilities and diceTotal=10', () => {
    const tiles = [
      makeTileState({ id: 12, ownerId: OWNER }),
      makeTileState({ id: 28, ownerId: OWNER }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 12, 10)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 8. Unowned tile → 0
// ---------------------------------------------------------------------------
describe('Unowned tile', () => {
  it('returns 0 for an unowned property', () => {
    const tiles = [
      makeTileState({ id: 1, ownerId: null }),
      makeTileState({ id: 3, ownerId: null }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 1, 7)).toBe(0);
  });

  it('returns 0 for an unowned railroad', () => {
    const tiles = [
      makeTileState({ id: 5, ownerId: null }),
    ];
    const state = makeState(tiles);
    expect(calcRent(state, 5, 7)).toBe(0);
  });
});
