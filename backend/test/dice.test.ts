import { describe, it, expect } from 'vitest';
import { isDoubles, registerRoll, resetDoubles } from '../src/game/engine/dice';
import { GameState } from '../src/game/types';

describe('dice module', () => {
  // Test case 1: isDoubles function
  it('should identify doubles correctly', () => {
    expect(isDoubles([3, 3])).toBe(true);
    expect(isDoubles([2, 5])).toBe(false);
  });

  // Test case 2: registerRoll on a state with doubles
  it('should register a double roll: increment doublesCount, set rolledDoubles=true, return false', () => {
    const state = {
      dice: [2, 2],
      rolledDoubles: false,
      doublesCount: 0,
    } as unknown as GameState;

    const result = registerRoll(state);

    expect(result).toEqual({ goToJailForDoubles: false });
    expect(state.rolledDoubles).toBe(true);
    expect(state.doublesCount).toBe(1);
  });

  // Test case 3: registerRoll on a non-double roll
  it('should register a non-double roll: leave doublesCount unchanged, set rolledDoubles=false', () => {
    const state = {
      dice: [1, 4],
      rolledDoubles: false,
      doublesCount: 0,
    } as unknown as GameState;

    const result = registerRoll(state);

    expect(result).toEqual({ goToJailForDoubles: false });
    expect(state.rolledDoubles).toBe(false);
    expect(state.doublesCount).toBe(0);
  });

  // Test case 4: Three consecutive doubles triggers goToJail
  it('should go to jail on third consecutive double', () => {
    const state = {
      dice: [2, 2],
      rolledDoubles: false,
      doublesCount: 0,
    } as unknown as GameState;

    // First double
    let result = registerRoll(state);
    expect(result).toEqual({ goToJailForDoubles: false });
    expect(state.doublesCount).toBe(1);

    // Second double
    state.dice = [3, 3];
    result = registerRoll(state);
    expect(result).toEqual({ goToJailForDoubles: false });
    expect(state.doublesCount).toBe(2);

    // Third double - should trigger jail and reset
    state.dice = [4, 4];
    result = registerRoll(state);
    expect(result).toEqual({ goToJailForDoubles: true });
    expect(state.doublesCount).toBe(0);
  });

  // Test case 5: resetDoubles at end of turn
  it('should reset doubles tracking at end of turn', () => {
    const state = {
      dice: [2, 2],
      rolledDoubles: true,
      doublesCount: 2,
    } as unknown as GameState;

    resetDoubles(state);

    expect(state.doublesCount).toBe(0);
    expect(state.rolledDoubles).toBe(false);
  });
});
