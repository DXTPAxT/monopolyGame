import { describe, it, expect, beforeEach } from 'vitest';
import { applyCard } from '../src/game/cards/cardEngine';
import { GameState, Player, Card, TileState } from '../src/game/types';

// ---- Helpers ----------------------------------------------------------------

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Alice',
    money: 1500,
    position: 20,
    isBankrupt: false,
    inJail: false,
    jailTurns: 0,
    color: '#ff0000',
    getOutOfJailCards: 0,
    tokenSkin: 'default',
    ...overrides,
  };
}

function makePlayer2(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p2',
    name: 'Bob',
    money: 1500,
    position: 5,
    isBankrupt: false,
    inJail: false,
    jailTurns: 0,
    color: '#0000ff',
    getOutOfJailCards: 0,
    tokenSkin: 'default',
    ...overrides,
  };
}

function makeTile(id: number, overrides: Partial<TileState> = {}): TileState {
  return {
    id,
    ownerId: null,
    houses: 0,
    hotel: false,
    mortgaged: false,
    ...overrides,
  };
}

/** Build a minimal GameState. tiles defaults to 40 empty tiles. */
function makeState(players: Player[], tiles?: TileState[]): GameState {
  const defaultTiles = Array.from({ length: 40 }, (_, i) => makeTile(i));
  return {
    players,
    tiles: tiles ?? defaultTiles,
  } as unknown as GameState;
}

function makeCard(effect: Card['effect']): Card {
  return { id: 'test-card', text: 'Test card', effect };
}

// ---- Tests ------------------------------------------------------------------

describe('cardEngine — money', () => {
  it('positive amount: player gains money', () => {
    const player = makePlayer({ money: 1000 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'money', amount: 200 });

    const { events } = applyCard(state, player, card);

    expect(player.money).toBe(1200);
    expect(events.length).toBeGreaterThan(0);
  });

  it('negative amount: player loses money', () => {
    const player = makePlayer({ money: 1000 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'money', amount: -150 });

    const { events } = applyCard(state, player, card);

    expect(player.money).toBe(850);
    expect(events.some((e) => e.includes('150'))).toBe(true);
  });
});

describe('cardEngine — moneyPerPlayer', () => {
  it('positive amount: each other player pays this player', () => {
    const alice = makePlayer({ id: 'p1', money: 1500 });
    const bob = makePlayer2({ id: 'p2', money: 1500 });
    const carol: Player = { ...makePlayer2(), id: 'p3', name: 'Carol', money: 1500 };
    const state = makeState([alice, bob, carol]);
    const card = makeCard({ kind: 'moneyPerPlayer', amount: 50 });

    applyCard(state, alice, card);

    // alice collects 50 from bob and 50 from carol
    expect(alice.money).toBe(1600);
    expect(bob.money).toBe(1450);
    expect(carol.money).toBe(1450);
  });

  it('negative amount: this player pays each other player', () => {
    const alice = makePlayer({ id: 'p1', money: 1500 });
    const bob = makePlayer2({ id: 'p2', money: 1500 });
    const state = makeState([alice, bob]);
    const card = makeCard({ kind: 'moneyPerPlayer', amount: -50 });

    applyCard(state, alice, card);

    // alice pays 50 to bob
    expect(alice.money).toBe(1450);
    expect(bob.money).toBe(1550);
  });

  it('bankrupt players are skipped', () => {
    const alice = makePlayer({ id: 'p1', money: 1500 });
    const bob = makePlayer2({ id: 'p2', money: 0, isBankrupt: true });
    const state = makeState([alice, bob]);
    const card = makeCard({ kind: 'moneyPerPlayer', amount: 50 });

    applyCard(state, alice, card);

    // no living non-bankrupt others → alice stays at 1500
    expect(alice.money).toBe(1500);
    expect(bob.money).toBe(0);
  });
});

describe('cardEngine — moveTo', () => {
  it('moveTo forward tile (no GO crossing): no salary', () => {
    const player = makePlayer({ position: 5, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'moveTo', target: 24, grantGo: true });

    applyCard(state, player, card);

    expect(player.position).toBe(24);
    expect(player.money).toBe(1500);
  });

  it('moveTo tile behind current position: passes GO, awards $200', () => {
    const player = makePlayer({ position: 30, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'moveTo', target: 5, grantGo: true });

    applyCard(state, player, card);

    expect(player.position).toBe(5);
    expect(player.money).toBe(1700);
  });

  it('moveTo with grantGo=false: no salary even when position wraps', () => {
    const player = makePlayer({ position: 30, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'moveTo', target: 10, grantGo: false });

    applyCard(state, player, card);

    expect(player.position).toBe(10);
    expect(player.money).toBe(1500);
  });
});

describe('cardEngine — moveBy', () => {
  it('positive steps (forward), no GO crossing', () => {
    const player = makePlayer({ position: 5, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'moveBy', amount: 3 });

    applyCard(state, player, card);

    expect(player.position).toBe(8);
    expect(player.money).toBe(1500);
  });

  it('forward steps crossing GO: awards $200', () => {
    const player = makePlayer({ position: 38, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'moveBy', amount: 4 });

    applyCard(state, player, card);

    expect(player.position).toBe(2);
    expect(player.money).toBe(1700);
  });

  it('negative steps (backward): no salary even crossing 0', () => {
    const player = makePlayer({ position: 2, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'moveBy', amount: -5 });

    applyCard(state, player, card);

    expect(player.position).toBe(37);
    expect(player.money).toBe(1500);
  });
});

describe('cardEngine — goToJail', () => {
  it('sends player to tile 10, sets inJail=true, jailTurns=0, no salary', () => {
    const player = makePlayer({ position: 5, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'goToJail' });

    applyCard(state, player, card);

    expect(player.position).toBe(10);
    expect(player.inJail).toBe(true);
    expect(player.jailTurns).toBe(0);
    expect(player.money).toBe(1500); // no GO salary
  });

  it('also works if player was already near GO (position 38)', () => {
    const player = makePlayer({ position: 38, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'goToJail' });

    applyCard(state, player, card);

    expect(player.position).toBe(10);
    expect(player.inJail).toBe(true);
    expect(player.money).toBe(1500); // no GO salary
  });
});

describe('cardEngine — getOutOfJail', () => {
  it('increments getOutOfJailCards by 1', () => {
    const player = makePlayer({ getOutOfJailCards: 0 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'getOutOfJail' });

    applyCard(state, player, card);

    expect(player.getOutOfJailCards).toBe(1);
  });

  it('stacks multiple jail cards', () => {
    const player = makePlayer({ getOutOfJailCards: 1 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'getOutOfJail' });

    applyCard(state, player, card);

    expect(player.getOutOfJailCards).toBe(2);
  });
});

describe('cardEngine — repairs', () => {
  it('charges per house and per hotel (mixed)', () => {
    const player = makePlayer({ id: 'p1', money: 2000 });
    // Two property tiles: one with 3 houses, one hotel
    const tiles: TileState[] = [
      makeTile(1, { ownerId: 'p1', houses: 3, hotel: false }),
      makeTile(3, { ownerId: 'p1', houses: 0, hotel: true }),
      makeTile(6, { ownerId: 'p2', houses: 2, hotel: false }), // belongs to another player
    ];
    const state = makeState([player], tiles);
    // $25 per house, $100 per hotel
    const card = makeCard({ kind: 'repairs', amount: 25, perHotel: 100 });

    applyCard(state, player, card);

    // 3 houses × 25 + 1 hotel × 100 = 75 + 100 = 175
    expect(player.money).toBe(2000 - 175);
  });

  it('no properties: charges $0', () => {
    const player = makePlayer({ id: 'p1', money: 2000 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'repairs', amount: 25, perHotel: 100 });

    applyCard(state, player, card);

    expect(player.money).toBe(2000);
  });

  it('only hotels counted as 1 hotel + 0 houses', () => {
    const player = makePlayer({ id: 'p1', money: 2000 });
    const tiles: TileState[] = [
      makeTile(1, { ownerId: 'p1', houses: 4, hotel: true }), // hotel: houses field ignored
    ];
    const state = makeState([player], tiles);
    const card = makeCard({ kind: 'repairs', amount: 40, perHotel: 115 });

    applyCard(state, player, card);

    // 0 houses × 40 + 1 hotel × 115 = 115
    expect(player.money).toBe(2000 - 115);
  });
});

describe('cardEngine — advanceToGo', () => {
  it('sets position to 0 and awards GO_SALARY', () => {
    const player = makePlayer({ position: 20, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'advanceToGo' });

    applyCard(state, player, card);

    expect(player.position).toBe(0);
    expect(player.money).toBe(1700); // 1500 + 200
  });

  it('awards salary even if player is already at GO', () => {
    const player = makePlayer({ position: 0, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'advanceToGo' });

    applyCard(state, player, card);

    expect(player.position).toBe(0);
    expect(player.money).toBe(1700);
  });
});

describe('cardEngine — nearest (railroad)', () => {
  // Railroads are at tiles 5, 15, 25, 35

  it('from position 1: nearest railroad is tile 5 (4 steps, no GO)', () => {
    const player = makePlayer({ position: 1, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'nearest', nearest: 'railroad' });

    applyCard(state, player, card);

    expect(player.position).toBe(5);
    expect(player.money).toBe(1500); // did not pass GO
  });

  it('from position 36: nearest railroad is tile 5 (wraps, 9 steps, passes GO → +200)', () => {
    const player = makePlayer({ position: 36, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'nearest', nearest: 'railroad' });

    applyCard(state, player, card);

    // 36 + 9 = 45 → 45 % 40 = 5
    expect(player.position).toBe(5);
    expect(player.money).toBe(1700); // passed GO
  });

  it('from position 25: nearest railroad is tile 35 (10 steps, no GO)', () => {
    const player = makePlayer({ position: 25, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'nearest', nearest: 'railroad' });

    applyCard(state, player, card);

    expect(player.position).toBe(35);
    expect(player.money).toBe(1500);
  });
});

describe('cardEngine — nearest (utility)', () => {
  // Utilities are at tiles 12, 28

  it('from position 10: nearest utility is tile 12 (2 steps)', () => {
    const player = makePlayer({ position: 10, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'nearest', nearest: 'utility' });

    applyCard(state, player, card);

    expect(player.position).toBe(12);
    expect(player.money).toBe(1500);
  });

  it('from position 30: nearest utility wraps to tile 12 (passes GO)', () => {
    const player = makePlayer({ position: 30, money: 1500 });
    const state = makeState([player]);
    const card = makeCard({ kind: 'nearest', nearest: 'utility' });

    applyCard(state, player, card);

    // 30 → 28? 28 is behind 30, so next is 12 (wrapping)
    // Steps from 30 to 12 forward = 40 - 30 + 12 = 22
    expect(player.position).toBe(12);
    expect(player.money).toBe(1700); // passed GO
  });
});
