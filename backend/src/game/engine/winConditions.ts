// ============================================================
// Luật thắng nhanh — gọi sau mỗi lần đổi chủ đất (mua, phá sản chuyển chủ nợ).
// Một người chơi thắng ngay nếu thoả MỘT trong các điều kiện:
//   1. Sở hữu trọn vẹn 3 nhóm màu.
//   2. Sở hữu trọn 1 cạnh bàn cờ (mọi ô đất xây nhà được trên cạnh đó; không tính ga/tiện ích).
//   3. Sở hữu cả 4 nhà ga.
// ============================================================
import { GameState } from '../types';
import { countFullGroups, BOARD_SIDES, RAILROAD_IDS } from '../board';

export const GROUPS_TO_WIN = 3;

function ownsAll(state: GameState, ids: number[], playerId: string): boolean {
  return ids.every((id) => state.tiles.find((t) => t.id === id)?.ownerId === playerId);
}

/** Người chơi sở hữu trọn các ô đất (property) của ít nhất 1 cạnh bàn cờ? */
export function ownsFullSide(state: GameState, playerId: string): boolean {
  return BOARD_SIDES.some((side) => side.length > 0 && ownsAll(state, side, playerId));
}

/** Người chơi sở hữu cả 4 nhà ga? */
export function ownsAllRailroads(state: GameState, playerId: string): boolean {
  return RAILROAD_IDS.length > 0 && ownsAll(state, RAILROAD_IDS, playerId);
}

export function checkInstantWin(state: GameState): { gameOver: boolean; winnerId?: string } {
  for (const p of state.players) {
    if (p.isBankrupt) continue;

    let reason: string | null = null;
    if (countFullGroups(state, p.id) >= GROUPS_TO_WIN) {
      reason = `sở hữu trọn ${GROUPS_TO_WIN} nhóm màu`;
    } else if (ownsFullSide(state, p.id)) {
      reason = 'sở hữu trọn 1 cạnh bàn cờ';
    } else if (ownsAllRailroads(state, p.id)) {
      reason = 'sở hữu cả 4 nhà ga';
    }

    if (reason) {
      state.winnerId = p.id;
      state.logs.push(`[KẾT THÚC] ${p.name} chiến thắng nhờ ${reason}!`);
      return { gameOver: true, winnerId: p.id };
    }
  }
  return { gameOver: false };
}
