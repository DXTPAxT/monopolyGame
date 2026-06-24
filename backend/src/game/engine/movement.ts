import { GameState, Player } from '../types';
import { BOARD_SIZE, GO_SALARY } from '../board';

export interface MoveResult {
  newPosition: number;
  passedGo: boolean;
  events: string[];
}

// Move `player` forward (steps>0) or backward (steps<0) by `steps` tiles around the 40-tile board.
// If the player PASSES OR LANDS ON go (tile 0) while moving FORWARD, award GO_SALARY (200) to player.money
// and set passedGo=true with an event message. Moving BACKWARD never awards salary even if crossing tile 0.
// Mutates player.position and player.money. Returns the result.
export function moveBy(_state: GameState, player: Player, steps: number): MoveResult {
  const oldPosition = player.position;
  const events: string[] = [];

  if (steps >= 0) {
    // Forward movement
    const newPosition = (oldPosition + steps) % BOARD_SIZE;
    const passedGo = (oldPosition + steps) >= BOARD_SIZE;

    player.position = newPosition;

    if (passedGo) {
      player.money += GO_SALARY;
      events.push(`${player.name} đi qua ô GO và nhận $${GO_SALARY}.`);
    }

    return { newPosition, passedGo, events };
  } else {
    // Backward movement — never awards GO salary
    const newPosition = ((oldPosition + steps) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
    player.position = newPosition;

    return { newPosition, passedGo: false, events };
  }
}

// Move `player` directly to tileId. If grantGo (default true) AND the new position index is
// less than the old position (i.e. they advanced forward past GO), award GO_SALARY and set passedGo=true.
// Used by Chance "advance to" cards. If grantGo=false (e.g. go-to-jail), never award salary.
export function moveTo(_state: GameState, player: Player, tileId: number, opts?: { grantGo?: boolean }): MoveResult {
  const grantGo = opts?.grantGo ?? true;
  const oldPosition = player.position;
  const events: string[] = [];

  const passedGo = grantGo && (tileId < oldPosition);

  player.position = tileId;

  if (passedGo) {
    player.money += GO_SALARY;
    events.push(`${player.name} đi qua ô GO và nhận $${GO_SALARY}.`);
  }

  return { newPosition: tileId, passedGo, events };
}
