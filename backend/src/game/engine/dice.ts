import { GameState } from '../types';

// True if the two dice show the same value.
export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}

// Call this AFTER state.dice has been set to the newly rolled pair.
// - Sets state.rolledDoubles = isDoubles(state.dice).
// - If it IS a double: increment state.doublesCount by 1.
//   If state.doublesCount reaches 3 (third consecutive double in this turn),
//   reset state.doublesCount to 0 and return { goToJailForDoubles: true }.
// - If it is NOT a double: leave state.doublesCount unchanged.
// - Otherwise return { goToJailForDoubles: false }.
export function registerRoll(state: GameState): { goToJailForDoubles: boolean } {
  state.rolledDoubles = isDoubles(state.dice);

  if (state.rolledDoubles) {
    state.doublesCount += 1;

    if (state.doublesCount === 3) {
      state.doublesCount = 0;
      return { goToJailForDoubles: true };
    }
  }

  return { goToJailForDoubles: false };
}

// Reset the doubles tracking at end of turn.
export function resetDoubles(state: GameState): void {
  state.doublesCount = 0;
  state.rolledDoubles = false;
}
