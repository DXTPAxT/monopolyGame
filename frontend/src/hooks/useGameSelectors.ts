import boardData from '../data/board.json';
import type { GameState, TileState, TileMetadata } from '../types/game';

const BOARD = boardData as unknown as TileMetadata[];

// ── getTileMeta ──────────────────────────────────────────────────────────────
export function getTileMeta(tileId: number): TileMetadata {
  const meta = BOARD.find((t) => t.id === tileId);
  if (!meta) throw new Error(`Tile ${tileId} not found in board data`);
  return meta;
}

// ── netWorth ─────────────────────────────────────────────────────────────────
// netWorth = player.money
//   + sum over owned tiles of: mortgaged ? Math.floor(price/2) : price
//   + sum over owned tiles of: houses * housePrice  (hotel counts as 5 * housePrice)
export function netWorth(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;

  let total = player.money;

  for (const ts of state.tiles) {
    if (ts.ownerId !== playerId) continue;
    const meta = getTileMeta(ts.id);
    const price = meta.price ?? 0;
    const housePrice = meta.housePrice ?? 0;

    // Land value
    total += ts.mortgaged ? Math.floor(price / 2) : price;

    // Building value
    if (ts.hotel) {
      total += 5 * housePrice;
    } else {
      total += ts.houses * housePrice;
    }
  }

  return total;
}

// ── myProperties ─────────────────────────────────────────────────────────────
// All tiles owned by a player, as { meta, state } pairs sorted by tile id.
export function myProperties(
  state: GameState,
  playerId: string,
): { meta: TileMetadata; state: TileState }[] {
  return state.tiles
    .filter((ts) => ts.ownerId === playerId)
    .sort((a, b) => a.id - b.id)
    .map((ts) => ({ meta: getTileMeta(ts.id), state: ts }));
}

// ── ownsFullGroup ─────────────────────────────────────────────────────────────
// True if the player owns every tile in the given color group.
export function ownsFullGroup(
  state: GameState,
  group: string,
  playerId: string,
): boolean {
  const groupTileIds = BOARD.filter((t) => t.group === group).map((t) => t.id);
  if (groupTileIds.length === 0) return false;
  return groupTileIds.every((id) => {
    const ts = state.tiles.find((t) => t.id === id);
    return ts?.ownerId === playerId;
  });
}

// ── canBuild ──────────────────────────────────────────────────────────────────
// Luật xây mới (2026-06-23): xây khi đáp ô, không cần trọn nhóm màu.
// Điều kiện:
//   - ô là property
//   - do người chơi sở hữu
//   - người chơi đang đứng trên ô (position === tileId)
//   - ô không bị cầm cố
//   - chưa đạt khách sạn
//   - nếu lên khách sạn (houses === 4) thì ownerVisits >= 2
export function canBuild(
  state: GameState,
  tileId: number,
  playerId: string,
): boolean {
  const meta = getTileMeta(tileId);
  if (meta.type !== 'property') return false;

  const ts = state.tiles.find((t) => t.id === tileId);
  if (!ts || ts.ownerId !== playerId) return false;
  if (ts.hotel) return false; // already maxed
  if (ts.mortgaged) return false;

  // Phải đang đứng trên ô
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.position !== tileId) return false;

  // Nếu lên khách sạn thì cần ownerVisits >= 2
  const wouldBuildHotel = ts.houses === 4;
  if (wouldBuildHotel && (ts.ownerVisits ?? 0) < 2) return false;

  return true;
}

// ── currentRent ───────────────────────────────────────────────────────────────
// Current rent that would be charged if someone lands here now.
//   property: mortgaged->0; hotel->rent[5]; houses>0->rent[houses]; full group->rent[0]*2 : rent[0]
//   railroad: [25,50,100,200][ownedCount-1]
//   utility:  ownedCount===2 ? 10*diceTotal : 4*diceTotal
//   Unowned  -> 0
export function currentRent(
  state: GameState,
  tileId: number,
  diceTotal = 7,
): number {
  const meta = getTileMeta(tileId);
  const ts = state.tiles.find((t) => t.id === tileId);

  if (!ts || ts.ownerId === null) return 0;

  const ownerId = ts.ownerId;

  if (meta.type === 'property') {
    if (ts.mortgaged) return 0;
    const rent = meta.rent ?? [];
    if (ts.hotel) return rent[5] ?? 0;
    if (ts.houses > 0) return rent[ts.houses] ?? 0;
    // No houses: double rent if full group
    if (ownsFullGroup(state, meta.group, ownerId)) return (rent[0] ?? 0) * 2;
    return rent[0] ?? 0;
  }

  if (meta.type === 'railroad') {
    if (ts.mortgaged) return 0;
    const ownedRailroads = state.tiles.filter(
      (t) =>
        t.ownerId === ownerId &&
        getTileMeta(t.id).type === 'railroad' &&
        !t.mortgaged,
    ).length;
    const schedule = [25, 50, 100, 200];
    return schedule[Math.min(ownedRailroads - 1, 3)] ?? 0;
  }

  if (meta.type === 'utility') {
    if (ts.mortgaged) return 0;
    const ownedUtilities = state.tiles.filter(
      (t) =>
        t.ownerId === ownerId &&
        getTileMeta(t.id).type === 'utility' &&
        !t.mortgaged,
    ).length;
    return ownedUtilities === 2 ? 10 * diceTotal : 4 * diceTotal;
  }

  return 0;
}
