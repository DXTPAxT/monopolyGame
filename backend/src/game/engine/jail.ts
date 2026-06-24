import { GameState, Player } from '../types';
import { JAIL_TILE } from '../board';
import { moveBy } from './movement';

// Send player straight to jail: position=10 (JAIL_TILE), inJail=true, jailTurns=0. No GO salary.
export function goToJail(state: GameState, player: Player): { events: string[] } {
  player.position = JAIL_TILE;
  player.inJail = true;
  player.jailTurns = 0;

  const events: string[] = [`${player.name} bị đưa vào tù!`];
  state.logs.push(...events);

  return { events };
}

export interface JailActionResult {
  ok: boolean;
  error?: string;
  events: string[];
  freed: boolean;
}

// The ACTIVE player (state.players[state.activePlayerIndex]) attempts to leave jail.
export function jailAction(state: GameState, action: 'pay' | 'use_card' | 'roll'): JailActionResult {
  const player = state.players[state.activePlayerIndex];
  const events: string[] = [];

  if (action === 'pay') {
    if (player.money < 50) {
      return { ok: false, error: 'Không đủ tiền để trả $50.', events: [], freed: false };
    }
    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    events.push(`${player.name} trả $50 để ra tù.`);
    state.logs.push(...events);
    return { ok: true, events, freed: true };
  }

  if (action === 'use_card') {
    if (player.getOutOfJailCards <= 0) {
      return { ok: false, error: 'Không có thẻ Ra Tù Miễn Phí.', events: [], freed: false };
    }
    player.getOutOfJailCards -= 1;
    player.inJail = false;
    player.jailTurns = 0;
    events.push(`${player.name} dùng thẻ Ra Tù Miễn Phí.`);
    state.logs.push(...events);
    return { ok: true, events, freed: true };
  }

  // action === 'roll'
  const [d1, d2] = state.dice;
  const isDouble = d1 === d2;
  const sum = d1 + d2;

  if (isDouble) {
    // Escape via doubles
    player.inJail = false;
    player.jailTurns = 0;
    events.push(`${player.name} tung đôi [${d1},${d2}] và ra tù!`);
    const moveResult = moveBy(state, player, sum);
    events.push(...moveResult.events);
    state.logs.push(...events);
    return { ok: true, events, freed: true };
  }

  // Not a double — increment jailTurns
  player.jailTurns += 1;

  if (player.jailTurns < 3) {
    events.push(`${player.name} tung [${d1},${d2}] không phải đôi, ở lại tù (lượt ${player.jailTurns}/3).`);
    state.logs.push(...events);
    return { ok: true, events, freed: false };
  }

  // jailTurns reached 3 — forced to pay $50
  if (player.money >= 50) {
    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    events.push(`${player.name} hết 3 lượt trong tù, phải trả $50 và ra tù.`);
    const moveResult = moveBy(state, player, sum);
    events.push(...moveResult.events);
    state.logs.push(...events);
    return { ok: true, events, freed: true };
  }

  // Not enough money — must raise funds
  state.currentActionRequired = 'must_raise_funds';
  events.push(`${player.name} hết 3 lượt trong tù nhưng không đủ tiền trả $50, cần bán/cầm cố tài sản.`);
  state.logs.push(...events);
  return { ok: true, events, freed: false };
}
