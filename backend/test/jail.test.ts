import { describe, it, expect, beforeEach } from 'vitest';
import { goToJail, jailAction } from '../src/game/engine/jail';
import { GameState, Player } from '../src/game/types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'TestPlayer',
    money: 1500,
    position: 0,
    isBankrupt: false,
    inJail: false,
    jailTurns: 0,
    color: 'red',
    getOutOfJailCards: 0,
    tokenSkin: 'default',
    ...overrides,
  };
}

function makeState(player: Player, overrides: Partial<GameState> = {}): GameState {
  return {
    roomCode: 'TEST',
    players: [player],
    tiles: [],
    activePlayerIndex: 0,
    dice: [1, 2] as [number, number],
    diceRolled: true,
    hasMoved: false,
    currentActionRequired: 'jail_options',
    pendingPayment: null,
    winnerId: null,
    logs: [],
    activeCard: null,
    activeModal: null,
    modalPayload: null,
    settings: {
      startingMoney: 1500,
      gameMode: 'classic',
      houseRules: { freeParkingJackpot: false, doubleGo: false, turnTimerSec: null },
      boardSkin: 'neon',
      diceSkin: 'neon',
    },
    freeParkingPot: 0,
    auction: null,
    pendingTrades: [],
    rolledDoubles: false,
    doublesCount: 0,
    turnDeadline: null,
    ...overrides,
  } as unknown as GameState;
}

// -----------------------------------------------------------------------
// 1. goToJail
// -----------------------------------------------------------------------
describe('goToJail', () => {
  it('sets position=10, inJail=true, jailTurns=0', () => {
    const player = makePlayer({ position: 25, inJail: false, jailTurns: 2 });
    const state = makeState(player);

    const result = goToJail(state, player);

    expect(player.position).toBe(10);
    expect(player.inJail).toBe(true);
    expect(player.jailTurns).toBe(0);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('does NOT award GO salary when sending to jail', () => {
    const player = makePlayer({ position: 35, money: 1500 });
    const state = makeState(player);

    goToJail(state, player);

    expect(player.money).toBe(1500); // unchanged
  });
});

// -----------------------------------------------------------------------
// 2 & 3. jailAction('pay')
// -----------------------------------------------------------------------
describe("jailAction('pay')", () => {
  it('frees player and deducts $50 when money >= 50', () => {
    const player = makePlayer({ inJail: true, jailTurns: 1, money: 200 });
    const state = makeState(player);

    const result = jailAction(state, 'pay');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(true);
    expect(player.inJail).toBe(false);
    expect(player.jailTurns).toBe(0);
    expect(player.money).toBe(150);
  });

  it('returns ok:false and keeps player in jail when money < 50', () => {
    const player = makePlayer({ inJail: true, jailTurns: 1, money: 30 });
    const state = makeState(player);

    const result = jailAction(state, 'pay');

    expect(result.ok).toBe(false);
    expect(result.freed).toBe(false);
    expect(player.inJail).toBe(true);
    expect(player.money).toBe(30); // unchanged
  });
});

// -----------------------------------------------------------------------
// 4. jailAction('use_card')
// -----------------------------------------------------------------------
describe("jailAction('use_card')", () => {
  it('frees player and decrements getOutOfJailCards from 1 to 0', () => {
    const player = makePlayer({ inJail: true, jailTurns: 0, getOutOfJailCards: 1 });
    const state = makeState(player);

    const result = jailAction(state, 'use_card');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(true);
    expect(player.inJail).toBe(false);
    expect(player.jailTurns).toBe(0);
    expect(player.getOutOfJailCards).toBe(0);
  });

  it('returns ok:false when player has 0 cards', () => {
    const player = makePlayer({ inJail: true, jailTurns: 0, getOutOfJailCards: 0 });
    const state = makeState(player);

    const result = jailAction(state, 'use_card');

    expect(result.ok).toBe(false);
    expect(result.freed).toBe(false);
    expect(player.inJail).toBe(true);
  });
});

// -----------------------------------------------------------------------
// 5. jailAction('roll') — double [3,3]
// -----------------------------------------------------------------------
describe("jailAction('roll') — doubles", () => {
  it('frees player and moves by 6 when dice is [3,3]', () => {
    const player = makePlayer({ inJail: true, jailTurns: 0, position: 10, money: 1500 });
    const state = makeState(player, { dice: [3, 3] });

    const result = jailAction(state, 'roll');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(true);
    expect(player.inJail).toBe(false);
    expect(player.jailTurns).toBe(0);
    expect(player.position).toBe(16); // 10 + 3 + 3 = 16
  });
});

// -----------------------------------------------------------------------
// 6. jailAction('roll') — non-double, jailTurns 0 -> 1
// -----------------------------------------------------------------------
describe("jailAction('roll') — non-double, first two turns", () => {
  it('increments jailTurns from 0 to 1 and keeps player in jail', () => {
    const player = makePlayer({ inJail: true, jailTurns: 0, position: 10 });
    const state = makeState(player, { dice: [1, 3] });

    const result = jailAction(state, 'roll');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(false);
    expect(player.inJail).toBe(true);
    expect(player.jailTurns).toBe(1);
    expect(player.position).toBe(10); // did not move
  });

  it('increments jailTurns from 1 to 2 and keeps player in jail', () => {
    const player = makePlayer({ inJail: true, jailTurns: 1, position: 10 });
    const state = makeState(player, { dice: [2, 5] });

    const result = jailAction(state, 'roll');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(false);
    expect(player.inJail).toBe(true);
    expect(player.jailTurns).toBe(2);
    expect(player.position).toBe(10);
  });
});

// -----------------------------------------------------------------------
// 7. jailAction('roll') — non-double when jailTurns already 2 (3rd turn)
// -----------------------------------------------------------------------
describe("jailAction('roll') — forced pay on 3rd turn", () => {
  it('reaches jailTurns=3, pays $50 and moves (money >= 50)', () => {
    const player = makePlayer({ inJail: true, jailTurns: 2, position: 10, money: 500 });
    const state = makeState(player, { dice: [2, 4] }); // sum=6, not a double

    const result = jailAction(state, 'roll');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(true);
    expect(player.inJail).toBe(false);
    expect(player.jailTurns).toBe(0);
    expect(player.money).toBe(450); // 500 - 50
    expect(player.position).toBe(16); // 10 + 6
  });

  it('reaches jailTurns=3 but money<50 -> must_raise_funds, still in jail', () => {
    const player = makePlayer({ inJail: true, jailTurns: 2, position: 10, money: 30 });
    const state = makeState(player, { dice: [1, 4] }); // not a double

    const result = jailAction(state, 'roll');

    expect(result.ok).toBe(true);
    expect(result.freed).toBe(false);
    expect(player.inJail).toBe(true);
    expect(state.currentActionRequired).toBe('must_raise_funds');
    expect(player.position).toBe(10); // did not move
    expect(player.money).toBe(30); // unchanged
  });
});
