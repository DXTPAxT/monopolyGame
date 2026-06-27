import { describe, it, expect, vi } from 'vitest';

// Luôn tung đôi [3,3].
vi.mock('../src/utils/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/helpers')>();
  return { ...actual, rollDice: () => [3, 3] as [number, number] };
});

import { initializeGame, rollDiceAndMove, confirmLanding, endTurn } from '../src/game/gameEngine';
import { Player } from '../src/game/types';

function basePlayer(id: string): Player {
  return {
    id, name: id, money: 1500, position: 0, isBankrupt: false, inJail: false,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default',
  };
}

describe('Mục 2 — cảnh báo đổ đôi & luật 3 đôi liên tiếp', () => {
  it('cảnh báo khi đổ đôi lần thứ 2 liên tiếp (chưa vào tù)', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);

    rollDiceAndMove(s);      // đôi lần 1 → doublesCount=1
    endTurn(s);              // đổ đôi → cùng người được tung lại
    const { event } = rollDiceAndMove(s); // đôi lần 2 → doublesCount=2

    expect(s.doublesCount).toBe(2);
    expect(event).toContain('vào tù');
  });

  it('chỉ 3 đôi trong CÙNG một lượt mới vào tù; chuyển lượt sẽ reset doublesCount', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);

    rollDiceAndMove(s); // p1 đôi lần 1
    expect(s.doublesCount).toBe(1);

    // Chuyển hẳn sang p2 (không phải tung lại) bằng cách tắt cờ đôi như khi không đổ đôi:
    s.rolledDoubles = false;
    endTurn(s); // sang p2
    expect(s.activePlayerIndex).toBe(1);
    expect(s.doublesCount).toBe(0); // đã reset, không cộng dồn sang lượt người khác
  });

  it('đổ đôi 3 lần liên tiếp trong một lượt → vào tù', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);

    rollDiceAndMove(s); endTurn(s); // đôi 1
    rollDiceAndMove(s); endTurn(s); // đôi 2
    rollDiceAndMove(s);             // đôi 3 → vào tù
    confirmLanding(s);

    expect(s.players[0].inJail).toBe(true);
  });
});
