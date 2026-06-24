// ============================================================
// gameEngine.ts — FACADE
// Giữ API cũ mà index.ts / gameManager.ts đang dùng, nhưng bên trong
// dùng các module engine mới (đã unit-test) theo docs/RULES.md.
// ============================================================
import {
  GameState, Player, TileMetadata, TileState, RoomSettings, DEFAULT_ROOM_SETTINGS,
} from './types';
import boardDataRaw from '../data/board.json';
import { rollDice } from '../utils/helpers';
import { getTile } from './board';
import { registerRoll } from './engine/dice';
import { moveBy } from './engine/movement';
import { calcRent } from './engine/rent';
import { buildHouse as buildHouseModule, sellHouse as sellHouseModule } from './engine/build';
import { mortgage as mortgageModule, unmortgage as unmortgageModule, sellDeed as sellDeedModule } from './engine/mortgage';
import { goToJail, jailAction } from './engine/jail';
import { applyCard } from './cards/cardEngine';
import { CHANCE_CARDS } from './cards/chance';
import { COMMUNITY_CARDS } from './cards/community';
import { declareBankruptcy as bankruptcyModule, settleDebt as settleDebtModule, liquidatableWorth } from './engine/bankruptcy';
import { endTurn as endTurnModule } from './engine/turn';
import { checkInstantWin } from './engine/winConditions';

const boardData = boardDataRaw as TileMetadata[];

export function initializeGame(roomCode: string, players: Player[], settings: RoomSettings = DEFAULT_ROOM_SETTINGS): GameState {
  const tiles: TileState[] = boardData.map((tile) => ({
    id: tile.id,
    ownerId: null,
    houses: 0,
    hotel: false,
    mortgaged: false,
    ownerVisits: 0,
  }));

  const logs = ['Trận đấu bắt đầu! Chúc các bạn chơi game vui vẻ.'];

  return {
    roomCode,
    players: players.map((p) => ({
      ...p,
      money: settings.startingMoney,
      position: 0,
      isBankrupt: false,
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      tokenSkin: p.tokenSkin || 'default',
    })),
    tiles,
    activePlayerIndex: 0,
    dice: [1, 1],
    diceRolled: false,
    hasMoved: false,
    currentActionRequired: 'none',
    pendingPayment: null,
    winnerId: null,
    logs,
    activeCard: null,
    activeModal: null,
    modalPayload: null,
    settings,
    freeParkingPot: 0,
    rolledDoubles: false,
    doublesCount: 0,
    turnDeadline: null,
  };
}

// ---------- Helpers ----------

function clearModals(state: GameState) {
  state.currentActionRequired = 'none';
  state.activeModal = null;
  state.modalPayload = null;
}

/** Mở modal xây nhà (tùy chọn, không chặn kết thúc lượt) cho ô property đang đứng. */
function openBuildModal(state: GameState, tileId: number) {
  state.currentActionRequired = 'none';
  state.activeModal = 'build_houses';
  state.modalPayload = { tileId };
}

/**
 * Thiết lập trạng thái nợ khi tiền mặt không đủ. Nếu người chơi CÒN có thể bán/cầm cố
 * (liquidatableWorth ≥ nợ) → must_raise_funds (KHÔNG mở modal phá sản che màn hình, để
 * họ vào panel "Tài sản của tôi" gom tiền rồi bấm thanh toán). Chỉ khi thật sự không cứu
 * được mới mở modal phá sản.
 */
function setDebt(state: GameState, player: Player, amount: number, toPlayerId: string | 'bank', purpose: 'rent' | 'tax' | 'jail_fine' | 'other') {
  state.pendingPayment = { fromPlayerId: player.id, toPlayerId, amount, purpose };

  if (liquidatableWorth(state, player.id) >= amount) {
    state.currentActionRequired = 'must_raise_funds';
    state.activeModal = null;
    state.modalPayload = null;
  } else {
    state.currentActionRequired = 'bankruptcy_decision';
    state.activeModal = 'bankruptcy';
    state.modalPayload = { amount, toPlayerId };
  }
}

// ---------- Roll & Move ----------

export function rollDiceAndMove(state: GameState): { state: GameState; event: string } {
  if (state.diceRolled) {
    return { state, event: 'Bạn đã đổ xúc xắc trong lượt này rồi!' };
  }

  state.activeCard = null;
  const player = state.players[state.activePlayerIndex];
  const dice = rollDice();
  state.dice = dice;
  state.diceRolled = true;
  const total = dice[0] + dice[1];
  let log = `${player.name} đổ được ${dice[0]} & ${dice[1]} (tổng ${total}).`;

  // --- Đang ở tù: lượt tung này chỉ để thử thoát, KHÔNG tính doubles-again ---
  if (player.inJail) {
    const r = jailAction(state, 'roll');
    // Luật chuẩn: thoát tù bằng đôi KHÔNG được đi thêm lượt.
    // House rule allowJailDoublesContinue: cho đi tiếp nếu thoát bằng đôi.
    const escapedByDouble = r.freed && state.dice[0] === state.dice[1];
    state.rolledDoubles = escapedByDouble && state.settings.houseRules.allowJailDoublesContinue;
    log += ' ' + r.events.join(' ');
    if (!r.freed) {
      state.activeModal = 'jail';
      state.modalPayload = { tileId: 10 };
      state.currentActionRequired = state.currentActionRequired === 'must_raise_funds' ? 'bankruptcy_decision' : 'none';
      if (state.currentActionRequired === 'bankruptcy_decision') {
        setDebt(state, player, 50, 'bank', 'jail_fine');
      }
      state.logs.push(log);
      return { state, event: log };
    }
    // Đã ra tù và jailAction đã di chuyển → giải quyết ô đáp xuống
    state.hasMoved = true;
    resolveTileLanding(state, player, getTile(player.position));
    state.logs.push(log);
    return { state, event: log };
  }

  // --- Không ở tù: đăng ký doubles ---
  const { goToJailForDoubles } = registerRoll(state);
  if (goToJailForDoubles) {
    goToJail(state, player);
    log += ' Đổ đôi 3 lần liên tiếp — bị áp giải vào tù!';
    clearModals(state);
    state.activeModal = 'jail';
    state.modalPayload = { tileId: 10 };
    state.logs.push(log);
    return { state, event: log };
  }

  const mv = moveBy(state, player, total);
  if (mv.passedGo) log += ' Đi qua ô Bắt Đầu, nhận $200.';
  state.hasMoved = true;
  const tile = getTile(player.position);
  log += ` Đi vào ô [${tile.name}].`;
  // Cảnh báo đổ đôi liên tiếp (lần 2) — để người chơi biết lần 3 sẽ vào tù.
  if (state.doublesCount === 2) {
    log += ' ⚠️ Đổ đôi lần thứ 2 liên tiếp — nếu đổ đôi lần nữa bạn sẽ bị vào tù!';
  }
  resolveTileLanding(state, player, tile);

  state.logs.push(log);
  return { state, event: log };
}

// ---------- Resolve Tile Landing ----------

function resolveTileLanding(state: GameState, player: Player, tile: TileMetadata) {
  const tileState = state.tiles.find((t) => t.id === tile.id)!;

  switch (tile.type) {
    case 'property':
    case 'railroad':
    case 'utility': {
      if (tileState.ownerId === null) {
        state.currentActionRequired = 'buy_or_pass';
        state.activeModal = 'buy_property';
        state.modalPayload = { tileId: tile.id };
      } else if (tileState.ownerId === player.id) {
        // Đáp lại ô của mình → tăng số lần ghé; nếu là đất thường → mở modal xây
        tileState.ownerVisits += 1;
        if (tile.type === 'property') {
          openBuildModal(state, tile.id);
        } else {
          clearModals(state);
        }
      } else {
        const owner = state.players.find((p) => p.id === tileState.ownerId);
        if (!owner || owner.isBankrupt || tileState.mortgaged) {
          clearModals(state);
          break;
        }
        const rent = calcRent(state, tile.id, state.dice[0] + state.dice[1]);
        state.logs.push(`${player.name} phải trả $${rent} tiền thuê cho ${owner.name}.`);
        if (player.money >= rent) {
          player.money -= rent;
          owner.money += rent;
          state.currentActionRequired = 'none';
          state.activeModal = 'pay_rent';
          state.modalPayload = { tileId: tile.id, amount: rent, ownerId: owner.id };
        } else {
          setDebt(state, player, rent, owner.id, 'rent');
        }
      }
      break;
    }

    case 'tax': {
      const taxAmount = tile.price || 0;
      if (state.settings.houseRules.freeParkingJackpot) {
        state.freeParkingPot += taxAmount;
      }
      if (player.money >= taxAmount) {
        player.money -= taxAmount;
        state.currentActionRequired = 'none';
        state.activeModal = 'pay_tax';
        state.modalPayload = { tileId: tile.id, amount: taxAmount };
      } else {
        setDebt(state, player, taxAmount, 'bank', 'tax');
      }
      break;
    }

    case 'go_to_jail': {
      goToJail(state, player);
      clearModals(state);
      state.activeModal = 'jail';
      state.modalPayload = { tileId: 10 };
      break;
    }

    case 'chance':
      drawAndApplyCard(state, player, 'chance');
      break;

    case 'community_chest':
      drawAndApplyCard(state, player, 'community_chest');
      break;

    case 'parking': {
      if (state.settings.houseRules.freeParkingJackpot && state.freeParkingPot > 0) {
        const pot = state.freeParkingPot;
        player.money += pot;
        state.freeParkingPot = 0;
        state.logs.push(`${player.name} đáp Bãi Đỗ Xe và nhận hũ jackpot $${pot}!`);
      }
      clearModals(state);
      break;
    }

    default: {
      // GO, Jail (just visiting)
      if (tile.id === 0 && state.settings.houseRules.doubleGo) {
        player.money += 200;
        state.logs.push(`${player.name} đáp đúng ô Bắt Đầu — thưởng gấp đôi (+$200)!`);
      }
      clearModals(state);
      break;
    }
  }
}

// ---------- Cards ----------

function drawAndApplyCard(state: GameState, player: Player, type: 'chance' | 'community_chest') {
  const deck = type === 'chance' ? CHANCE_CARDS : COMMUNITY_CARDS;
  const card = deck[Math.floor(Math.random() * deck.length)];
  const beforePos = player.position;

  const { events } = applyCard(state, player, card);
  events.forEach((e) => state.logs.push(e));
  state.activeCard = { type, text: card.text };

  // Nợ âm tiền sau hiệu ứng (repairs / money / moneyPerPlayer)
  if (player.money < 0) {
    const debt = Math.abs(player.money);
    player.money = 0;
    setDebt(state, player, debt, 'bank', 'other');
    return;
  }

  // Thẻ đưa vào tù
  if (player.inJail) {
    clearModals(state);
    state.activeModal = 'jail';
    state.modalPayload = { tileId: 10 };
    return;
  }

  // Thẻ di chuyển → giải quyết ô mới (nếu là ô có hành động)
  if (player.position !== beforePos) {
    const newTile = getTile(player.position);
    if (['property', 'railroad', 'utility', 'tax'].includes(newTile.type)) {
      resolveTileLanding(state, player, newTile);
      return;
    }
  }

  // Mặc định: hiện modal thẻ
  state.currentActionRequired = 'none';
  state.activeModal = type;
  state.modalPayload = { cardText: card.text };
}

// ---------- Buy ----------

export function buyProperty(state: GameState): { state: GameState; event: string } {
  const player = state.players[state.activePlayerIndex];
  const tileId = player.position;
  const tileMeta = getTile(tileId);
  const tileState = state.tiles.find((t) => t.id === tileId);

  if (!tileMeta || !tileState || tileState.ownerId !== null) {
    return { state, event: 'Ô cờ không thể mua hoặc đã có người sở hữu!' };
  }
  const price = tileMeta.price || 0;
  if (player.money < price) {
    return { state, event: 'Bạn không đủ tiền để mua tài sản này!' };
  }

  player.money -= price;
  tileState.ownerId = player.id;
  tileState.ownerVisits = 1; // lần đáp đầu tiên (mua)

  const logMsg = `${player.name} đã mua [${tileMeta.name}] với giá $${price}.`;
  state.logs.push(logMsg);

  // Thắng nhanh: 3 nhóm màu / trọn 1 cạnh / cả 4 nhà ga
  const win = checkInstantWin(state);
  if (win.gameOver) {
    clearModals(state);
    return { state, event: logMsg };
  }

  // Đất thường → mở modal xây (lần 1 được tới 4 nhà). Ga/tiện ích → đóng modal.
  if (tileMeta.type === 'property') {
    openBuildModal(state, tileId);
  } else {
    clearModals(state);
  }
  return { state, event: logMsg };
}

// ---------- Build (anytime in your turn) ----------

export function buildHouse(state: GameState, tileId: number): { state: GameState; event: string } {
  const res = buildHouseModule(state, tileId);
  if (!res.ok) {
    return { state, event: res.error || 'Không thể xây dựng.' };
  }
  res.events.forEach((e) => state.logs.push(e));
  return { state, event: res.events[0] };
}

/** Từ chối mua → ô vẫn thuộc ngân hàng (không còn đấu giá). */
export function passBuy(state: GameState): { state: GameState; event: string } {
  const player = state.players[state.activePlayerIndex];
  clearModals(state);
  const event = `${player.name} quyết định không mua tài sản.`;
  state.logs.push(event);
  return { state, event };
}

/** Đóng modal xây nhà (người chơi bấm "Xong"). */
export function finishBuild(state: GameState): { state: GameState; event: string } {
  clearModals(state);
  return { state, event: 'Kết thúc xây dựng.' };
}

/** @deprecated GO chuẩn $200 — giữ để tương thích socket. Xây khách sạn nay qua buildHouse. */
export function upgradeHotel(state: GameState): { state: GameState; event: string } {
  const player = state.players[state.activePlayerIndex];
  return buildHouse(state, player.position);
}

/** @deprecated GO bonus tùy chọn đã bỏ — giữ để tương thích socket. */
export function handleGoBonus(
  state: GameState,
  _choiceType?: 'money' | 'upgrade',
  _tileId?: number,
): { state: GameState; event: string } {
  clearModals(state);
  return { state, event: 'Ô Bắt Đầu nay áp dụng luật chuẩn ($200 khi đi qua).' };
}

// ---------- End Turn ----------

export function endTurn(state: GameState): { state: GameState; event: string } {
  if (!state.diceRolled) {
    return { state, event: 'Bạn phải đổ xúc xắc trước khi kết thúc lượt!' };
  }

  if (state.currentActionRequired !== 'none') {
    if (state.currentActionRequired === 'buy_or_pass') {
      const p = state.players[state.activePlayerIndex];
      clearModals(state);
      state.logs.push(`${p.name} quyết định không mua tài sản.`);
    } else {
      return { state, event: 'Bạn phải giải quyết hành động bắt buộc trước khi kết thúc lượt!' };
    }
  }

  const res = endTurnModule(state);
  res.events.forEach((e) => state.logs.push(e));
  return { state, event: res.events[0] };
}

// ---------- Bankruptcy ----------

export function declareBankruptcy(state: GameState): { state: GameState; event: string } {
  const bankrupt = state.players[state.activePlayerIndex];
  const res = bankruptcyModule(state);

  const logMsg = `[PHÁ SẢN] ${bankrupt.name} đã tuyên bố phá sản!`;
  state.logs.push(logMsg);
  clearModals(state);

  if (res.gameOver && res.winnerId) {
    const winner = state.players.find((p) => p.id === res.winnerId);
    state.logs.push(`[KẾT THÚC] ${winner?.name} là người chiến thắng chung cuộc!`);
    return { state, event: logMsg };
  }

  // Chủ nợ nhận đất → có thể thoả điều kiện thắng nhanh
  const groupWin = checkInstantWin(state);
  if (groupWin.gameOver) {
    return { state, event: logMsg };
  }

  // Chuyển lượt sang người kế tiếp
  state.rolledDoubles = false;
  const turn = endTurnModule(state);
  turn.events.forEach((e) => state.logs.push(e));
  return { state, event: logMsg };
}

// ============================================================
// WS-2 facade: quản lý tài sản, đấu giá, giao dịch, ra tù chủ động
// ============================================================

export function sellHouse(state: GameState, tileId: number): { state: GameState; event: string } {
  const res = sellHouseModule(state, tileId);
  if (!res.ok) return { state, event: res.error || 'Không thể bán công trình.' };
  res.events.forEach((e) => state.logs.push(e));
  return { state, event: res.events[0] };
}

export function mortgageTile(state: GameState, tileId: number): { state: GameState; event: string } {
  const res = mortgageModule(state, tileId);
  if (!res.ok) return { state, event: res.error || 'Không thể cầm cố.' };
  res.events.forEach((e) => state.logs.push(e));
  return { state, event: res.events[0] };
}

export function unmortgageTile(state: GameState, tileId: number): { state: GameState; event: string } {
  const res = unmortgageModule(state, tileId);
  if (!res.ok) return { state, event: res.error || 'Không thể chuộc.' };
  res.events.forEach((e) => state.logs.push(e));
  return { state, event: res.events[0] };
}

/** Bán đứt sổ đỏ (chỉ khi house rule sellDeedOutright bật): nhận 80%, ô về ngân hàng. */
export function sellDeedTile(state: GameState, tileId: number): { state: GameState; event: string } {
  if (!state.settings.houseRules.sellDeedOutright) {
    return { state, event: 'Chế độ bán đứt sổ đỏ chưa được bật.' };
  }
  const res = sellDeedModule(state, tileId);
  if (!res.ok) return { state, event: res.error || 'Không thể bán đứt.' };
  res.events.forEach((e) => state.logs.push(e));
  // Bán đứt có thể giúp đủ tiền trả nợ đang treo
  return { state, event: res.events[0] };
}

/** Người chơi đang ở tù chủ động trả $50 hoặc dùng thẻ để ra tù (rồi tự tung như thường). */
export function leaveJail(state: GameState, method: 'pay' | 'use_card'): { state: GameState; event: string } {
  const res = jailAction(state, method);
  if (!res.ok) return { state, event: res.error || 'Không thể ra tù.' };
  // Đã ra tù; modal jail đóng lại để người chơi tung xúc xắc bình thường
  if (res.freed) clearModals(state);
  const event = res.events[0] || 'Đã ra tù.';
  return { state, event };
}

/** Sau khi đã bán/cầm cố đủ tiền, thanh toán khoản nợ đang treo (must_raise_funds). */
export function settleRaisedFunds(state: GameState): { state: GameState; event: string } {
  const res = settleDebtModule(state);
  res.events.forEach((e) => state.logs.push(e));
  if (res.gameOver && res.winnerId) {
    const w = state.players.find((p) => p.id === res.winnerId);
    state.logs.push(`[KẾT THÚC] ${w?.name} chiến thắng!`);
  } else {
    clearModals(state);
  }
  return { state, event: res.events[0] || 'Đã thanh toán nợ.' };
}
