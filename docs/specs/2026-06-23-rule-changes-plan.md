# Đổi Luật (Bỏ Trade/Auction, Xây-Khi-Đáp, Thắng 3 Nhóm) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc superpowers:executing-plans. Steps dùng checkbox (`- [ ]`).
> **Không phải git repo** → thay "commit" bằng chạy test/build làm cổng chất lượng.

**Goal:** Bỏ giao dịch & đấu giá; xây nhà chỉ khi đáp xuống ô (lần 1 mua→tới 4 nhà, lần 2+→khách sạn); thêm luật thắng khi sở hữu trọn 3 nhóm màu; giữ nguyên tiền thuê.

**Architecture:** Engine thuần (TDD) trong `backend/src/game/engine` + facade `gameEngine.ts`; socket `index.ts`; FE React + socket.io. Theo dõi lần đáp bằng `TileState.ownerVisits`. Thắng-3-nhóm là helper kiểm sau mỗi lần đổi chủ đất.

**Tech Stack:** TypeScript, Node, socket.io, Vitest (BE), React + Vite + Vitest (FE).

## Global Constraints
- Cổng chất lượng: `cd backend && npm test` (mong đợi xanh) + `npx tsc --noEmit`; `cd frontend && npx tsc -b` + `npx vite build` (exit 0). FE cài bằng `--legacy-peer-deps`.
- Giữ nguyên `engine/rent.ts` (kể cả bonus ×2 trọn nhóm).
- Mọi text người dùng thấy bằng tiếng Việt, theo giọng văn file hiện có.
- Khách sạn = `houses===4` rồi `hotel=true`; rent khách sạn = `rent[5]`.

## Phân công agent (đề xuất)
| Task | Nội dung | Agent |
|---|---|---|
| 1 | Model `types.ts` (thêm ownerVisits, gỡ Trade/Auction types) | 🔵 Sonnet |
| 2 | `build.ts` luật xây mới + test (TDD) | 🟣 Opus (tự làm) |
| 3 | Win 3 nhóm: helper + test (TDD) | 🟣 Opus (tự làm) |
| 4 | `gameEngine.ts` wiring (ownerVisits, build modal, passBuy, win, gỡ facade) | 🟣 Opus (tự làm) |
| 5 | Gỡ Trade/Auction backend (files, socket, reconnect) | 🔵 Sonnet |
| 6 | FE `types/game.ts` + `useSocket.ts` cleanup | 🔵 Sonnet |
| 7 | FE modals: gỡ Trade/Auction, BuildModal, PortfolioPanel, Board | 🔵 Sonnet |
| 8 | FE `useGameSelectors` canBuild + test | 🟢 Haiku |
| 9 | Docs `RULES.md` + `PROGRESS.md` | 🟢 Haiku |

Thứ tự bắt buộc: 2 và 3 độc lập (làm song song được). 1 trước 4,5. 4 sau 1,2,3. 5 sau 4. FE 6→7→8 sau khi BE (1–5) xanh. 9 cuối.

---

### Task 1: Model dữ liệu backend

**Files:**
- Modify: `backend/src/game/types.ts`

**Interfaces:**
- Produces: `TileState.ownerVisits: number`; `GameState` không còn `auction`, `pendingTrades`; `ModalType` thêm `'build_houses'`, bỏ `'auction'`,`'trade'`; `ActionRequired` bỏ `'auction'`.

- [ ] **Step 1:** Trong `TileState` thêm `ownerVisits: number;` (sau `mortgaged`).
- [ ] **Step 2:** Xóa `interface AuctionState`, `interface TradeBundle`, `interface TradeOffer`.
- [ ] **Step 3:** Trong `GameState` xóa dòng `auction: AuctionState | null;` và `pendingTrades: TradeOffer[];`.
- [ ] **Step 4:** `ModalType`: bỏ `'auction'`, `'trade'`; thêm `'build_houses'` (giữ `'upgrade_hotel'` tạm để không vỡ FE, sẽ dọn ở Task 7).
- [ ] **Step 5:** `ActionRequired`: bỏ `'auction'`.
- [ ] **Step 6:** Chạy `cd backend && npx tsc --noEmit` — kỳ vọng LỖI ở các file còn tham chiếu auction/trade (đó là tín hiệu cho Task 4,5). Ghi nhận, chưa sửa.

---

### Task 2: Luật xây mới (`build.ts`) — TDD

**Files:**
- Modify: `backend/src/game/engine/build.ts`
- Test: `backend/src/game/engine/build.test.ts` (viết lại)

**Interfaces:**
- Consumes: `TileState.ownerVisits` (Task 1).
- Produces: `buildHouse(state, tileId): BuildResult` luật mới; `sellHouse` bỏ bán-đều.

- [ ] **Step 1: Viết test thất bại** — thay nội dung `build.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildHouse, sellHouse } from './build';
import { initializeGame } from '../gameEngine';
import { Player } from '../types';

function setup() {
  const players: Player[] = [
    { id: 'p1', name: 'A', money: 5000, position: 1, isBankrupt: false, inJail: false, jailTurns: 0, color: 'red', getOutOfJailCards: 0, tokenSkin: 'default' },
    { id: 'p2', name: 'B', money: 5000, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: 'blue', getOutOfJailCards: 0, tokenSkin: 'default' },
  ];
  const s = initializeGame('R', players);
  return s;
}
// ô 1 = property nhóm brown (theo board.json)
function ownTile(s: any, id: number, ownerId = 'p1', visits = 1) {
  const t = s.tiles.find((x: any) => x.id === id);
  t.ownerId = ownerId; t.ownerVisits = visits;
}

describe('buildHouse — luật mới', () => {
  it('xây được dù KHÔNG sở hữu trọn nhóm màu (đang đứng trên ô)', () => {
    const s = setup();
    s.players[0].position = 1; ownTile(s, 1, 'p1', 1);
    const r = buildHouse(s, 1);
    expect(r.ok).toBe(true);
    expect(s.tiles.find((t: any) => t.id === 1).houses).toBe(1);
  });

  it('KHÔNG xây được nếu không đứng trên ô', () => {
    const s = setup();
    s.players[0].position = 39; ownTile(s, 1, 'p1', 1);
    const r = buildHouse(s, 1);
    expect(r.ok).toBe(false);
  });

  it('chặn khách sạn khi ownerVisits < 2', () => {
    const s = setup();
    s.players[0].position = 1; ownTile(s, 1, 'p1', 1);
    const t = s.tiles.find((x: any) => x.id === 1); t.houses = 4;
    const r = buildHouse(s, 1);
    expect(r.ok).toBe(false);
  });

  it('cho khách sạn khi ownerVisits >= 2 và đủ 4 nhà', () => {
    const s = setup();
    s.players[0].position = 1; ownTile(s, 1, 'p1', 2);
    const t = s.tiles.find((x: any) => x.id === 1); t.houses = 4;
    const r = buildHouse(s, 1);
    expect(r.ok).toBe(true);
    expect(t.hotel).toBe(true);
  });

  it('không xây khi ô bị cầm cố', () => {
    const s = setup();
    s.players[0].position = 1; ownTile(s, 1, 'p1', 1);
    s.tiles.find((x: any) => x.id === 1).mortgaged = true;
    expect(buildHouse(s, 1).ok).toBe(false);
  });
});

describe('sellHouse — bỏ bán đều', () => {
  it('bán được 1 ô lẻ trong nhóm mà không cần bán đều', () => {
    const s = setup();
    ownTile(s, 1, 'p1', 1); ownTile(s, 3, 'p1', 1);
    s.tiles.find((x: any) => x.id === 1).houses = 2;
    s.tiles.find((x: any) => x.id === 3).houses = 0;
    const r = sellHouse(s, 1);
    expect(r.ok).toBe(true);
    expect(s.tiles.find((x: any) => x.id === 1).houses).toBe(1);
  });
});
```

- [ ] **Step 2: Chạy** `cd backend && npx vitest run src/game/engine/build.test.ts` — kỳ vọng FAIL.
- [ ] **Step 3: Sửa `build.ts`** — trong `buildHouse`:
  - Bỏ kiểm tra `ownsFullGroup` (xóa hàm hoặc bỏ gọi).
  - Bỏ kiểm tra "xây đều" (đoạn `myLevel > minLevel`).
  - Đổi kiểm tra cầm cố nhóm → chỉ chính ô: `if (tileState.mortgaged) return {ok:false,error:'Không thể xây trên ô đang bị cầm cố.',events:[]}`.
  - Thêm gate vị trí: `const player = activePlayer(state); if (player.position !== tileId) return {ok:false,error:'Chỉ được xây khi đang đứng trên ô của bạn.',events:[]};`
  - Trước khi xây khách sạn (`buildingHotel = tileState.houses === 4`): `if (buildingHotel && tileState.ownerVisits < 2) return {ok:false,error:'Cần đáp xuống ô lần thứ 2 mới được lên Khách Sạn.',events:[]};`
  - Trong `sellHouse`: xóa đoạn kiểm tra `myLevel < maxLevel` (bán đều).
- [ ] **Step 4: Chạy** lại test ở Step 2 — kỳ vọng PASS.
- [ ] **Step 5: Cổng** `cd backend && npx vitest run src/game/engine/build.test.ts` PASS.

---

### Task 3: Luật thắng 3 nhóm màu — TDD

**Files:**
- Modify: `backend/src/game/board.ts` (thêm helper)
- Create: `backend/src/game/engine/winGroups.ts`
- Test: `backend/src/game/engine/winGroups.test.ts`

**Interfaces:**
- Produces: `countFullGroups(state, playerId): number` (board.ts); `checkColorGroupWin(state): { gameOver: boolean; winnerId?: string }` (winGroups.ts).

- [ ] **Step 1: Viết test thất bại** `winGroups.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initializeGame } from '../gameEngine';
import { checkColorGroupWin } from './winGroups';
import { getGroupTiles, PROPERTY_GROUPS } from '../board';

function players() {
  return [
    { id: 'p1', name: 'A', money: 1500, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: 'red', getOutOfJailCards: 0, tokenSkin: 'default' },
    { id: 'p2', name: 'B', money: 1500, position: 0, isBankrupt: false, inJail: false, jailTurns: 0, color: 'blue', getOutOfJailCards: 0, tokenSkin: 'default' },
  ];
}
function giveGroup(s: any, group: string, ownerId: string) {
  for (const gt of getGroupTiles(group)) s.tiles.find((t: any) => t.id === gt.id).ownerId = ownerId;
}

describe('checkColorGroupWin', () => {
  it('đủ 3 nhóm màu → thắng', () => {
    const s = initializeGame('R', players());
    const three = PROPERTY_GROUPS.slice(0, 3);
    three.forEach((g) => giveGroup(s, g, 'p1'));
    const r = checkColorGroupWin(s);
    expect(r.gameOver).toBe(true);
    expect(r.winnerId).toBe('p1');
    expect(s.winnerId).toBe('p1');
  });
  it('mới 2 nhóm → chưa thắng', () => {
    const s = initializeGame('R', players());
    PROPERTY_GROUPS.slice(0, 2).forEach((g) => giveGroup(s, g, 'p1'));
    expect(checkColorGroupWin(s).gameOver).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy** `cd backend && npx vitest run src/game/engine/winGroups.test.ts` — FAIL.
- [ ] **Step 3:** Thêm vào `board.ts`:

```ts
import { GameState } from './types'; // nếu chưa có; tránh vòng import → nhận state: any nếu cần
export function countFullGroups(state: { tiles: { id: number; ownerId: string | null }[] }, playerId: string): number {
  return PROPERTY_GROUPS.filter((g) =>
    getGroupTiles(g).every((gt) => state.tiles.find((t) => t.id === gt.id)?.ownerId === playerId)
  ).length;
}
```

- [ ] **Step 4:** Tạo `winGroups.ts`:

```ts
import { GameState } from '../types';
import { countFullGroups } from '../board';

export function checkColorGroupWin(state: GameState): { gameOver: boolean; winnerId?: string } {
  for (const p of state.players) {
    if (p.isBankrupt) continue;
    if (countFullGroups(state, p.id) >= 3) {
      state.winnerId = p.id;
      state.logs.push(`[KẾT THÚC] ${p.name} chiến thắng nhờ sở hữu trọn 3 nhóm màu!`);
      return { gameOver: true, winnerId: p.id };
    }
  }
  return { gameOver: false };
}
```

- [ ] **Step 5: Chạy** test Step 2 — PASS.

---

### Task 4: Wiring `gameEngine.ts`

**Files:**
- Modify: `backend/src/game/gameEngine.ts`

**Interfaces:**
- Consumes: Task 1,2,3.
- Produces: `passBuy(state)`; `buyProperty` set `ownerVisits=1` + mở build modal + win check; `resolveTileLanding` own-tile +visit + build modal; bỏ facade auction/trade.

- [ ] **Step 1:** `initializeGame`: tile map thêm `ownerVisits: 0`; bỏ `auction: null`, `pendingTrades: []` trong return.
- [ ] **Step 2:** Bỏ import + hàm: `startAuctionModule/placeBidModule/passAuctionModule`, `declineBuyToAuction`, `auctionBid`, `auctionPass`, `proposeTrade*`/`respondTrade*`/`cancelTrade*` và `TradeOffer` import. (Toàn bộ khối "Đấu giá" và "Giao dịch" cuối file.)
- [ ] **Step 3:** `resolveTileLanding` nhánh `else if (tileState.ownerId === player.id)`: thay `clearModals(state)` bằng:

```ts
tileState.ownerVisits += 1;
if (tile.type === 'property') {
  state.currentActionRequired = 'none';
  state.activeModal = 'build_houses';
  state.modalPayload = { tileId: tile.id };
} else { clearModals(state); }
```

- [ ] **Step 4:** `buyProperty`: sau `tileState.ownerId = player.id;` thêm `tileState.ownerVisits = 1;`. Thay `clearModals(state)` bằng: nếu `tileMeta.type === 'property'` → mở `build_houses` modal (như Step 3, dùng `tileId`); ngược lại `clearModals`. Sau khi log mua, gọi:

```ts
import { checkColorGroupWin } from './engine/winGroups';
const win = checkColorGroupWin(state);
if (win.gameOver) clearModals(state);
```

- [ ] **Step 5:** Thêm hàm `passBuy`:

```ts
export function passBuy(state: GameState): { state: GameState; event: string } {
  const p = state.players[state.activePlayerIndex];
  clearModals(state);
  const event = `${p.name} quyết định không mua tài sản.`;
  state.logs.push(event);
  return { state, event };
}
```

- [ ] **Step 6:** Thêm hàm `finishBuild` (đóng modal xây):

```ts
export function finishBuild(state: GameState): { state: GameState; event: string } {
  clearModals(state);
  return { state, event: 'Kết thúc xây dựng.' };
}
```

- [ ] **Step 7:** `declareBankruptcy` (facade) — sau khi `bankruptcyModule(state)` chuyển đất cho chủ nợ, gọi `checkColorGroupWin(state)`; nếu `gameOver` → log winner & return. (Đặt trước phần `endTurnModule`.)
- [ ] **Step 8:** `endTurn` nhánh `buy_or_pass`: giữ clear + log (bỏ comment auction).
- [ ] **Step 9: Cổng:** `cd backend && npx tsc --noEmit` — gameEngine sạch (các lỗi còn lại thuộc index.ts/reconnect → Task 5).

---

### Task 5: Gỡ Trade/Auction backend (files, socket, reconnect)

**Files:**
- Delete: `backend/src/game/engine/trade.ts`, `backend/src/game/engine/auction.ts`, và test của chúng nếu có.
- Modify: `backend/src/index.ts`, `backend/src/realtime/events.ts`, `backend/src/realtime/reconnect.ts`

**Interfaces:**
- Consumes: `passBuy` (Task 4).

- [ ] **Step 1:** Xóa `engine/trade.ts`, `engine/auction.ts` và `engine/trade.test.ts`/`engine/auction.test.ts` nếu tồn tại.
- [ ] **Step 2:** `index.ts`: bỏ import `auctionBid, auctionPass, proposeTradeOffer, respondToTrade, cancelTradeOffer, declineBuyToAuction`; thêm import `passBuy, finishBuild`; bỏ import `TradeBundle`.
- [ ] **Step 3:** `index.ts`: xóa các handler `auction_bid`, `auction_pass`, `trade_propose`, `trade_respond`, `trade_cancel`. Đổi `decline_buy` → gọi `passBuy(room.gameState!)`. Thêm handler `finish_build` → `finishBuild`. (`build_house` giữ nguyên; engine tự kiểm vị trí.)
- [ ] **Step 4:** `realtime/events.ts`: bỏ hằng số sự kiện auction/trade nếu có.
- [ ] **Step 5:** `realtime/reconnect.ts`: trong `relinkPlayer` bỏ đoạn cập nhật `auction`/`pendingTrades`.
- [ ] **Step 6: Cổng:** `cd backend && npx tsc --noEmit` sạch; `npm test` xanh (đã xóa trade/auction test); server boot: `npm run dev` rồi tắt.

---

### Task 6: FE types + useSocket cleanup

**Files:**
- Modify: `frontend/src/types/game.ts`, `frontend/src/hooks/useSocket.ts`

- [ ] **Step 1:** `types/game.ts`: thêm `ownerVisits: number` vào TileState; bỏ Trade/Auction types, `auction`, `pendingTrades`; ModalType bỏ `'auction'`,`'trade'`, thêm `'build_houses'`.
- [ ] **Step 2:** `useSocket.ts`: bỏ `auctionBid, auctionPass, tradePropose, tradeRespond, tradeCancel` (định nghĩa + export); bỏ import `TradeBundle`; thêm `finishBuild = () => emit('finish_build')`. `declineBuy` giữ nguyên (server giờ chỉ đóng modal).
- [ ] **Step 3: Cổng:** `cd frontend && npx tsc -b` — kỳ vọng lỗi ở Board/PortfolioPanel (Task 7).

---

### Task 7: FE modals & components

**Files:**
- Delete: `frontend/src/components/modals/TradeModal.tsx`, `frontend/src/components/modals/AuctionModal.tsx`
- Create: `frontend/src/components/modals/BuildModal.tsx`
- Modify: `frontend/src/components/Board.tsx`, `frontend/src/components/hud/PortfolioPanel.tsx`

- [ ] **Step 1:** Xóa TradeModal.tsx, AuctionModal.tsx.
- [ ] **Step 2:** `Board.tsx`: bỏ import/render TradeModal & AuctionModal, banner đề nghị giao dịch, nút mở Trade. Thêm render `BuildModal` khi `gameState.activeModal === 'build_houses'` và là người chơi đang tới lượt.
- [ ] **Step 3:** Tạo `BuildModal.tsx`: nhận `tileId`, `gameState`, `onBuild(tileId)`, `onDone()`. Hiển thị tên ô, cấp hiện tại (số nhà/khách sạn), mức trần (4 nhà nếu `ownerVisits===1`, Khách Sạn nếu `>=2`), nút "Xây (+$housePrice)" gọi `buildHouse(tileId)` và nút "Xong" gọi `finishBuild()`. Lấy `housePrice` từ board metadata FE đang dùng.
- [ ] **Step 4:** `PortfolioPanel.tsx`: bỏ nút "Xây" (xây nay qua BuildModal). Giữ Bán/Cầm cố/Chuộc.
- [ ] **Step 5: Cổng:** `cd frontend && npx tsc -b` (exit 0) + `npx vite build` (exit 0).

---

### Task 8: FE useGameSelectors

**Files:**
- Modify: `frontend/src/hooks/useGameSelectors.ts`, `frontend/src/hooks/useGameSelectors.test.ts`

- [ ] **Step 1:** `useGameSelectors.ts`: `canBuild` (nếu còn dùng) đổi luật → true khi ô là property mình sở hữu, đang đứng trên ô, không cầm cố, chưa max, và (nếu lên khách sạn) `ownerVisits>=2`. Nếu selector không còn ai dùng sau Task 7 → xóa cùng test.
- [ ] **Step 2:** Cập nhật `useGameSelectors.test.ts` theo luật mới (bỏ case "cần trọn nhóm").
- [ ] **Step 3: Cổng:** `cd frontend && npx vitest run` xanh.

---

### Task 9: Docs

**Files:**
- Modify: `docs/RULES.md`, `docs/PROGRESS.md`

- [ ] **Step 1:** `RULES.md`: viết lại §7.4 (xây khi đáp ô: lần 1→tối đa 4 nhà; lần 2+→khách sạn; không cần trọn nhóm, không xây đều); §7.5 bỏ "bán đều"; xóa §8 (Đấu giá); xóa phần Trade trong §3/§9; §5.1 sửa "từ chối mua → ô giữ thuộc ngân hàng (không đấu giá)"; §10 nợ bank → đất trả về ngân hàng (không đấu giá); thêm mục "Thắng nhanh: sở hữu trọn 3 nhóm màu → thắng ngay".
- [ ] **Step 2:** `PROGRESS.md`: cập nhật "Quyết định đã chốt" (bỏ trade/auction, luật xây mới, thắng 3 nhóm) + mốc ngày 2026-06-23.
- [ ] **Step 3: Cổng:** đọc lại 2 file, đảm bảo không còn nhắc trade/auction như tính năng hiện hành.

---

## Self-Review
- **Spec coverage:** Bỏ trade (T5,T6,T7,T9) ✓; bỏ auction (T4,T5,T7,T9) ✓; xây-khi-đáp (T2,T4,T7) ✓; thắng 3 nhóm (T3,T4,T9) ✓; rent giữ nguyên (không có task sửa rent) ✓; model ownerVisits (T1,T4,T6) ✓.
- **Placeholder scan:** không có TBD; các bước có code/lệnh cụ thể.
- **Type consistency:** `ownerVisits`, `checkColorGroupWin`, `countFullGroups`, `passBuy`, `finishBuild`, modal `'build_houses'`, event `finish_build` dùng nhất quán giữa các task.
