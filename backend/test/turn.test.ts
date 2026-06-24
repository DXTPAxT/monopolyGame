import { describe, it, expect } from 'vitest';
import { endTurn, nextActivePlayerIndex } from '../src/game/engine/turn';
import { GameState, Player, DEFAULT_ROOM_SETTINGS } from '../src/game/types';

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id, name: id, money: 1500, position: 0, isBankrupt: false, inJail: false,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default', ...over,
  };
}
function makeState(players: Player[], over: Partial<GameState> = {}): GameState {
  return {
    players,
    activePlayerIndex: 0,
    diceRolled: true,
    hasMoved: true,
    rolledDoubles: false,
    doublesCount: 0,
    currentActionRequired: 'none',
    pendingPayment: null,
    activeCard: null,
    activeModal: null,
    modalPayload: null,
    settings: { ...DEFAULT_ROOM_SETTINGS },
    turnDeadline: null,
    ...over,
  } as unknown as GameState;
}

describe('turn', () => {
  it('rolling doubles grants the same player another turn', () => {
    const state = makeState([player('p1'), player('p2')], { rolledDoubles: true });
    const res = endTurn(state);
    expect(res.sameTurn).toBe(true);
    expect(state.activePlayerIndex).toBe(0);
    expect(state.diceRolled).toBe(false);
    expect(state.rolledDoubles).toBe(false);
  });

  it('no doubles advances to the next player', () => {
    const state = makeState([player('p1'), player('p2')], { rolledDoubles: false });
    const res = endTurn(state);
    expect(res.sameTurn).toBe(false);
    expect(state.activePlayerIndex).toBe(1);
    expect(state.diceRolled).toBe(false);
  });

  it('doubles while in jail does NOT grant another turn', () => {
    const state = makeState([player('p1', { inJail: true }), player('p2')], { rolledDoubles: true });
    const res = endTurn(state);
    expect(res.sameTurn).toBe(false);
    expect(state.activePlayerIndex).toBe(1);
  });

  it('skips bankrupt players when advancing', () => {
    const state = makeState([player('p1'), player('p2', { isBankrupt: true }), player('p3')]);
    const res = endTurn(state);
    expect(res.sameTurn).toBe(false);
    expect(state.activePlayerIndex).toBe(2); // skip p2
  });

  it('nextActivePlayerIndex wraps around skipping bankrupt', () => {
    const state = makeState([player('p1'), player('p2', { isBankrupt: true })], { activePlayerIndex: 0 });
    expect(nextActivePlayerIndex(state)).toBe(0); // only p1 alive → stays p1
  });

  it('sets a turn deadline when the timer is enabled', () => {
    const state = makeState([player('p1'), player('p2')], {
      settings: { ...DEFAULT_ROOM_SETTINGS, houseRules: { ...DEFAULT_ROOM_SETTINGS.houseRules, turnTimerSec: 30 } },
    });
    const before = Date.now();
    endTurn(state);
    expect(state.turnDeadline).not.toBeNull();
    expect(state.turnDeadline!).toBeGreaterThanOrEqual(before + 29000);
  });
});
