/**
 * Vitest tests for src/game/engine/bankruptcy.ts
 *
 * Board tile ids used:
 *   1  - Hồ Cốc       brown  price=60  housePrice=50
 *   3  - Vũng Tàu     brown  price=60  housePrice=50
 *  39  - dark_blue     (from board for variety, but we mostly use 1 & 3)
 */

import { describe, it, expect } from 'vitest';
import {
  liquidatableWorth,
  resolveDebt,
  settleDebt,
  declareBankruptcy,
  BankruptcyResult,
} from '../src/game/engine/bankruptcy';
import { GameState, Player, TileState, PendingPayment } from '../src/game/types';

// ─────────────────────────────────────────────
// Helpers to build minimal GameState fixtures
// ─────────────────────────────────────────────

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Player 1',
    money: 1000,
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

function makeTileState(overrides: Partial<TileState> = {}): TileState {
  return {
    id: 1,
    ownerId: null,
    houses: 0,
    hotel: false,
    mortgaged: false,
    ownerVisits: 0,
    ...overrides,
  };
}

function makeState(
  players: Player[],
  tiles: TileState[],
  activePlayerIndex = 0,
  pendingPayment: PendingPayment | null = null
): GameState {
  return {
    roomCode: 'TEST',
    players,
    tiles,
    activePlayerIndex,
    dice: [1, 2],
    diceRolled: false,
    hasMoved: false,
    currentActionRequired: 'none',
    pendingPayment,
    winnerId: null,
    logs: [],
    activeCard: null,
    activeModal: null,
    modalPayload: null,
    settings: {
      startingMoney: 1500,
      gameMode: 'classic',
      houseRules: { freeParkingJackpot: false, doubleGo: false, turnTimerSec: null, allowJailDoublesContinue: false, sellDeedOutright: false },
      boardSkin: 'neon',
      diceSkin: 'neon',
    },
    freeParkingPot: 0,
    rolledDoubles: false,
    doublesCount: 0,
    turnDeadline: null,
  } as unknown as GameState;
}

// ─────────────────────────────────────────────
// 1. liquidatableWorth
// ─────────────────────────────────────────────
describe('liquidatableWorth', () => {
  it('counts only cash when player owns nothing', () => {
    const player = makePlayer({ id: 'p1', money: 300 });
    const state = makeState([player], [makeTileState({ id: 1, ownerId: null })]);
    expect(liquidatableWorth(state, 'p1')).toBe(300);
  });

  it('adds mortgage value (floor(price/2)) for unmortgaged owned tiles', () => {
    // tile 1: price=60 → mortgage value = 30
    const player = makePlayer({ id: 'p1', money: 200 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0, mortgaged: false });
    const state = makeState([player], [tile]);
    // 200 cash + 30 mortgage value = 230
    expect(liquidatableWorth(state, 'p1')).toBe(230);
  });

  it('does not count mortgage value for already-mortgaged tiles', () => {
    const player = makePlayer({ id: 'p1', money: 200 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0, mortgaged: true });
    const state = makeState([player], [tile]);
    // 200 cash + 0 (mortgaged) = 200
    expect(liquidatableWorth(state, 'p1')).toBe(200);
  });

  it('adds house sell-back value (floor(housePrice/2) per house)', () => {
    // tile 1: housePrice=50 → sell-back = 25 per house; player has 2 houses
    const player = makePlayer({ id: 'p1', money: 100 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 2, mortgaged: false });
    const state = makeState([player], [tile]);
    // 100 cash + 30 (mortgage) + 2*25 (houses) = 180
    expect(liquidatableWorth(state, 'p1')).toBe(180);
  });

  it('adds hotel sell-back value (floor(housePrice/2))', () => {
    // tile 1: housePrice=50 → sell-back = 25 per hotel
    const player = makePlayer({ id: 'p1', money: 50 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0, hotel: true, mortgaged: false });
    const state = makeState([player], [tile]);
    // 50 cash + 30 (mortgage) + 25 (hotel) = 105
    expect(liquidatableWorth(state, 'p1')).toBe(105);
  });

  it('handles multiple tiles with mixed states', () => {
    const player = makePlayer({ id: 'p1', money: 100 });
    // tile 1: price=60, housePrice=50, 1 house, unmortgaged → 30 + 25 = 55
    // tile 3: price=60, housePrice=50, 0 houses, mortgaged → 0
    const tiles = [
      makeTileState({ id: 1, ownerId: 'p1', houses: 1, mortgaged: false }),
      makeTileState({ id: 3, ownerId: 'p1', houses: 0, mortgaged: true }),
    ];
    const state = makeState([player], tiles);
    // 100 + 55 = 155
    expect(liquidatableWorth(state, 'p1')).toBe(155);
  });

  it('uses 80% of land+buildings when sellDeedOutright is on (empty lot)', () => {
    const player = makePlayer({ id: 'p1', money: 100 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0 });
    const state = makeState([player], [tile]);
    state.settings.houseRules.sellDeedOutright = true;
    // 100 + floor(0.8 * 60) = 100 + 48 = 148
    expect(liquidatableWorth(state, 'p1')).toBe(148);
  });

  it('uses 80% of land+houses when sellDeedOutright is on', () => {
    const player = makePlayer({ id: 'p1', money: 100 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 2 });
    const state = makeState([player], [tile]);
    state.settings.houseRules.sellDeedOutright = true;
    // 100 + floor(0.8 * (60 + 2*50)) = 100 + 128 = 228
    expect(liquidatableWorth(state, 'p1')).toBe(228);
  });
});

// ─────────────────────────────────────────────
// 2. resolveDebt – active player has enough cash to pay a PLAYER creditor
// ─────────────────────────────────────────────
describe('resolveDebt – immediate cash payment to player creditor', () => {
  it('deducts debt from payer, adds to creditor, returns ok:true gameOver:false', () => {
    const payer = makePlayer({ id: 'p1', money: 500 });
    const creditor = makePlayer({ id: 'p2', money: 100, name: 'Player 2', color: 'blue' });
    const state = makeState([payer, creditor], []);

    const result = resolveDebt(state, 200, 'p2', 'rent');

    expect(result.ok).toBe(true);
    expect(result.gameOver).toBe(false);
    expect(state.players.find(p => p.id === 'p1')!.money).toBe(300);
    expect(state.players.find(p => p.id === 'p2')!.money).toBe(300);
    // pendingPayment should be cleared
    expect(state.pendingPayment).toBeNull();
  });

  it('when creditor is bank, does not add money to any player', () => {
    const payer = makePlayer({ id: 'p1', money: 300 });
    const state = makeState([payer], []);

    const result = resolveDebt(state, 150, 'bank', 'tax');

    expect(result.ok).toBe(true);
    expect(result.gameOver).toBe(false);
    expect(state.players.find(p => p.id === 'p1')!.money).toBe(150);
    expect(state.pendingPayment).toBeNull();
  });
});

// ─────────────────────────────────────────────
// 3. resolveDebt – cash short but liquidatableWorth >= debt → must_raise_funds
// ─────────────────────────────────────────────
describe('resolveDebt – must raise funds', () => {
  it('sets currentActionRequired and pendingPayment when player can sell assets but lacks cash', () => {
    // player has $50 cash but tile 1 (price=60, mortgage=30) means liquidatableWorth=80
    // debt = 70: can't pay cash immediately but CAN raise enough
    const player = makePlayer({ id: 'p1', money: 50 });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0, mortgaged: false });
    const state = makeState([player], [tile]);

    const result = resolveDebt(state, 70, 'p2', 'rent');

    expect(result.ok).toBe(true);
    expect(result.gameOver).toBe(false);
    // should NOT be bankrupt
    expect(state.players.find(p => p.id === 'p1')!.isBankrupt).toBe(false);
    // must_raise_funds
    expect(state.currentActionRequired).toBe('must_raise_funds');
    expect(state.pendingPayment).not.toBeNull();
    expect(state.pendingPayment!.fromPlayerId).toBe('p1');
    expect(state.pendingPayment!.toPlayerId).toBe('p2');
    expect(state.pendingPayment!.amount).toBe(70);
    expect(state.pendingPayment!.purpose).toBe('rent');
  });
});

// ─────────────────────────────────────────────
// 4. resolveDebt – truly insolvent → bankruptcy to player creditor
// ─────────────────────────────────────────────
describe('resolveDebt – unavoidable bankruptcy to player creditor', () => {
  it('marks payer bankrupt, transfers tiles to creditor, no money transfer beyond what player has', () => {
    // payer has $30 cash, owns tile 1 (price=60, no houses, unmortgaged) → liquidatableWorth = 30+30 = 60
    // debt = 200: can't pay even after liquidating
    const payer = makePlayer({ id: 'p1', money: 30 });
    const creditor = makePlayer({ id: 'p2', money: 500, name: 'Player 2', color: 'blue' });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0, mortgaged: false });
    const state = makeState([payer, creditor], [tile]);

    const result = resolveDebt(state, 200, 'p2', 'rent');

    expect(result.ok).toBe(false); // bankruptcy happened
    expect(state.players.find(p => p.id === 'p1')!.isBankrupt).toBe(true);
    // tile transferred to creditor
    expect(state.tiles.find(t => t.id === 1)!.ownerId).toBe('p2');
    // payer money is 0
    expect(state.players.find(p => p.id === 'p1')!.money).toBe(0);
  });
});

// ─────────────────────────────────────────────
// 5. Bankruptcy to the BANK returns tiles to unowned
// ─────────────────────────────────────────────
describe('declareBankruptcy – creditor is bank', () => {
  it('returns tiles to unowned state (ownerId=null, houses=0, hotel=false, mortgaged=false)', () => {
    const bankrupt = makePlayer({ id: 'p1', money: 10 });
    const other = makePlayer({ id: 'p2', money: 500, name: 'Player 2', color: 'blue' });
    // Player owns tile 1 with 2 houses
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 2, hotel: false, mortgaged: false });
    const pendingPayment: PendingPayment = {
      fromPlayerId: 'p1',
      toPlayerId: 'bank',
      amount: 500,
      purpose: 'tax',
    };
    const state = makeState([bankrupt, other], [tile], 0, pendingPayment);

    declareBankruptcy(state);

    const tileAfter = state.tiles.find(t => t.id === 1)!;
    expect(tileAfter.ownerId).toBeNull();
    expect(tileAfter.houses).toBe(0);
    expect(tileAfter.hotel).toBe(false);
    expect(tileAfter.mortgaged).toBe(false);
    expect(state.players.find(p => p.id === 'p1')!.isBankrupt).toBe(true);
    expect(state.players.find(p => p.id === 'p1')!.money).toBe(0);
  });
});

// ─────────────────────────────────────────────
// 6. Win condition: last standing player wins
// ─────────────────────────────────────────────
describe('win condition', () => {
  it('sets winnerId and gameOver:true when only one non-bankrupt player remains', () => {
    const loser = makePlayer({ id: 'p1', money: 0 });
    const winner = makePlayer({ id: 'p2', money: 500, name: 'Player 2', color: 'blue' });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0 });
    const pendingPayment: PendingPayment = {
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      amount: 300,
      purpose: 'rent',
    };
    const state = makeState([loser, winner], [tile], 0, pendingPayment);

    const result = declareBankruptcy(state);

    expect(result.gameOver).toBe(true);
    expect(result.winnerId).toBe('p2');
    expect(state.winnerId).toBe('p2');
  });

  it('does NOT set winnerId when 2+ non-bankrupt players remain', () => {
    const loser = makePlayer({ id: 'p1', money: 0 });
    const player2 = makePlayer({ id: 'p2', money: 500, name: 'Player 2', color: 'blue' });
    const player3 = makePlayer({ id: 'p3', money: 300, name: 'Player 3', color: 'green' });
    const tile = makeTileState({ id: 1, ownerId: 'p1', houses: 0 });
    const pendingPayment: PendingPayment = {
      fromPlayerId: 'p1',
      toPlayerId: 'bank',
      amount: 300,
      purpose: 'tax',
    };
    const state = makeState([loser, player2, player3], [tile], 0, pendingPayment);

    const result = declareBankruptcy(state);

    expect(result.gameOver).toBe(false);
    expect(result.winnerId).toBeUndefined();
    expect(state.winnerId).toBeNull();
  });
});

// ─────────────────────────────────────────────
// 7. settleDebt – player has raised enough funds
// ─────────────────────────────────────────────
describe('settleDebt', () => {
  it('pays the debt and clears pendingPayment when player now has enough cash', () => {
    const player = makePlayer({ id: 'p1', money: 200 });
    const creditor = makePlayer({ id: 'p2', money: 100, name: 'Player 2', color: 'blue' });
    const pendingPayment: PendingPayment = {
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      amount: 150,
      purpose: 'rent',
    };
    const state = makeState([player, creditor], [], 0, pendingPayment);
    state.currentActionRequired = 'must_raise_funds';

    const result = settleDebt(state);

    expect(result.ok).toBe(true);
    expect(result.gameOver).toBe(false);
    expect(state.players.find(p => p.id === 'p1')!.money).toBe(50);
    expect(state.players.find(p => p.id === 'p2')!.money).toBe(250);
    expect(state.pendingPayment).toBeNull();
  });

  it('triggers bankruptcy if player still cannot pay after attempting to raise funds', () => {
    const player = makePlayer({ id: 'p1', money: 50 });
    const creditor = makePlayer({ id: 'p2', money: 100, name: 'Player 2', color: 'blue' });
    const pendingPayment: PendingPayment = {
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      amount: 200,
      purpose: 'rent',
    };
    const state = makeState([player, creditor], [], 0, pendingPayment);
    state.currentActionRequired = 'must_raise_funds';

    const result = settleDebt(state);

    expect(result.ok).toBe(false);
    expect(state.players.find(p => p.id === 'p1')!.isBankrupt).toBe(true);
  });
});
