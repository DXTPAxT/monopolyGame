# Spec Nâng Cấp — Cờ Tỷ Phú 3D

> Thiết kế nâng cấp **lối chơi (đủ chuẩn Monopoly)** + **UI/UX tái thiết kế** + **Hybrid 3D** + **cosmetic & house-rule mở rộng**.
> Ngày: 2026-06-22. Liên quan: [RULES.md](../RULES.md), [GAP-ANALYSIS.md](../GAP-ANALYSIS.md).
> Kế hoạch thực thi: [implementation-plan.md](./2026-06-22-implementation-plan.md).

---

## 1. Mục Tiêu & Phạm Vi

**Mục tiêu:**
1. Đạt **đủ luật Monopoly chuẩn** (trade, mortgage, auction, houses/hotels chuẩn, doubles, jail đầy đủ, bộ thẻ đầy đủ, phá sản đúng).
2. **Tái thiết kế UI/UX**: dễ đọc, dễ chơi, dễ nhìn, tương tác tốt, responsive.
3. **Hybrid 3D**: quân cờ, xúc xắc, nhà/khách sạn là 3D thật; bàn cờ 2.5D nghiêng; HUD là DOM.
4. **Sáng tạo**: skin token/board/dice chọn ở lobby; bộ thẻ chủ đề VN; game modes & house-rule toggles.

**Ngoài phạm vi (lần này):** AI bots, tài khoản/đăng nhập, lưu DB, bảng xếp hạng toàn cầu, asset 3D photoreal, camera bay tự do.

**Nguyên tắc thiết kế:**
- **Server là nguồn chân lý duy nhất** cho mọi state & ngẫu nhiên (xúc xắc, thẻ). Client chỉ render & animate.
- **Engine là hàm thuần, tách khỏi socket** → unit test được, agent yếu làm được.
- **Module nhỏ, biên giới rõ**: mỗi file một trách nhiệm; tránh file phình to.
- **Data-driven**: thẻ bài, board, skin, house-rule là dữ liệu, không hard-code rải rác.

---

## 2. Kiến Trúc Tổng Thể

```
backend/
  src/
    game/
      types.ts              # GameState, Player, Tile, RoomSettings, Card... (mở rộng)
      board.ts              # load + validate board.json, helpers tra cứu ô/nhóm
      cards/
        chance.ts           # data 16 thẻ Cơ Hội (VN) — data-driven
        community.ts        # data 16 thẻ Quỹ — data-driven
        cardEngine.ts       # áp dụng 1 thẻ lên state (theo CardEffect)
      engine/
        dice.ts             # tung, doubles, đếm chuỗi đôi
        movement.ts         # di chuyển, qua-GO, đáp ô
        rent.ts             # tính thuê (property/railroad/utility)
        build.ts            # xây/bán nhà, even-build, kho 32/12
        mortgage.ts         # cầm cố/chuộc
        auction.ts          # đấu giá
        trade.ts            # giao dịch người-người
        jail.ts             # vào/ra tù, lựa chọn
        bankruptcy.ts       # gom tiền, chuyển chủ nợ, kết thúc
        turn.ts             # vòng lượt, doubles-again, end turn
      gameEngine.ts         # facade: gọi các module engine (giữ API cũ tương thích)
      gameManager.ts        # phòng, người chơi, room settings (mở rộng)
    realtime/
      socketHandlers.ts     # tách handler ra khỏi index.ts
      events.ts             # hằng số tên event + payload types (chia sẻ FE/BE)
    index.ts                # bootstrap server
backend/test/               # unit test cho từng module engine (Vitest)

frontend/
  src/
    types/game.ts           # mirror types (hoặc import shared)
    data/                   # board, skins, card text (mirror)
    hooks/
      useSocket.ts          # mở rộng action mới
      useGameSelectors.ts   # derive: net worth, my properties, can-build...
    scene3d/                # react-three-fiber (Hybrid 3D)
      GameCanvas.tsx        # <Canvas> + camera nghiêng + lights
      Tokens3D.tsx          # quân cờ 3D theo skin, animation nhảy ô
      Buildings3D.tsx       # nhà/khách sạn 3D theo cấp
      Dice3D.tsx            # 2 xúc xắc physics, snap kết quả server
      tileMap.ts            # tileId -> tọa độ 3D (chia sẻ token/house)
    components/
      board/Board2D.tsx     # mặt bàn 2.5D nghiêng (DOM tiles)
      board/Cell.tsx        # 1 ô (đọc rõ, màu nhóm, owner, nhà)
      hud/TopBar.tsx
      hud/Leaderboard.tsx   # net worth + skin avatar + timer ring
      hud/PortfolioPanel.tsx# "tài sản của tôi"
      hud/ActionDock.tsx    # khu nút hành động chính (đổ xúc xắc/end turn/build...)
      hud/LogPanel.tsx
      hud/ChatPanel.tsx
      modals/BuyModal.tsx
      modals/AuctionModal.tsx
      modals/TradeModal.tsx
      modals/MortgageModal.tsx
      modals/CardModal.tsx
      modals/JailModal.tsx
      modals/BankruptcyModal.tsx
      modals/WinnerModal.tsx
      lobby/Lobby.tsx
      lobby/SkinPicker.tsx  # chọn token/board/dice skin
      lobby/RoomSettings.tsx# game mode + house rules toggles
    ui/                     # primitives: Button, Card, Toast, Modal shell, Money
    theme/                  # design tokens (màu, spacing, type scale, skins)
```

**Quyết định kiến trúc chính:**
- **Hybrid 3D = 2 lớp đồng bộ**: (1) `Board2D` DOM nghiêng bằng CSS `transform: rotateX()` chứa tile (chữ/giá/màu — rõ nét); (2) `GameCanvas` (R3F) trong suốt phủ lên, dùng **cùng một `tileMap`** để đặt token/nhà/xúc xắc 3D đúng vị trí ô. Camera R3F set khớp góc nghiêng của board. *(Lý do: giữ chữ DOM sắc nét & dễ i18n, vẫn có vật thể 3D thật.)*
- Nếu thiết bị yếu / `prefers-reduced-motion`: **fallback** token & nhà về sprite 2.5D, dice về CSS tumble. Một cờ `render3d` điều khiển.

---

## 3. Mô Hình Dữ Liệu (mở rộng)

```ts
type GroupId = 'brown'|'light_blue'|'pink'|'orange'|'red'|'yellow'|'green'|'dark_blue';

interface Player {
  id; name; color;
  money: number;
  position: number;
  inJail: boolean; jailTurns: number;
  isBankrupt: boolean;
  getOutOfJailCards: number;     // số thẻ ra tù đang giữ
  tokenSkin: string;             // id skin quân cờ
}

interface TileState {
  id: number;
  ownerId: string | null;
  houses: number;                // 0..4
  hotel: boolean;                // true = khách sạn (thay 4 nhà)
  mortgaged: boolean;
}

interface RoomSettings {
  startingMoney: number;         // mặc định 1500
  gameMode: 'classic'|'fast'|'chaos';
  houseRules: {
    freeParkingJackpot: boolean;
    doubleGo: boolean;
    turnTimerSec: number | null; // null = tắt
  };
  boardSkin: string;             // 'neon'|'classic'|'tet'
  diceSkin: string;              // 'neon'|'jade'|'wood'
}

interface CardEffect {           // data-driven, áp dụng bởi cardEngine
  kind: 'money'|'moneyPerPlayer'|'moveTo'|'moveBy'|'goToJail'
      | 'getOutOfJail'|'repairs'|'advanceToGo'|'nearest';
  amount?: number;               // money / per house / per hotel...
  perHotel?: number;
  target?: number;               // tile id cho moveTo
  nearest?: 'railroad'|'utility';
  collectFromBank?: boolean;
}
interface Card { id: string; text: string; effect: CardEffect; }

interface AuctionState {
  tileId: number; highestBid: number; highestBidderId: string|null;
  activeBidders: string[]; currentBidderId: string;
}
interface TradeOffer {
  id; fromId; toId;
  give: { money: number; tileIds: number[]; jailCards: number };
  receive: { money: number; tileIds: number[]; jailCards: number };
  status: 'pending'|'accepted'|'declined'|'cancelled';
}

interface GameState {
  /* ...như cũ... */
  freeParkingPot: number;
  auction: AuctionState | null;
  pendingTrades: TradeOffer[];
  settings: RoomSettings;
  rolledDoubles: boolean;        // lần tung hiện tại là đôi?
  doublesCount: number;          // chuỗi đôi trong lượt
  turnDeadline: number | null;   // epoch ms nếu bật timer
}
```

`currentActionRequired` mở rộng thêm: `'auction'`, `'jail_options'`, `'must_raise_funds'`.

---

## 4. Thiết Kế Lối Chơi (chi tiết theo RULES.md)

Áp dụng đầy đủ [RULES.md](../RULES.md). Các điểm thực thi quan trọng:

- **Doubles (§4):** `turn.ts` quản lý `doublesCount`. Sau giải quyết ô, nếu đôi & chưa vào tù & chưa phá sản → cho tung lại (không auto end turn). Lần đôi thứ 3 → vào tù ngay.
- **Qua GO (§5.6):** `movement.ts` tính qua-GO bằng so sánh quãng đường thực (kể cả thẻ moveTo/moveBy), không dùng so sánh vị trí thô.
- **Build (§7.4):** `build.ts` cho xây bất kỳ lúc nào trong lượt; kiểm tra trọn nhóm, không cầm cố, even-build, kho 32/12; 4 nhà→KS trả 4 nhà về kho.
- **Mortgage (§9):** chỉ khi nhóm không còn nhà; chuộc +10%.
- **Auction (§8):** vòng đấu giá đồng bộ qua socket; mọi người chưa phá sản tham gia; không vượt tiền mặt.
- **Jail (§6):** đầu lượt mở `jail_options` (trả $50 / dùng thẻ / tung tìm đôi). Ép sau 3 lượt.
- **Bankruptcy (§10):** `bankruptcy.ts` cho gom tiền (bán/cầm cố) qua trạng thái `must_raise_funds`; nếu vẫn thiếu → phá sản, chuyển tài sản cho chủ nợ (hoặc đấu giá nếu nợ bank).
- **Cards (§11):** `cardEngine.ts` áp dụng `CardEffect`. Thẻ là data thuần trong `cards/chance.ts` & `cards/community.ts` (bản VN).
- **House rules (§12):** `RoomSettings.houseRules` rẽ nhánh ở tax/parking/GO/timer.

---

## 5. Hệ Thống Thiết Kế UI (Design System)

**Typography (sửa lỗi #1 — readability):**
- Cỡ chữ tối thiểu trong HUD: **12px**; nhãn phụ 11px; tiêu đề 14–20px; số tiền dùng font mono đậm.
- Trên tile bàn cờ: tên ô ≥ 10px (board lớn), giá ≥ 11px, tương phản đạt WCAG AA.

**Màu & Theme:**
- Token màu thiết kế trong `theme/`. 3 board skin (`neon`/`classic`/`tet`) = 3 bộ biến CSS + vật liệu 3D.
- Giữ hiệu ứng "monopoly glow" cho nhóm sở hữu trọn.

**Layout (desktop ≥1024px):**
```
┌────────────────────────────────────────── TopBar (logo · phòng · mode · âm thanh) ──┐
│  ┌── Leaderboard (net worth, timer ring) ──┐  ┌──────────── BÀN CỜ 2.5D + 3D ─────────┐ │
│  │  P1  $… TS…                              │  │   (Board2D nghiêng + GameCanvas 3D)   │ │
│  │  P2  …                                   │  │                                       │ │
│  └──────────────────────────────────────────┘  │      ActionDock ở dưới bàn cờ         │ │
│  ┌── PortfolioPanel "Tài sản của tôi" ──────┐  └───────────────────────────────────────┘ │
│  │  đất · nhà · thuê · cầm cố · nút quản lý  │  ┌── LogPanel ──┐ ┌── ChatPanel ──┐        │
│  └──────────────────────────────────────────┘  └──────────────┘ └───────────────┘        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Bàn cờ là tâm điểm** (lớn nhất). HUD bên trái gọn, có thể thu gọn.
- **ActionDock**: khu nút chính rõ ràng ngay dưới bàn cờ (không nhét vào tâm bàn nữa). Modal mở overlay giữa màn hình, đủ lớn.

**Layout (mobile <768px):** xếp dọc — bàn cờ trên (fallback 2.5D nếu yếu), HUD dạng tab dưới (Tài sản / BXH / Log / Chat), ActionDock cố định đáy.

**Phản hồi & cảm giác (game feel):**
- Toast biến động tiền (+$200 xanh / −$50 đỏ) nổi cạnh avatar.
- Timer ring quanh avatar người đang đi.
- SFX: tung xúc xắc, bước đi, mua, tiền, vào tù, thắng — có nút bật/tắt + nhạc nền tùy chọn.
- Trạng thái rõ: chờ đối thủ, lượt của bạn, đang đấu giá, đang giao dịch.

---

## 6. Hybrid 3D — Chi Tiết

**Thư viện:** `three`, `@react-three/fiber`, `@react-three/drei`, và `@react-three/rapier` (hoặc `cannon-es`) cho dice physics.

**Scene (`GameCanvas`):**
- Camera phối cảnh nghiêng cố định (góc ~50–60°), subtle parallax theo chuột, **không** orbit tự do mặc định.
- Ánh sáng: 1 directional (đổ bóng mềm) + ambient; tông theo board skin.
- Mặt phẳng bàn để DOM lo; canvas chỉ vẽ vật thể nổi (token, nhà, dice) → nền trong suốt (`alpha`).

**`tileMap.ts`:** hàm `tileWorldPosition(tileId): [x,y,z]` dùng chung. Phải khớp với layout `Board2D` (cùng tỉ lệ ô). Đây là điểm tích hợp then chốt — test bằng mắt + ảnh chụp.

**Tokens3D:** 8 skin low-poly (primitives/stylized hoặc GLTF nhẹ): xe máy, ô tô, rồng, nón, tô phở, dừa, hổ, phi thuyền. Animation **nhảy ô từng bước** đồng bộ với log/state (giữ cảm giác bước đi hiện có). Nhiều người trên 1 ô → offset.

**Buildings3D:** mesh hộp/extrude theo cấp 1–4 nhà (xanh) + khách sạn (đỏ) đặt theo viền ô. Stack gọn.

**Dice3D (quan trọng — công bằng):**
- Server quyết định `[d1,d2]`. Client **animate dice rơi rồi snap về đúng mặt** kết quả (đặt quaternion đích theo giá trị), physics chỉ để đẹp. Không để client tự sinh số.
- Dice skin = đổi material/texture.

**Hiệu năng & fallback:** giới hạn DPR, instanced mesh cho nhà, tắt bóng trên mobile; cờ `render3d=false` → toàn bộ về 2.5D CSS (token/nhà sprite, dice CSS). `prefers-reduced-motion` tôn trọng.

---

## 7. Realtime — Event Mới

Bổ sung (payload định nghĩa trong `realtime/events.ts`, dùng chung FE/BE):

- `update_room_settings` (host): mode, house rules, board/dice skin.
- `select_skin`: người chơi chọn token/skin trong lobby.
- `build_house` / `sell_house` (đã có build, thêm sell).
- `mortgage_tile` / `unmortgage_tile`.
- `decline_buy` → mở `auction`.
- `auction_bid` / `auction_pass`.
- `trade_propose` / `trade_respond` (accept/decline) / `trade_cancel`.
- `jail_action` (`pay`|`use_card`|`roll`).
- `raise_funds_done` (kết thúc gom tiền → tiếp tục thanh toán hoặc phá sản).
- `roll_dice` mở rộng: trả doubles & cho tung lại.
- Server phát `turn_timeout` → auto pass khi bật timer.
- **Reconnect:** client lưu `playerToken` (localStorage); `rejoin` trong grace period thay vì auto phá sản.

Mọi event phải **validate phía server** (đúng người, đúng pha, đủ tiền/điều kiện).

---

## 8. Kiểm Thử (Testing)

- **Engine: TDD bắt buộc.** Mỗi module (`dice`, `rent`, `build`, `mortgage`, `auction`, `trade`, `jail`, `bankruptcy`, `cardEngine`, `movement`) có bộ unit test Vitest, phủ các nhánh trong RULES.md. Đây là phần giao cho **Sonnet/Haiku** an toàn nhất (contract + test rõ).
- **Integration:** mô phỏng vài lượt qua facade `gameEngine`.
- **UI:** kiểm thử thủ công theo checklist + ảnh chụp; component thuần test có chọn lọc.
- **3D:** kiểm thử bằng mắt + ảnh chụp các mốc (token đúng ô, nhà đúng cấp, dice snap đúng số).

---

## 9. Bàn Giao Theo Workstream

| WS | Tên | Phụ thuộc | Agent chủ đạo |
|---|---|---|---|
| WS-0 | Foundations (types, board, test harness, design tokens) | — | Sonnet |
| WS-1 | Engine parity (10 module + cards) | WS-0 | Sonnet/Haiku (TDD) |
| WS-2 | Realtime + room settings + reconnect + timer | WS-1 | Sonnet |
| WS-3A | HUD/DOM redesign (layout, portfolio, dock, modals, lobby, skins) | WS-0, một phần WS-2 | Sonnet/Haiku |
| WS-3B | Hybrid 3D scene (canvas, tokens, buildings, dice) | WS-0, tileMap | **Opus** |
| WS-4 | Polish (SFX, toasts, winner, responsive, a11y, perf/fallback) | WS-3A/3B | Sonnet |

Chi tiết task & phân vai trong [implementation-plan.md](./2026-06-22-implementation-plan.md).

---

## 10. Rủi Ro & Giảm Thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Lệch tọa độ giữa Board2D & 3D canvas | `tileMap` dùng chung; chốt sớm bằng ảnh chụp; có chế độ debug grid |
| 3D nặng/mobile lag | DPR cap, instancing, tắt bóng, fallback 2.5D theo cờ `render3d` |
| Dice client gian lận | Server quyết số, client chỉ snap-animate |
| Trade/auction phức tạp, dễ kẹt state | Máy trạng thái rõ ràng, timeout, validate chặt; ship sau cùng trong WS-1 |
| Refactor lớn phá vỡ game đang chạy | Giữ facade `gameEngine` tương thích; thay từng module sau khi test xanh |
| Agent yếu hiểu sai luật | Mỗi task kèm trích RULES.md + test viết trước (contract) |
```
