// ============================================================
// Xây / bán nhà & khách sạn — docs/RULES.md §7.4–7.5
// Luật mới: xây CHỈ khi đang đứng trên ô của mình; không cần trọn nhóm,
// không xây đều. Lần đáp 1 (mua) xây tới 4 nhà; lần đáp 2+ mở khoá khách sạn.
// Kho 32 nhà / 12 khách sạn.
// ============================================================
import { GameState } from '../types';
import { getTile, HOUSE_TOTAL, HOTEL_TOTAL } from '../board';

export interface BuildResult {
  ok: boolean;
  error?: string;
  events: string[];
}

function activePlayer(state: GameState) {
  return state.players[state.activePlayerIndex];
}

/** Đếm nhà/khách sạn đang đặt trên bàn và còn lại trong kho. */
export function houseInventory(state: GameState): {
  housesUsed: number;
  hotelsUsed: number;
  housesLeft: number;
  hotelsLeft: number;
} {
  let housesUsed = 0;
  let hotelsUsed = 0;
  for (const ts of state.tiles) {
    if (ts.hotel) hotelsUsed += 1;
    else housesUsed += ts.houses;
  }
  return {
    housesUsed,
    hotelsUsed,
    housesLeft: HOUSE_TOTAL - housesUsed,
    hotelsLeft: HOTEL_TOTAL - hotelsUsed,
  };
}

/** Active player xây thêm 1 cấp trên tileId. */
export function buildHouse(state: GameState, tileId: number): BuildResult {
  const player = activePlayer(state);
  const tileState = state.tiles.find((t) => t.id === tileId);
  if (!tileState) return { ok: false, error: 'Ô cờ không hợp lệ.', events: [] };

  const meta = getTile(tileId);
  if (meta.type !== 'property') {
    return { ok: false, error: 'Chỉ có thể xây nhà trên đất thường.', events: [] };
  }
  if (tileState.ownerId !== player.id) {
    return { ok: false, error: 'Bạn không sở hữu mảnh đất này.', events: [] };
  }
  // Luật mới: chỉ được xây khi đang đứng trên ô của mình (xây-khi-đáp)
  if (player.position !== tileId) {
    return { ok: false, error: 'Chỉ được xây khi đang đứng trên ô của bạn.', events: [] };
  }
  // Không xây trên chính ô đang bị cầm cố (bỏ xét cả nhóm)
  if (tileState.mortgaged) {
    return { ok: false, error: 'Không thể xây trên ô đang bị cầm cố.', events: [] };
  }
  if (tileState.hotel) {
    return { ok: false, error: 'Mảnh đất này đã đạt cấp tối đa (Khách Sạn).', events: [] };
  }

  const inv = houseInventory(state);
  const buildingHotel = tileState.houses === 4;
  // Khách sạn chỉ mở khoá từ lần đáp thứ 2 trở đi
  if (buildingHotel && tileState.ownerVisits < 2) {
    return { ok: false, error: 'Cần đáp xuống ô lần thứ 2 mới được lên Khách Sạn.', events: [] };
  }
  if (buildingHotel) {
    if (inv.hotelsLeft <= 0) {
      return { ok: false, error: 'Kho khách sạn đã hết.', events: [] };
    }
  } else {
    if (inv.housesLeft <= 0) {
      return { ok: false, error: 'Kho nhà đã hết.', events: [] };
    }
  }

  const cost = meta.housePrice || 0;
  if (player.money < cost) {
    return { ok: false, error: 'Bạn không đủ tiền để xây.', events: [] };
  }

  player.money -= cost;
  let levelName: string;
  if (buildingHotel) {
    // 4 nhà trả về kho (houseInventory tự tính vì hotel=true → 0 nhà)
    tileState.hotel = true;
    levelName = 'Khách Sạn';
  } else {
    tileState.houses += 1;
    levelName = `${tileState.houses} Nhà`;
  }

  return {
    ok: true,
    events: [`${player.name} đã xây [${meta.name}] lên ${levelName} (Chi phí: $${cost}).`],
  };
}

/** Active player bán 1 cấp trên tileId (hoàn nửa giá housePrice). */
export function sellHouse(state: GameState, tileId: number): BuildResult {
  const player = activePlayer(state);
  const tileState = state.tiles.find((t) => t.id === tileId);
  if (!tileState) return { ok: false, error: 'Ô cờ không hợp lệ.', events: [] };

  const meta = getTile(tileId);
  if (meta.type !== 'property') {
    return { ok: false, error: 'Ô này không có công trình để bán.', events: [] };
  }
  if (tileState.ownerId !== player.id) {
    return { ok: false, error: 'Bạn không sở hữu mảnh đất này.', events: [] };
  }
  if (!tileState.hotel && tileState.houses === 0) {
    return { ok: false, error: 'Không có công trình để bán.', events: [] };
  }

  const refund = Math.floor((meta.housePrice || 0) / 2);
  player.money += refund;

  let levelName: string;
  if (tileState.hotel) {
    tileState.hotel = false;
    tileState.houses = 4; // khách sạn quy về 4 nhà
    levelName = '4 Nhà';
  } else {
    tileState.houses -= 1;
    levelName = tileState.houses === 0 ? 'Đất trống' : `${tileState.houses} Nhà`;
  }

  return {
    ok: true,
    events: [`${player.name} đã bán bớt công trình tại [${meta.name}], còn ${levelName} (hoàn $${refund}).`],
  };
}
