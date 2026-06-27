import { describe, it, expect } from 'vitest';
import { initializeGame, endTurn } from '../src/game/gameEngine';
import { Player } from '../src/game/types';

function mkPlayers(): Player[] {
  return [
    { id: 'p1', name: 'A', money: 2000, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: '#f00', getOutOfJailCards: 0, tokenSkin: 'default' },
    { id: 'p2', name: 'B', money: 2000, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: '#00f', getOutOfJailCards: 0, tokenSkin: 'default' },
  ];
}

describe('pendingLanding plumbing', () => {
  it('initializeGame sets pendingLanding to null', () => {
    const s = initializeGame('ROOM', mkPlayers());
    expect(s.pendingLanding).toBeNull();
  });

  it('endTurn clears pendingLanding', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    s.pendingLanding = { kind: 'pay_tax', tileId: 4, amount: 200 };
    endTurn(s);
    expect(s.pendingLanding).toBeNull();
  });
});
