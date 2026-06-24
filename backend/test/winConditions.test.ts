import { describe, it, expect } from 'vitest';
import { initializeGame } from '../src/game/gameEngine';
import { checkInstantWin } from '../src/game/engine/winConditions';
import { getGroupTiles, BOARD_SIDES, RAILROAD_IDS } from '../src/game/board';
import { Player, GameState } from '../src/game/types';

function players(): Player[] {
  return [
    { id: 'p1', name: 'A', money: 1500, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: 'red', getOutOfJailCards: 0, tokenSkin: 'default' },
    { id: 'p2', name: 'B', money: 1500, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: 'blue', getOutOfJailCards: 0, tokenSkin: 'default' },
  ];
}
function own(s: GameState, ids: number[], ownerId: string) {
  for (const id of ids) s.tiles.find((t) => t.id === id)!.ownerId = ownerId;
}
function giveGroup(s: GameState, group: string, ownerId: string) {
  own(s, getGroupTiles(group).map((t) => t.id), ownerId);
}

describe('checkInstantWin', () => {
  it('đủ 3 nhóm màu (ở 3 cạnh khác nhau) → thắng', () => {
    const s = initializeGame('R', players());
    // brown (A) + pink (B) + red (C): 3 nhóm trọn, không phủ kín cạnh nào
    ['brown', 'pink', 'red'].forEach((g) => giveGroup(s, g, 'p1'));
    const r = checkInstantWin(s);
    expect(r.gameOver).toBe(true);
    expect(r.winnerId).toBe('p1');
    expect(s.winnerId).toBe('p1');
  });

  it('2 nhóm màu ở 2 cạnh khác nhau (không trọn cạnh nào) → chưa thắng', () => {
    const s = initializeGame('R', players());
    // brown (cạnh A) + pink (cạnh B): 2 nhóm trọn nhưng không phủ kín cạnh nào
    ['brown', 'pink'].forEach((g) => giveGroup(s, g, 'p1'));
    expect(checkInstantWin(s).gameOver).toBe(false);
    expect(s.winnerId).toBeNull();
  });

  it('sở hữu trọn 1 cạnh bàn cờ → thắng', () => {
    const s = initializeGame('R', players());
    own(s, BOARD_SIDES[0], 'p2'); // toàn bộ ô mua được ở cạnh đầu
    const r = checkInstantWin(s);
    expect(r.gameOver).toBe(true);
    expect(r.winnerId).toBe('p2');
  });

  it('thiếu 1 ô trên cạnh → chưa thắng theo cạnh', () => {
    const s = initializeGame('R', players());
    const side = BOARD_SIDES[0];
    own(s, side.slice(0, side.length - 1), 'p1'); // thiếu 1 ô cuối
    expect(checkInstantWin(s).gameOver).toBe(false);
  });

  it('sở hữu cả 4 nhà ga → thắng', () => {
    const s = initializeGame('R', players());
    own(s, RAILROAD_IDS, 'p1');
    const r = checkInstantWin(s);
    expect(r.gameOver).toBe(true);
    expect(r.winnerId).toBe('p1');
  });

  it('người phá sản không tính thắng', () => {
    const s = initializeGame('R', players());
    own(s, RAILROAD_IDS, 'p1');
    s.players[0].isBankrupt = true;
    expect(checkInstantWin(s).gameOver).toBe(false);
  });
});
