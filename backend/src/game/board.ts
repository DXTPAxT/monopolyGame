// ============================================================
// Bàn cờ: loader + validator + helpers tra cứu
// docs/RULES.md §2, §13
// ============================================================
import boardDataRaw from '../data/board.json';
import { TileMetadata, GroupId } from './types';

export const BOARD = boardDataRaw as TileMetadata[];

export const BOARD_SIZE = 40;
export const GO_TILE = 0;
export const JAIL_TILE = 10;
export const FREE_PARKING_TILE = 20;
export const GO_TO_JAIL_TILE = 30;
export const GO_SALARY = 200;

// Giới hạn kho nhà/khách sạn toàn bàn (RULES §7.4)
export const HOUSE_TOTAL = 32;
export const HOTEL_TOTAL = 12;

// 8 nhóm màu đất + giá nhà mỗi nhóm (RULES §2)
export const PROPERTY_GROUPS: GroupId[] = [
  'brown',
  'light_blue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'dark_blue',
];

const tileById = new Map<number, TileMetadata>(BOARD.map((t) => [t.id, t]));

export function getTile(id: number): TileMetadata {
  const tile = tileById.get(id);
  if (!tile) throw new Error(`Không tìm thấy ô cờ id=${id}`);
  return tile;
}

export function getGroupOf(id: number): string {
  return getTile(id).group;
}

export function getGroupTiles(group: string): TileMetadata[] {
  return BOARD.filter((t) => t.group === group);
}

/** 4 cạnh bàn cờ — danh sách id các ô ĐẤT XÂY NHÀ ĐƯỢC (property) trên mỗi cạnh.
 *  Không tính nhà ga & tiện ích. */
export const BOARD_SIDES: number[][] = [
  [1, 9],
  [11, 19],
  [21, 29],
  [31, 39],
].map(([lo, hi]) => BOARD.filter((t) => t.id >= lo && t.id <= hi && isProperty(t.id)).map((t) => t.id));

/** Tất cả id nhà ga trên bàn. */
export const RAILROAD_IDS: number[] = BOARD.filter((t) => t.type === 'railroad').map((t) => t.id);

/** Số nhóm màu mà người chơi sở hữu TRỌN VẸN. */
export function countFullGroups(
  state: { tiles: { id: number; ownerId: string | null }[] },
  playerId: string,
): number {
  return PROPERTY_GROUPS.filter((g) =>
    getGroupTiles(g).every(
      (gt) => state.tiles.find((t) => t.id === gt.id)?.ownerId === playerId,
    ),
  ).length;
}

export function isProperty(id: number): boolean {
  return getTile(id).type === 'property';
}
export function isRailroad(id: number): boolean {
  return getTile(id).type === 'railroad';
}
export function isUtility(id: number): boolean {
  return getTile(id).type === 'utility';
}
export function isOwnable(id: number): boolean {
  const t = getTile(id).type;
  return t === 'property' || t === 'railroad' || t === 'utility';
}

export interface BoardValidation {
  ok: boolean;
  errors: string[];
}

/** Kiểm tra tính toàn vẹn của board.json (RULES §2). */
export function validateBoard(): BoardValidation {
  const errors: string[] = [];

  if (BOARD.length !== BOARD_SIZE) {
    errors.push(`Bàn cờ phải có ${BOARD_SIZE} ô, hiện có ${BOARD.length}.`);
  }

  // id liên tục 0..39, duy nhất
  for (let i = 0; i < BOARD.length; i++) {
    if (!tileById.has(i)) errors.push(`Thiếu ô id=${i}.`);
  }

  // Các ô đặc biệt đúng vị trí
  const expectSpecial: Array<[number, string]> = [
    [GO_TILE, 'go'],
    [JAIL_TILE, 'jail'],
    [FREE_PARKING_TILE, 'parking'],
    [GO_TO_JAIL_TILE, 'go_to_jail'],
  ];
  for (const [id, type] of expectSpecial) {
    if (tileById.get(id)?.type !== type) {
      errors.push(`Ô ${id} phải là loại '${type}'.`);
    }
  }

  // Mỗi đất thường: rent[6], price>0, housePrice>0, group hợp lệ
  for (const t of BOARD) {
    if (t.type === 'property') {
      if (!t.rent || t.rent.length !== 6) {
        errors.push(`Ô ${t.id} (${t.name}) cần mảng rent gồm 6 phần tử.`);
      }
      if (!t.price || t.price <= 0) errors.push(`Ô ${t.id} (${t.name}) thiếu giá mua hợp lệ.`);
      if (!t.housePrice || t.housePrice <= 0) errors.push(`Ô ${t.id} (${t.name}) thiếu housePrice.`);
      if (!PROPERTY_GROUPS.includes(t.group as GroupId)) {
        errors.push(`Ô ${t.id} (${t.name}) có nhóm màu không hợp lệ: ${t.group}.`);
      }
    }
  }

  // Đủ 8 nhóm màu, mỗi nhóm 2-3 ô
  for (const g of PROPERTY_GROUPS) {
    const n = getGroupTiles(g).length;
    if (n < 2 || n > 3) errors.push(`Nhóm ${g} phải có 2-3 ô, hiện có ${n}.`);
  }

  // Đúng 4 nhà ga, 2 tiện ích
  if (BOARD.filter((t) => t.type === 'railroad').length !== 4) {
    errors.push('Phải có đúng 4 nhà ga.');
  }
  if (BOARD.filter((t) => t.type === 'utility').length !== 2) {
    errors.push('Phải có đúng 2 tiện ích.');
  }

  return { ok: errors.length === 0, errors };
}
