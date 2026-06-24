import { GameState } from '../types';
import { getTile, getGroupTiles, isRailroad, isUtility } from '../board';

/**
 * Returns the rent the lander owes the owner for landing on tileId.
 * diceTotal is the sum of the two dice that brought the player here (needed for utilities).
 * Returns 0 if the tile is unowned, mortgaged, or owned by nobody.
 */
export function calcRent(state: GameState, tileId: number, diceTotal: number): number {
  // Find the runtime tile state
  const tileState = state.tiles.find((t) => t.id === tileId);
  if (!tileState) return 0;

  // Unowned tile → 0
  if (tileState.ownerId === null) return 0;

  const ownerId = tileState.ownerId;

  // Mortgaged → 0
  if (tileState.mortgaged) return 0;

  const meta = getTile(tileId);

  // ---- RAILROAD ----
  if (isRailroad(tileId)) {
    const railroadsOwned = state.tiles.filter(
      (t) => t.ownerId === ownerId && isRailroad(t.id)
    ).length;
    const rentTable = [25, 50, 100, 200];
    return rentTable[railroadsOwned - 1] ?? 0;
  }

  // ---- UTILITY ----
  if (isUtility(tileId)) {
    const utilitiesOwned = state.tiles.filter(
      (t) => t.ownerId === ownerId && isUtility(t.id)
    ).length;
    if (utilitiesOwned === 1) return 4 * diceTotal;
    if (utilitiesOwned >= 2) return 10 * diceTotal;
    return 0;
  }

  // ---- PROPERTY ----
  if (meta.type === 'property') {
    const rent = meta.rent!;

    // Hotel
    if (tileState.hotel) return rent[5];

    // Houses
    if (tileState.houses > 0) return rent[tileState.houses];

    // No houses — check full color group monopoly
    const groupTiles = getGroupTiles(meta.group);
    const ownsFullGroup = groupTiles.every((groupTile) => {
      const ts = state.tiles.find((t) => t.id === groupTile.id);
      return ts?.ownerId === ownerId;
    });

    return ownsFullGroup ? rent[0] * 2 : rent[0];
  }

  return 0;
}
