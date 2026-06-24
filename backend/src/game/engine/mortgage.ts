// ============================================================
// Cầm cố / chuộc đất — docs/RULES.md §9
// ============================================================
import { GameState } from '../types';
import { getTile, getGroupTiles, isOwnable } from '../board';

export interface MortgageResult {
  ok: boolean;
  error?: string;
  events: string[];
}

function activePlayer(state: GameState) {
  return state.players[state.activePlayerIndex];
}

/** Active player cầm cố tileId: nhận 50% giá mua. */
export function mortgage(state: GameState, tileId: number): MortgageResult {
  const player = activePlayer(state);
  const tileState = state.tiles.find((t) => t.id === tileId);
  if (!tileState) return { ok: false, error: 'Ô cờ không hợp lệ.', events: [] };

  if (!isOwnable(tileId)) {
    return { ok: false, error: 'Ô này không thể cầm cố.', events: [] };
  }
  if (tileState.ownerId !== player.id) {
    return { ok: false, error: 'Bạn không sở hữu tài sản này.', events: [] };
  }
  if (tileState.mortgaged) {
    return { ok: false, error: 'Tài sản này đã bị cầm cố rồi.', events: [] };
  }

  // Không cầm cố khi nhóm còn nhà/khách sạn
  const meta = getTile(tileId);
  const groupTiles = getGroupTiles(meta.group);
  const groupHasBuildings = groupTiles.some((gt) => {
    const ts = state.tiles.find((t) => t.id === gt.id);
    return ts && (ts.houses > 0 || ts.hotel);
  });
  if (groupHasBuildings) {
    return {
      ok: false,
      error: 'Phải bán hết nhà trong nhóm màu trước khi cầm cố.',
      events: [],
    };
  }

  const value = Math.floor((meta.price || 0) / 2);
  player.money += value;
  tileState.mortgaged = true;

  return {
    ok: true,
    events: [`${player.name} đã cầm cố [${meta.name}] và nhận $${value}.`],
  };
}

/** Active player chuộc lại tileId: trả giá cầm cố + 10% lãi. */
export function unmortgage(state: GameState, tileId: number): MortgageResult {
  const player = activePlayer(state);
  const tileState = state.tiles.find((t) => t.id === tileId);
  if (!tileState) return { ok: false, error: 'Ô cờ không hợp lệ.', events: [] };

  if (tileState.ownerId !== player.id) {
    return { ok: false, error: 'Bạn không sở hữu tài sản này.', events: [] };
  }
  if (!tileState.mortgaged) {
    return { ok: false, error: 'Tài sản này không bị cầm cố.', events: [] };
  }

  const meta = getTile(tileId);
  const cost = Math.ceil(((meta.price || 0) / 2) * 1.1);
  if (player.money < cost) {
    return { ok: false, error: 'Bạn không đủ tiền để chuộc lại.', events: [] };
  }

  player.money -= cost;
  tileState.mortgaged = false;

  return {
    ok: true,
    events: [`${player.name} đã chuộc lại [${meta.name}] với giá $${cost}.`],
  };
}
