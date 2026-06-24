import { describe, it, expect, vi } from 'vitest';

// Luôn tung đôi [3,3] để thoát tù bằng đôi.
vi.mock('../src/utils/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/helpers')>();
  return { ...actual, rollDice: () => [3, 3] as [number, number] };
});

import { initializeGame, rollDiceAndMove } from '../src/game/gameEngine';
import { Player } from '../src/game/types';

function basePlayer(id: string): Player {
  return {
    id, name: id, money: 1500, position: 10, isBankrupt: false, inJail: true,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default',
  };
}

describe('Mục 1 — ra tù bằng đôi', () => {
  it('mặc định (toggle off): ra tù bằng đôi KHÔNG được tung lại', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.players[0].inJail = true;
    s.players[0].position = 10;

    rollDiceAndMove(s);

    expect(s.players[0].inJail).toBe(false); // đã ra tù
    expect(s.rolledDoubles).toBe(false);      // nhưng không được đi tiếp
  });

  it('khi bật allowJailDoublesContinue: ra tù bằng đôi vẫn được tung lại', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.settings.houseRules.allowJailDoublesContinue = true;
    s.players[0].inJail = true;
    s.players[0].position = 10;

    rollDiceAndMove(s);

    expect(s.players[0].inJail).toBe(false);
    expect(s.rolledDoubles).toBe(true); // được đi thêm lượt
  });
});
