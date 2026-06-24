import { describe, it, expect, vi } from 'vitest';

// Dice cố định [1,2] (tổng 3, không phải đôi) để điều khiển ô đáp xuống.
vi.mock('../src/utils/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/helpers')>();
  return { ...actual, rollDice: () => [1, 2] as [number, number] };
});

import { initializeGame, rollDiceAndMove } from '../src/game/gameEngine';
import { Player } from '../src/game/types';

function basePlayer(id: string): Player {
  return {
    id, name: id, money: 1500, position: 0, isBankrupt: false, inJail: false,
    jailTurns: 0, color: '#fff', getOutOfJailCards: 0, tokenSkin: 'default',
  };
}

describe('Mục 3 — nợ tiền thuê không đủ tiền mặt nhưng còn tài sản bán được', () => {
  it('chuyển sang must_raise_funds (KHÔNG ép phá sản, KHÔNG mở modal phá sản che màn hình)', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.activePlayerIndex = 1; // p2 tới lượt

    // p1 sở hữu tile 3 (Vũng Tàu) với 2 nhà → rent[2] = 60
    const t3 = s.tiles.find((t) => t.id === 3)!;
    t3.ownerId = 'p1';
    t3.houses = 2;

    // p2 sở hữu tile 39 (giá 400 → giá trị cầm cố 200) để có tài sản bán được
    s.tiles.find((t) => t.id === 39)!.ownerId = 'p2';

    // p2 ít tiền mặt: 30 < 60 nợ, nhưng worth = 30 + 200 = 230 >= 60
    s.players[1].money = 30;
    s.players[1].position = 0; // 0 + 3 = ô 3 (không qua GO)

    rollDiceAndMove(s);

    expect(s.players[1].position).toBe(3);
    expect(s.players[1].isBankrupt).toBe(false);
    expect(s.currentActionRequired).toBe('must_raise_funds');
    expect(s.activeModal).not.toBe('bankruptcy');
    expect(s.pendingPayment).not.toBeNull();
    expect(s.pendingPayment!.amount).toBe(60);
    expect(s.pendingPayment!.toPlayerId).toBe('p1');
  });

  it('vẫn mở modal phá sản khi thực sự không đủ tài sản để cứu', () => {
    const s = initializeGame('ROOM', [basePlayer('p1'), basePlayer('p2')]);
    s.activePlayerIndex = 1;

    const t3 = s.tiles.find((t) => t.id === 3)!;
    t3.ownerId = 'p1';
    t3.houses = 2; // rent[2] = 60

    // p2 chỉ có 10 tiền mặt, không sở hữu gì → worth = 10 < 60
    s.players[1].money = 10;
    s.players[1].position = 0;

    rollDiceAndMove(s);

    expect(s.currentActionRequired).toBe('bankruptcy_decision');
    expect(s.activeModal).toBe('bankruptcy');
    expect(s.pendingPayment!.amount).toBe(60);
  });
});
