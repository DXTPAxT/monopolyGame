# Confirm-Then-Execute Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi đáp xuống bất kỳ ô nào, game hiện modal thông báo TRƯỚC; chỉ sau khi người chơi bấm Xác nhận mới thực thi hậu quả (trừ tiền / di chuyển / vào tù).

**Architecture:** Tách `resolveTileLanding` thành 2 pha. Pha THÔNG BÁO (`announceTileLanding`) chỉ set modal + lưu `pendingLanding`, không mutate. Pha THỰC THI (`confirmLanding`, gọi qua socket event `confirm_landing`) áp hiệu ứng rồi nối chuỗi hoặc tự kết thúc lượt.

**Tech Stack:** TypeScript, Node + Socket.IO (backend), React + Vite + socket.io-client (frontend), Vitest (test backend).

**Spec:** `docs/specs/2026-06-27-confirm-then-execute-landing-design.md`

## Global Constraints

- Bất biến: sau pha THÔNG BÁO, `player.money` / `player.position` / `player.inJail` / quyền sở hữu **không đổi** so với trước khi đáp ô.
- `buy_or_pass` (mua đất) và `bankruptcy_decision` (phá sản) đã đúng "hỏi trước" — **KHÔNG đổi hành vi**.
- Các hàm tầng module (`applyCard`, `moveBy`, `jailAction`, `goToJail`) vẫn mutate như cũ — KHÔNG sửa. Chỉ tầng `gameEngine.ts` (đường đi qua `rollDiceAndMove`) đổi sang announce/confirm.
- Backend test runner: `cd backend && npx vitest run` (chạy 1 file: `npx vitest run test/<file>`).
- Lệnh build kiểm tra type: backend `cd backend && npx tsc --noEmit`; frontend `cd frontend && npx tsc --noEmit`.
- Tiếng Việt cho log/UI text, giữ giọng văn như code hiện có.

---

## File Structure

**Backend**
- `src/game/types.ts` — thêm `PendingLanding` + field `pendingLanding` trên `GameState`.
- `src/game/gameEngine.ts` — thêm `announceTileLanding`, `confirmLanding`; bỏ `resolveTileLanding`/`drawAndApplyCard`; cập nhật `rollDiceAndMove`, `clearModals`, nhánh tù.
- `src/game/engine/turn.ts` — `endTurn` dọn `pendingLanding`.
- `src/realtime/events.ts` — `CONFIRM_LANDING` + payload.
- `src/index.ts` — handler `confirm_landing`.

**Frontend**
- `src/types/game.ts` — mirror `PendingLanding` + field.
- `src/hooks/useSocket.ts` — emitter `confirmLanding`.
- `src/components/InteractiveModal.tsx` — nút Xác nhận gọi `onConfirm`; thêm nhánh `go_to_jail` chờ.
- `src/App.tsx` — nối `onConfirm` xuống `InteractiveModal`.

**Tests**
- `backend/test/landingFlow.test.ts` — MỚI: announce/confirm + regression bug gốc.
- Cập nhật: các test đi qua `rollDiceAndMove` (xem Task 6).

---

### Task 1: Thêm type `PendingLanding` và plumbing state (backend + frontend)

**Files:**
- Modify: `backend/src/game/types.ts`
- Modify: `backend/src/game/gameEngine.ts` (`initializeGame`, `clearModals`)
- Modify: `backend/src/game/engine/turn.ts` (`endTurn`)
- Modify: `frontend/src/types/game.ts`
- Test: `backend/test/landingFlow.test.ts` (tạo mới)

**Interfaces:**
- Produces: `PendingLanding` interface; `GameState.pendingLanding: PendingLanding | null`.

- [ ] **Step 1: Viết test thất bại** — tạo `backend/test/landingFlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initializeGame, endTurn } from '../src/game/gameEngine';
import { Player } from '../src/game/types';

function mkPlayers(): Player[] {
  return [
    { id: 'p1', name: 'A', money: 2000, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: '#f00', getOutOfJailCards: 0, tokenSkin: 'default' },
    { id: 'p2', name: 'B', money: 2000, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: '#00f', getOutOfJailCards: 0, tokenSkin: 'default' },
  ];
}

describe('pendingLanding plumbing', () => {
  it('initializeGame sets pendingLanding to null', () => {
    const s = initializeGame('ROOM', mkPlayers());
    expect(s.pendingLanding).toBeNull();
  });

  it('endTurn clears pendingLanding', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    s.pendingLanding = { kind: 'pay_tax', tileId: 4, amount: 200 };
    endTurn(s);
    expect(s.pendingLanding).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd backend && npx vitest run test/landingFlow.test.ts`
Expected: FAIL (`pendingLanding` chưa tồn tại / không bị dọn).

- [ ] **Step 3: Thêm type vào `backend/src/game/types.ts`** — ngay sau interface `PendingPayment` (dòng ~66):

```ts
export interface PendingLanding {
  kind: 'pay_rent' | 'pay_tax' | 'card' | 'go_to_jail' | 'parking_jackpot';
  tileId?: number;
  amount?: number;
  ownerId?: string;
  card?: {
    type: 'chance' | 'community_chest';
    text: string;
    effect: CardEffect;
  };
}
```

Trong `interface GameState`, thêm field (cạnh `modalPayload`):

```ts
  pendingLanding: PendingLanding | null;
```

- [ ] **Step 4: Khởi tạo & dọn field trong `gameEngine.ts`**

Trong `initializeGame` return object (cạnh `modalPayload: null`):

```ts
    pendingLanding: null,
```

Trong `clearModals` thêm dòng cuối:

```ts
  state.pendingLanding = null;
```

- [ ] **Step 5: Dọn field trong `engine/turn.ts`** — trong `endTurn`, ở CẢ HAI nhánh (đổ đôi đi tiếp & chuyển lượt), cạnh `state.modalPayload = null;` thêm:

```ts
    state.pendingLanding = null;
```

- [ ] **Step 6: Mirror type frontend** — trong `frontend/src/types/game.ts` thêm `PendingLanding` (giống backend, cần có `CardEffect` — nếu frontend chưa có thì thêm union tối thiểu `{ kind: string; amount?: number; perHotel?: number; target?: number; nearest?: string; grantGo?: boolean }`) và thêm `pendingLanding: PendingLanding | null;` vào `GameState`.

- [ ] **Step 7: Chạy test + typecheck**

Run: `cd backend && npx vitest run test/landingFlow.test.ts`
Expected: PASS (2 test).
Run: `cd backend && npx tsc --noEmit` và `cd frontend && npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 8: Commit**

```bash
git add backend/src/game/types.ts backend/src/game/gameEngine.ts backend/src/game/engine/turn.ts frontend/src/types/game.ts backend/test/landingFlow.test.ts
git commit -m "feat(game): add pendingLanding state plumbing for deferred landing actions"
```

---

### Task 2: `announceTileLanding` + `confirmLanding` (additive, có unit test)

> Thêm 2 hàm MỚI, **không xoá** `resolveTileLanding`/`drawAndApplyCard` còn dùng. App vẫn chạy đường cũ. Cutover ở Task 4.

**Files:**
- Modify: `backend/src/game/gameEngine.ts`
- Test: `backend/test/landingFlow.test.ts`

**Interfaces:**
- Consumes: `getTile`, `calcRent`, `setDebt`, `clearModals`, `openBuildModal`, `goToJail`, `applyCard`, `endTurnModule`, `CHANCE_CARDS`, `COMMUNITY_CARDS` (đã import sẵn trong gameEngine.ts).
- Produces:
  - `announceTileLanding(state: GameState, player: Player, tile: TileMetadata, opts?: { forcedCardId?: string }): void`
  - `confirmLanding(state: GameState): { state: GameState; event: string }`

- [ ] **Step 1: Viết test thất bại** — thêm vào `backend/test/landingFlow.test.ts`:

```ts
import { announceTileLanding, confirmLanding } from '../src/game/gameEngine';
import { getTile } from '../src/game/board';

describe('announceTileLanding (no mutation) + confirmLanding (executes)', () => {
  it('tax: announce không trừ tiền, confirm mới trừ', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 4; // Thuế Thu Nhập $200
    announceTileLanding(s, p, getTile(4));
    expect(p.money).toBe(2000);
    expect(s.pendingLanding).toEqual({ kind: 'pay_tax', tileId: 4, amount: 200 });
    confirmLanding(s);
    expect(p.money).toBe(1800);
    expect(s.pendingLanding).toBeNull();
  });

  it('community chest goToJail: announce KHÔNG vào tù, confirm mới vào tù', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 2; // Quỹ Cộng Đồng
    announceTileLanding(s, p, getTile(2), { forcedCardId: 'community_09' });
    expect(p.inJail).toBe(false);
    expect(p.position).toBe(2);
    expect(s.activeCard?.type).toBe('community_chest');
    expect(s.pendingLanding?.kind).toBe('card');
    confirmLanding(s);
    expect(p.inJail).toBe(true);
    expect(p.position).toBe(10);
  });

  it('go_to_jail tile: announce không nhảy, confirm mới nhảy', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 30; // Vào Tù
    announceTileLanding(s, p, getTile(30));
    expect(p.inJail).toBe(false);
    expect(p.position).toBe(30);
    expect(s.pendingLanding?.kind).toBe('go_to_jail');
    confirmLanding(s);
    expect(p.inJail).toBe(true);
    expect(p.position).toBe(10);
  });

  it('rent: announce không trừ, confirm trừ và trả cho chủ', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    s.dice = [3, 3];
    const [a, b] = s.players;
    const tileId = 1; // Hồ Cốc, rent[0]=2
    s.tiles.find(t => t.id === tileId)!.ownerId = b.id;
    s.tiles.find(t => t.id === tileId)!.ownerVisits = 1;
    a.position = tileId;
    announceTileLanding(s, a, getTile(tileId));
    expect(a.money).toBe(2000);
    expect(s.pendingLanding).toEqual({ kind: 'pay_rent', tileId, amount: 2, ownerId: b.id });
    confirmLanding(s);
    expect(a.money).toBe(1998);
    expect(b.money).toBe(2002);
  });

  it('card di chuyển tới đất trống: confirm nối chuỗi sang buy_or_pass', () => {
    const s = initializeGame('ROOM', mkPlayers());
    s.diceRolled = true;
    const p = s.players[0];
    p.position = 7; // Cơ Hội
    // chance_03: moveTo target 24 (Vịnh Hạ Long, đất trống)
    announceTileLanding(s, p, getTile(7), { forcedCardId: 'chance_03' });
    expect(p.position).toBe(7);
    confirmLanding(s);
    expect(p.position).toBe(24);
    expect(s.currentActionRequired).toBe('buy_or_pass');
    expect(s.pendingLanding).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd backend && npx vitest run test/landingFlow.test.ts`
Expected: FAIL (`announceTileLanding`/`confirmLanding` chưa export).

- [ ] **Step 3: Thêm `announceTileLanding` vào `gameEngine.ts`** (đặt ngay trên `resolveTileLanding` hiện có):

```ts
// ---------- Announce Tile Landing (pha THÔNG BÁO, không mutate) ----------

export function announceTileLanding(
  state: GameState,
  player: Player,
  tile: TileMetadata,
  opts?: { forcedCardId?: string },
): void {
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
        tileState.ownerVisits += 1; // cập nhật sổ sách, được phép
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
        state.pendingLanding = { kind: 'pay_rent', tileId: tile.id, amount: rent, ownerId: owner.id };
        state.currentActionRequired = 'pay_rent';
        state.activeModal = 'pay_rent';
        state.modalPayload = { tileId: tile.id, amount: rent, ownerId: owner.id };
      }
      break;
    }

    case 'tax': {
      const taxAmount = tile.price || 0;
      state.pendingLanding = { kind: 'pay_tax', tileId: tile.id, amount: taxAmount };
      state.currentActionRequired = 'pay_tax';
      state.activeModal = 'pay_tax';
      state.modalPayload = { tileId: tile.id, amount: taxAmount };
      break;
    }

    case 'go_to_jail': {
      state.pendingLanding = { kind: 'go_to_jail' };
      state.currentActionRequired = 'go_to_jail';
      state.activeModal = 'jail';
      state.modalPayload = { tileId: 10 };
      break;
    }

    case 'chance':
    case 'community_chest': {
      const type = tile.type === 'chance' ? 'chance' : 'community_chest';
      const deck = type === 'chance' ? CHANCE_CARDS : COMMUNITY_CARDS;
      const card = opts?.forcedCardId
        ? deck.find((c) => c.id === opts.forcedCardId)!
        : deck[Math.floor(Math.random() * deck.length)];
      state.activeCard = { type, text: card.text };
      state.pendingLanding = { kind: 'card', card: { type, text: card.text, effect: card.effect } };
      state.currentActionRequired = 'draw_card';
      state.activeModal = type;
      state.modalPayload = { cardText: card.text };
      break;
    }

    case 'parking': {
      if (state.settings.houseRules.freeParkingJackpot && state.freeParkingPot > 0) {
        state.pendingLanding = { kind: 'parking_jackpot', amount: state.freeParkingPot };
        state.currentActionRequired = 'none';
        state.activeModal = 'go_landing';
        state.modalPayload = { amount: state.freeParkingPot };
      } else {
        clearModals(state);
      }
      break;
    }

    default: {
      // GO, Jail (thăm viếng): GO doubleGo là thưởng thụ động, áp ngay (không cần modal xác nhận).
      if (tile.id === 0 && state.settings.houseRules.doubleGo) {
        player.money += 200;
        state.logs.push(`${player.name} đáp đúng ô Bắt Đầu — thưởng gấp đôi (+$200)!`);
      }
      clearModals(state);
      break;
    }
  }
}
```

- [ ] **Step 4: Thêm `confirmLanding` vào `gameEngine.ts`** (đặt ngay sau `announceTileLanding`):

```ts
// ---------- Confirm Landing (pha THỰC THI) ----------

/** Sau khi thực thi xong: nếu không còn hành động/modal chờ → tự kết thúc lượt. */
function maybeAutoEndTurn(state: GameState): string | null {
  const blockingOrChoice =
    state.currentActionRequired !== 'none' ||
    state.pendingLanding !== null ||
    state.activeModal === 'build_houses' ||
    state.activeModal === 'buy_property';
  if (blockingOrChoice) return null;
  const res = endTurnModule(state);
  res.events.forEach((e) => state.logs.push(e));
  return res.events[0] ?? null;
}

export function confirmLanding(state: GameState): { state: GameState; event: string } {
  const player = state.players[state.activePlayerIndex];
  const pl = state.pendingLanding;

  if (!pl) {
    // Không có hậu quả chờ (ô an toàn) → kết thúc lượt.
    const ev = maybeAutoEndTurn(state) ?? 'Kết thúc lượt.';
    return { state, event: ev };
  }

  switch (pl.kind) {
    case 'pay_rent': {
      const owner = state.players.find((p) => p.id === pl.ownerId);
      const amount = pl.amount ?? 0;
      state.pendingLanding = null;
      if (!owner) { clearModals(state); break; }
      state.logs.push(`${player.name} phải trả $${amount} tiền thuê cho ${owner.name}.`);
      if (player.money >= amount) {
        player.money -= amount;
        owner.money += amount;
        clearModals(state);
      } else {
        setDebt(state, player, amount, owner.id, 'rent');
      }
      break;
    }

    case 'pay_tax': {
      const amount = pl.amount ?? 0;
      state.pendingLanding = null;
      if (state.settings.houseRules.freeParkingJackpot) {
        state.freeParkingPot += amount;
      }
      if (player.money >= amount) {
        player.money -= amount;
        clearModals(state);
      } else {
        setDebt(state, player, amount, 'bank', 'tax');
      }
      break;
    }

    case 'parking_jackpot': {
      const pot = pl.amount ?? 0;
      state.pendingLanding = null;
      player.money += pot;
      state.freeParkingPot = 0;
      state.logs.push(`${player.name} đáp Bãi Đỗ Xe và nhận hũ jackpot $${pot}!`);
      clearModals(state);
      break;
    }

    case 'go_to_jail': {
      state.pendingLanding = null;
      goToJail(state, player);
      clearModals(state);
      break;
    }

    case 'card': {
      const cardData = pl.card!;
      state.pendingLanding = null;
      const beforePos = player.position;
      const cardForEngine = { id: 'pending', text: cardData.text, effect: cardData.effect };
      const { events } = applyCard(state, player, cardForEngine);
      events.forEach((e) => state.logs.push(e));

      // Nợ âm tiền sau hiệu ứng (repairs / money / moneyPerPlayer)
      if (player.money < 0) {
        const debt = Math.abs(player.money);
        player.money = 0;
        setDebt(state, player, debt, 'bank', 'other');
        break;
      }
      // Thẻ đưa vào tù
      if (player.inJail) {
        clearModals(state);
        break;
      }
      // Thẻ di chuyển → thông báo ô mới (nối chuỗi)
      if (player.position !== beforePos) {
        clearModals(state);
        state.activeCard = null;
        announceTileLanding(state, player, getTile(player.position));
        break;
      }
      // Thẻ tiền/getOutOfJail/repairs (không di chuyển) → xong
      clearModals(state);
      break;
    }
  }

  const ev = maybeAutoEndTurn(state);
  return { state, event: ev ?? (state.logs[state.logs.length - 1] ?? 'Đã xác nhận.') };
}
```

> **Lưu ý cho người thực thi:** `applyCard` nhận tham số `Card`. `cardForEngine` đủ shape (`id`,`text`,`effect`). Import `Card` không cần thiết vì cấu trúc literal khớp; nếu `tsc` than phiền, ép kiểu `applyCard(state, player, cardForEngine as Card)` và import `Card` từ `./types`.

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd backend && npx vitest run test/landingFlow.test.ts`
Expected: PASS (tất cả test trong file).

- [ ] **Step 6: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add backend/src/game/gameEngine.ts backend/test/landingFlow.test.ts
git commit -m "feat(game): add announceTileLanding + confirmLanding deferred-execution functions"
```

---

### Task 3: Socket event `confirm_landing` (backend)

**Files:**
- Modify: `backend/src/realtime/events.ts`
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: `confirmLanding` (Task 2).
- Produces: client event `confirm_landing`.

- [ ] **Step 1: Thêm hằng + payload** trong `backend/src/realtime/events.ts`:

Trong `EVENTS.CLIENT` (cạnh `JAIL_ACTION`):

```ts
    CONFIRM_LANDING: 'confirm_landing',
```

Cuối phần CLIENT payloads:

```ts
export interface ConfirmLandingPayload {
  roomCode: string;
}
```

- [ ] **Step 2: Import `confirmLanding`** ở đầu `backend/src/index.ts` — thêm vào nhóm import từ `./game/gameEngine` (cạnh `passBuy`):

```ts
  confirmLanding,
```

- [ ] **Step 3: Thêm handler** trong `index.ts`, ngay sau handler `socket.on('end_turn', ...)`:

```ts
  socket.on('confirm_landing', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    const { state, event } = confirmLanding(room.gameState);
    room.gameState = state;
    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });
```

- [ ] **Step 4: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 5: Commit**

```bash
git add backend/src/realtime/events.ts backend/src/index.ts
git commit -m "feat(realtime): wire confirm_landing socket event"
```

---

### Task 4: Cutover `rollDiceAndMove` & nhánh tù sang announce; bỏ code cũ

**Files:**
- Modify: `backend/src/game/gameEngine.ts`
- Test: `backend/test/landingFlow.test.ts`

**Interfaces:**
- Consumes: `announceTileLanding` (Task 2).
- Sau task này: `resolveTileLanding` và `drawAndApplyCard` **bị xoá**.

- [ ] **Step 1: Viết test thất bại (đường rollDiceAndMove)** — thêm vào `landingFlow.test.ts`:

```ts
import { rollDiceAndMove } from '../src/game/gameEngine';

describe('rollDiceAndMove dùng announce (đáp ô không thực thi ngay)', () => {
  it('đáp ô thuế qua rollDiceAndMove: tiền chưa bị trừ, có pendingLanding', () => {
    const s = initializeGame('ROOM', mkPlayers());
    const p = s.players[0];
    p.position = 2; // sẽ tới ô 4 nếu ra tổng 2
    // Ép xúc xắc: không có API random injection ở rollDiceAndMove → set vị trí gần ô thuế và roll thật,
    // thay vào đó test trực tiếp announce đã đủ (Task 2). Ở đây kiểm tra side-effect tối thiểu:
    const before = p.money;
    rollDiceAndMove(s);
    // Sau roll, nếu đáp ô có hậu quả tiền thì tiền vẫn == before cho tới confirm.
    expect(p.money).toBe(before);
  });
});
```

> **Lưu ý:** vì `rollDiceAndMove` random, test này chỉ khẳng định bất biến "tiền không đổi ngay sau roll" (đúng cho mọi ô vì announce không trừ tiền; GO doubleGo mặc định tắt nên không cộng). Nếu cần test xác định hơn, dùng các test announce/confirm ở Task 2.

- [ ] **Step 2: Chạy test, xác nhận FAIL** (hiện tại `rollDiceAndMove` vẫn trừ tiền/di chuyển ngay nếu đáp ô có hậu quả)

Run: `cd backend && npx vitest run test/landingFlow.test.ts -t "tiền chưa bị trừ"`
Expected: có thể PASS hoặc FAIL tuỳ ô random — bỏ qua nếu flaky; trọng tâm là Step 3 cutover + suite ở Task 6. *(Người thực thi có thể xoá test flaky này nếu không ổn định và dựa vào test Task 2.)*

- [ ] **Step 3: Đổi mọi call site `resolveTileLanding` → `announceTileLanding`** trong `gameEngine.ts`:
  - Trong `rollDiceAndMove`, nhánh thoát tù bằng đôi (`resolveTileLanding(state, player, getTile(player.position));`) → `announceTileLanding(state, player, getTile(player.position));`
  - Cuối `rollDiceAndMove` (sau move thường): `resolveTileLanding(state, player, tile);` → `announceTileLanding(state, player, tile);`
  - Verify bằng: `grep -n "resolveTileLanding" backend/src/game/gameEngine.ts` → phải còn 0 chỗ gọi sau khi xoá định nghĩa.

- [ ] **Step 4: Nhánh 3 lần đôi → tù: hoãn tới confirm.** Trong `rollDiceAndMove` (~dòng 148-156), thay khối hiện tại:

```ts
  if (goToJailForDoubles) {
    goToJail(state, player);
    log += ' Đổ đôi 3 lần liên tiếp — bị áp giải vào tù!';
    clearModals(state);
    state.activeModal = 'jail';
    state.modalPayload = { tileId: 10 };
    state.logs.push(log);
    return { state, event: log };
  }
```

bằng:

```ts
  if (goToJailForDoubles) {
    log += ' Đổ đôi 3 lần liên tiếp — bị áp giải vào tù!';
    state.hasMoved = true;
    state.pendingLanding = { kind: 'go_to_jail' };
    state.currentActionRequired = 'go_to_jail';
    state.activeModal = 'jail';
    state.modalPayload = { tileId: 10 };
    state.logs.push(log);
    return { state, event: log };
  }
```

- [ ] **Step 5: Xoá định nghĩa `resolveTileLanding` và `drawAndApplyCard`** khỏi `gameEngine.ts` (toàn bộ 2 hàm cũ). Đảm bảo không còn tham chiếu.

- [ ] **Step 6: Typecheck + chạy file test landing**

Run: `cd backend && npx tsc --noEmit`
Expected: không lỗi (nếu báo `goToJail` unused thì vẫn còn dùng ở confirmLanding — OK).
Run: `cd backend && npx vitest run test/landingFlow.test.ts`
Expected: các test announce/confirm (Task 2) PASS. (Xoá test flaky Step 1 nếu cần.)

- [ ] **Step 7: Commit**

```bash
git add backend/src/game/gameEngine.ts backend/test/landingFlow.test.ts
git commit -m "refactor(game): cut rollDiceAndMove over to announceTileLanding; remove immediate-execute path"
```

---

### Task 5: Frontend — emitter + modal gọi confirm + nhánh go_to_jail

**Files:**
- Modify: `frontend/src/hooks/useSocket.ts`
- Modify: `frontend/src/components/InteractiveModal.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: socket event `confirm_landing` (Task 3); `gameState.pendingLanding`, `gameState.currentActionRequired`.
- Produces: prop `onConfirm` cho `InteractiveModal`.

- [ ] **Step 1: Thêm emitter `confirmLanding`** trong `useSocket.ts` (cạnh các emitter như `endTurn`/`buyProperty`):

```ts
  const confirmLanding = () => {
    socketRef.current?.emit('confirm_landing', { roomCode });
  };
```

Và thêm `confirmLanding` vào object return của hook.

- [ ] **Step 2: Đổi `InteractiveModal` dùng `onConfirm`** — thêm prop:

```ts
  onConfirm: () => void;
```

vào `InteractiveModalProps` và tham số hàm.

Đổi nút của các modal sau từ `onClick={onEndTurn}` → `onClick={onConfirm}`:
  - `card_info` (dòng ~301)
  - `rent_info` (dòng ~338)
  - `tax_info` (dòng ~371)
  - `jail_info` (dòng ~398)
  - `safe_info` (dòng ~430)

(Modal `buy_or_pass` và `bankruptcy` giữ nguyên `onBuy`/`onPass`/`onBankruptcy`.)

- [ ] **Step 3: Thêm nhánh hiển thị cho `go_to_jail` đang chờ** — trong khối xác định `modalType` (dòng ~52-77), thêm điều kiện ƯU TIÊN trước `safe_info`. Vì `go_to_jail` dùng `jail_info` UI nhưng người chơi CHƯA `inJail`, cập nhật điều kiện `jail_info`:

Đổi:

```ts
  } else if (activePlayer.inJail) {
    modalType = 'jail_info';
    isDismissible = true;
```

thành:

```ts
  } else if (activePlayer.inJail || currentActionRequired === 'go_to_jail') {
    modalType = 'jail_info';
    isDismissible = false; // bắt buộc bấm Xác nhận để vào tù
```

> Khi `currentActionRequired === 'go_to_jail'`, nút trong `jail_info` gọi `onConfirm` (đã đổi ở Step 2) → backend thực thi vào tù. Text "Chấp Nhận & Kết Thúc Lượt" vẫn phù hợp.

- [ ] **Step 4: Nối `onConfirm` ở `App.tsx`** — tìm nơi render `<InteractiveModal ... onEndTurn={...} />` và thêm:

```tsx
        onConfirm={confirmLanding}
```

(lấy `confirmLanding` từ `useSocket()`).

- [ ] **Step 5: Typecheck frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useSocket.ts frontend/src/components/InteractiveModal.tsx frontend/src/App.tsx
git commit -m "feat(ui): modal Xác nhận gọi confirm_landing; defer go-to-jail jump until confirm"
```

---

### Task 6: Sửa các test engine cũ (đường rollDiceAndMove) + chạy toàn bộ suite

> Các test đi qua `rollDiceAndMove` rồi assert tiền/vị trí/tù đổi NGAY giờ sẽ sai. Phải chèn `confirmLanding(state)` sau `rollDiceAndMove` để quan sát hiệu ứng.

**Files:**
- Modify (nếu fail): `backend/test/gameEngine.integration.test.ts`, `backend/test/turn.test.ts`, `backend/test/jail.test.ts`, `backend/test/jailDoubles.integration.test.ts`, `backend/test/debtRouting.integration.test.ts`, `backend/test/doublesWarning.integration.test.ts`, `backend/test/bankruptcy.test.ts`, `backend/test/movement.test.ts`.

**Interfaces:**
- Consumes: `confirmLanding`.

- [ ] **Step 1: Chạy toàn bộ suite để liệt kê test fail**

Run: `cd backend && npx vitest run`
Expected: một số test fail (những test đi qua `rollDiceAndMove` và assert hiệu ứng tức thì).

- [ ] **Step 2: Với MỖI test fail**, áp pattern sửa:
  - Sau dòng `rollDiceAndMove(state)` (hoặc biến tương đương), nếu test mong đợi hậu quả (trừ tiền/di chuyển thẻ/vào tù) thì thêm:

```ts
    confirmLanding(state);
```

  - Nếu test mô phỏng chuỗi thẻ-di-chuyển (đáp ô mới rồi mua/trả thuê), gọi `confirmLanding` nhiều lần cho tới khi `state.pendingLanding === null` và `state.currentActionRequired` về trạng thái mong đợi:

```ts
    while (state.pendingLanding !== null) confirmLanding(state);
```

  - Import `confirmLanding` từ `../src/game/gameEngine` ở đầu file test nếu chưa có.
  - KHÔNG nới lỏng assert giá trị — chỉ chèn bước confirm. Nếu một test kiểm tra cụ thể "vào tù do 3 đôi", thêm `confirmLanding(state)` rồi mới assert `inJail === true`.

- [ ] **Step 3: Test "3 lần đôi → tù" (jailDoubles)** — sau khi `rollDiceAndMove` lần thứ 3 trả về (đã set pending `go_to_jail`), thêm `confirmLanding(state)` rồi assert `player.inJail === true`, `player.position === 10`.

- [ ] **Step 4: Chạy lại toàn bộ suite**

Run: `cd backend && npx vitest run`
Expected: TẤT CẢ PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/test
git commit -m "test(game): update engine tests for announce/confirm landing flow"
```

---

### Task 7: Kiểm thử thủ công + chốt

**Files:** không sửa code (chỉ xác minh). Nếu phát hiện lỗi → quay lại task liên quan.

- [ ] **Step 1: Build cả hai phía**

Run: `cd backend && npx tsc --noEmit` → không lỗi.
Run: `cd frontend && npx tsc --noEmit` → không lỗi.

- [ ] **Step 2: Chạy game thủ công** (theo cách chạy dự án — backend `npm run dev`, frontend `npm run dev`), mở 2 client, xác minh các kịch bản trong Definition of Done của spec §10:
  - Đáp Quỹ Cộng Đồng/Cơ Hội: quân đứng yên, hiện thẻ; bấm Xác nhận mới áp hiệu ứng.
  - Đáp ô thuế/đất người khác: tiền chỉ trừ sau khi Xác nhận.
  - Đáp ô Vào Tù (30) & 3 đôi: cảnh báo trước, Xác nhận mới nhảy.
  - Thẻ di chuyển → ô mua/thuê: chuỗi modal đúng thứ tự.
  - Mua đất & phá sản như cũ.

- [ ] **Step 3: Commit (nếu có chỉnh sửa nhỏ)** và báo hoàn thành.

---

## Self-Review (đã thực hiện khi viết plan)

- **Spec coverage:** §3 (type) → Task 1; §4.1 announce → Task 2 Step 3; §4.2 confirm → Task 2 Step 4; §4.3 cutover/jail → Task 4; §4.4 clearModals/endTurn → Task 1; §4.5 socket → Task 3; §5 frontend → Task 5; §7 tests → Task 2/6 + regression Task 2 Step 1; §10 DoD → Task 7. Tất cả mục có task.
- **Placeholder scan:** không có TBD/TODO; code đầy đủ trong mỗi step.
- **Type consistency:** `announceTileLanding(state, player, tile, opts?)` và `confirmLanding(state)` dùng nhất quán giữa Task 2/3/4/6; `pendingLanding.kind` khớp union ở Task 1.
- **Sai khác có chủ đích so với spec:** GO `doubleGo` áp ngay trong announce (thưởng thụ động, tránh nested-confirm trong chuỗi) — đã ghi chú trong Task 2 Step 3.
