// ============================================================
// cardEngine.ts — áp dụng hiệu ứng thẻ bài lên người chơi
// docs/RULES.md §11
// ============================================================
import { GameState, Player, Card } from '../types';
import { moveBy, moveTo } from '../engine/movement';
import { GO_SALARY, BOARD_SIZE } from '../board';
import { isRailroad, isUtility } from '../board';

/**
 * Áp dụng hiệu ứng của một thẻ bài lên `player` (người chơi hiện tại).
 * Đột biến state/player tại chỗ. Trả về danh sách sự kiện.
 */
export function applyCard(
  state: GameState,
  player: Player,
  card: Card,
): { events: string[] } {
  const effect = card.effect;
  const events: string[] = [];

  switch (effect.kind) {
    case 'money': {
      const amount = effect.amount ?? 0;
      player.money += amount;
      if (amount >= 0) {
        events.push(`${player.name} nhận $${amount} từ ngân hàng.`);
      } else {
        events.push(`${player.name} trả $${Math.abs(amount)} cho ngân hàng.`);
      }
      break;
    }

    case 'moneyPerPlayer': {
      const amount = effect.amount ?? 0;
      const others = state.players.filter(
        (p) => p.id !== player.id && !p.isBankrupt,
      );
      if (amount > 0) {
        // Mỗi người chơi khác trả `amount` cho player này
        for (const other of others) {
          other.money -= amount;
          player.money += amount;
          events.push(
            `${other.name} trả $${amount} cho ${player.name}.`,
          );
        }
      } else {
        // Player này trả |amount| cho mỗi người chơi khác
        const pay = Math.abs(amount);
        for (const other of others) {
          player.money -= pay;
          other.money += pay;
          events.push(
            `${player.name} trả $${pay} cho ${other.name}.`,
          );
        }
      }
      break;
    }

    case 'moveTo': {
      const target = effect.target!;
      const grantGo = effect.grantGo ?? true;
      const result = moveTo(state, player, target, { grantGo });
      events.push(...result.events);
      events.push(`${player.name} di chuyển đến ô ${target}.`);
      break;
    }

    case 'moveBy': {
      const steps = effect.amount ?? 0;
      const result = moveBy(state, player, steps);
      events.push(...result.events);
      if (steps >= 0) {
        events.push(`${player.name} tiến ${steps} ô đến ô ${player.position}.`);
      } else {
        events.push(`${player.name} lùi ${Math.abs(steps)} ô đến ô ${player.position}.`);
      }
      break;
    }

    case 'goToJail': {
      player.position = 10;
      player.inJail = true;
      player.jailTurns = 0;
      events.push(`${player.name} bị vào tù! (ô 10)`);
      break;
    }

    case 'getOutOfJail': {
      player.getOutOfJailCards += 1;
      events.push(
        `${player.name} nhận 1 thẻ Ra Tù Miễn Phí (tổng: ${player.getOutOfJailCards}).`,
      );
      break;
    }

    case 'repairs': {
      const perHouse = effect.amount ?? 0;
      const perHotel = effect.perHotel ?? 0;
      let totalHouses = 0;
      let totalHotels = 0;

      for (const tile of state.tiles) {
        if (tile.ownerId === player.id) {
          if (tile.hotel) {
            totalHotels += 1;
            // hotel = 1 khách sạn + 0 nhà
          } else {
            totalHouses += tile.houses;
          }
        }
      }

      const cost = totalHouses * perHouse + totalHotels * perHotel;
      player.money -= cost;
      events.push(
        `${player.name} trả $${cost} tiền sửa chữa (${totalHouses} nhà × $${perHouse} + ${totalHotels} khách sạn × $${perHotel}).`,
      );
      break;
    }

    case 'advanceToGo': {
      player.position = 0;
      player.money += GO_SALARY;
      events.push(
        `${player.name} tiến đến ô GO và nhận $${GO_SALARY}.`,
      );
      break;
    }

    case 'nearest': {
      const nearestType = effect.nearest!;
      const currentPos = player.position;

      // Tìm ô gần nhất về phía trước (tăng dần, vòng quanh)
      let minSteps = BOARD_SIZE; // tối đa 40 bước
      let nearestTileId = -1;

      for (let steps = 1; steps <= BOARD_SIZE; steps++) {
        const candidateId = (currentPos + steps) % BOARD_SIZE;
        const isMatch =
          nearestType === 'railroad'
            ? isRailroad(candidateId)
            : isUtility(candidateId);
        if (isMatch) {
          minSteps = steps;
          nearestTileId = candidateId;
          break;
        }
      }

      // Di chuyển bằng moveBy để tự động xử lý qua GO
      const result = moveBy(state, player, minSteps);
      events.push(...result.events);
      events.push(
        `${player.name} tiến đến ${nearestType === 'railroad' ? 'nhà ga' : 'tiện ích'} gần nhất: ô ${nearestTileId}.`,
      );
      break;
    }

    default: {
      // Exhaustiveness guard
      const _exhaustive: never = effect.kind;
      events.push(`[cardEngine] Hiệu ứng không xác định: ${String(_exhaustive)}`);
    }
  }

  return { events };
}
