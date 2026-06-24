import { describe, it, expect } from 'vitest';
import {
  BOARD,
  getTile,
  getGroupTiles,
  getGroupOf,
  isProperty,
  isRailroad,
  isUtility,
  validateBoard,
  PROPERTY_GROUPS,
} from '../src/game/board';

describe('board helpers', () => {
  it('has 40 tiles', () => {
    expect(BOARD).toHaveLength(40);
  });

  it('getTile returns the tile by id', () => {
    expect(getTile(0).type).toBe('go');
    expect(getTile(10).type).toBe('jail');
    expect(getTile(39).name).toBe('Dinh Độc Lập');
  });

  it('getGroupOf returns the group of a tile', () => {
    expect(getGroupOf(39)).toBe('dark_blue');
    expect(getGroupOf(1)).toBe('brown');
  });

  it('getGroupTiles returns all tiles in a color group', () => {
    expect(getGroupTiles('orange').map((t) => t.id).sort((a, b) => a - b)).toEqual([16, 18, 19]);
    expect(getGroupTiles('brown').map((t) => t.id).sort((a, b) => a - b)).toEqual([1, 3]);
    expect(getGroupTiles('dark_blue')).toHaveLength(2);
  });

  it('type guards work', () => {
    expect(isProperty(1)).toBe(true);
    expect(isProperty(5)).toBe(false);
    expect(isRailroad(5)).toBe(true);
    expect(isUtility(12)).toBe(true);
    expect(isUtility(1)).toBe(false);
  });

  it('PROPERTY_GROUPS has 8 color groups', () => {
    expect(PROPERTY_GROUPS).toHaveLength(8);
  });

  it('validateBoard passes for the shipped board', () => {
    const result = validateBoard();
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('every property has a 6-length rent array', () => {
    for (const t of BOARD) {
      if (t.type === 'property') {
        expect(t.rent).toBeDefined();
        expect(t.rent).toHaveLength(6);
        expect(t.housePrice).toBeGreaterThan(0);
      }
    }
  });
});
