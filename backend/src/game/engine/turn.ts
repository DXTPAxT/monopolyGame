// ============================================================
// Vòng lượt — doubles tung lại, bỏ qua người phá sản, đặt hạn giờ
// docs/RULES.md §3, §4
// ============================================================
import { GameState } from '../types';
import { resetDoubles } from './dice';

export interface EndTurnResult {
  events: string[];
  sameTurn: boolean; // true nếu người chơi hiện tại được tung lại (do đổ đôi)
}

/** Chỉ số người chơi kế tiếp chưa phá sản (vòng tròn). */
export function nextActivePlayerIndex(state: GameState): number {
  const n = state.players.length;
  let idx = state.activePlayerIndex;
  for (let step = 0; step < n; step++) {
    idx = (idx + 1) % n;
    if (!state.players[idx].isBankrupt) return idx;
  }
  return state.activePlayerIndex; // fallback (không nên xảy ra)
}

/** Đặt hạn giờ cho lượt hiện tại nếu bật turn timer. */
function applyTurnDeadline(state: GameState): void {
  const sec = state.settings?.houseRules?.turnTimerSec ?? null;
  state.turnDeadline = sec ? Date.now() + sec * 1000 : null;
}

/**
 * Kết thúc lượt. Nếu người chơi vừa đổ đôi (rolledDoubles) và KHÔNG đang ở tù,
 * KHÔNG phá sản → cùng người đó được tung lại (sameTurn=true): chỉ reset cờ tung
 * xúc xắc, giữ nguyên activePlayerIndex. Ngược lại chuyển sang người kế chưa phá sản
 * và reset chuỗi đôi.
 */
export function endTurn(state: GameState): EndTurnResult {
  const player = state.players[state.activePlayerIndex];

  // Đổ đôi → tung lại (trừ khi đang ở tù hoặc phá sản)
  if (state.rolledDoubles && !player.inJail && !player.isBankrupt) {
    state.diceRolled = false;
    state.hasMoved = false;
    state.rolledDoubles = false;
    applyTurnDeadline(state);
    return {
      events: [`${player.name} đổ đôi nên được đi thêm một lượt!`],
      sameTurn: true,
    };
  }

  // Chuyển lượt sang người kế tiếp chưa phá sản
  const nextIdx = nextActivePlayerIndex(state);
  state.activePlayerIndex = nextIdx;
  state.diceRolled = false;
  state.hasMoved = false;
  state.currentActionRequired = 'none';
  state.pendingPayment = null;
  state.activeCard = null;
  state.activeModal = null;
  state.modalPayload = null;
  resetDoubles(state);
  applyTurnDeadline(state);

  const nextPlayer = state.players[nextIdx];
  return {
    events: [`Lượt chơi chuyển sang ${nextPlayer.name}.`],
    sameTurn: false,
  };
}
