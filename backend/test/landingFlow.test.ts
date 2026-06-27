import { describe, it, expect } from 'vitest';
import { initializeGame, endTurn, announceTileLanding, confirmLanding } from '../src/game/gameEngine';
import { Player } from '../src/game/types';
import { getTile } from '../src/game/board';

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

describe('announceTileLanding (no mutation) + confirmLanding (executes)', () => {
  it('tax: announce không trừ tiền, confirm mới trừ', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 4; // Thuế Thu Nhập $200
    announceTileLanding(s, p, getTile(4));
    expect(p.money).toBe(2000);
    expect(s.pendingLanding).toEqual({ kind: 'pay_tax', tileId: 4, amount: 200 });
    confirmLanding(s);
    expect(p.money).toBe(1800);
    expect(s.pendingLanding).toBeNull();
  });

  it('community chest goToJail: announce KHÔNG vào tù, confirm mới vào tù', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 2; // Quỹ Cộng Đồng
    announceTileLanding(s, p, getTile(2), { forcedCardId: 'community_09' });
    expect(p.inJail).toBe(false);
    expect(p.position).toBe(2);
    expect(s.activeCard?.type).toBe('community_chest');
    expect(s.pendingLanding?.kind).toBe('card');
    confirmLanding(s);
    expect(p.inJail).toBe(true);
    expect(p.position).toBe(10);
  });

  it('go_to_jail tile: announce không nhảy, confirm mới nhảy', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 30; // Vào Tù
    announceTileLanding(s, p, getTile(30));
    expect(p.inJail).toBe(false);
    expect(p.position).toBe(30);
    expect(s.pendingLanding?.kind).toBe('go_to_jail');
    confirmLanding(s);
    expect(p.inJail).toBe(true);
    expect(p.position).toBe(10);
  });

  it('rent: announce không trừ, confirm trừ và trả cho chủ', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    s.dice = [3, 3];
    const [a, b] = s.players;
    const tileId = 1; // Hồ Cốc, rent[0]=2
    s.tiles.find(t => t.id === tileId)!.ownerId = b.id;
    s.tiles.find(t => t.id === tileId)!.ownerVisits = 1;
    a.position = tileId;
    announceTileLanding(s, a, getTile(tileId));
    expect(a.money).toBe(2000);
    expect(s.pendingLanding).toEqual({ kind: 'pay_rent', tileId, amount: 2, ownerId: b.id });
    confirmLanding(s);
    expect(a.money).toBe(1998);
    expect(b.money).toBe(2002);
  });

  it('card di chuyển tới đất trống: confirm nối chuỗi sang buy_or_pass', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 7; // Cơ Hội
    // chance_03: moveTo target 24 (Vịnh Hạ Long, đất trống)
    announceTileLanding(s, p, getTile(7), { forcedCardId: 'chance_03' });
    expect(p.position).toBe(7);
    confirmLanding(s);
    expect(p.position).toBe(24);
    expect(s.currentActionRequired).toBe('buy_or_pass');
    expect(s.pendingLanding).toBeNull();
  });
});
