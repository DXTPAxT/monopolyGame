# Spec: Sửa lỗi + thêm house-rules (2026-06-24)

> Nguồn: yêu cầu của user (4 mục). Brainstorm + duyệt 2026-06-24.

## Bối cảnh
Game Cờ Tỷ Phú 3D. 4 mục: 2 bug + 2 house-rule toggle. Engine theo TDD.

## A. 🐛 Mục 3 — Bắt buộc thua dù còn tài sản (ưu tiên cao)
**Gốc lỗi:** `setDebt` ([gameEngine.ts](../../backend/src/game/gameEngine.ts)) luôn đặt `currentActionRequired='bankruptcy_decision'` + mở modal phá sản che toàn màn hình (`InteractiveModal` modalType `bankruptcy`, không dismiss, chỉ có nút "Tuyên bố phá sản"). Modal che mất panel "Tài sản của tôi" nên người chơi không bán nhà/cầm cố được dù đủ khả năng trả → ép thua.

**Sửa:** `setDebt` dùng logic như `resolveDebt` ([bankruptcy.ts](../../backend/src/game/engine/bankruptcy.ts)):
- Nợ > tiền mặt **và** `liquidatableWorth ≥ nợ` → `currentActionRequired='must_raise_funds'`, **không** mở modal phá sản (đặt `activeModal=null`), giữ `pendingPayment`. Người chơi bán/cầm cố rồi bấm "Thanh toán nợ" (`settleFunds` → `settleDebt`).
- `liquidatableWorth < nợ` → `bankruptcy_decision` + modal phá sản như cũ (thật sự không cứu được).
- Áp dụng cho cả 3 nguồn nợ: tiền thuê (rent), thuế (tax), thẻ bài (card → 'other').

## B. 🐛 Mục 2 — Vào tù "vô cớ"
**Debug có hệ thống bằng test tái hiện trước khi sửa.** Giả thuyết: luật chuẩn "đổ đôi 3 lần liên tiếp → vào tù" cộng dồn `doublesCount` qua các lần tung lại trong cùng lượt; UI bắt bấm "Kết thúc lượt" giữa các lần đôi nên trông như nhiều lượt rời rạc → lần đôi thứ 3 trông vô cớ.

**Hướng sửa:**
- Thêm cảnh báo rõ ràng khi đổ đôi lần 2 ("⚠️ đổ đôi lần nữa sẽ vào tù").
- Test xác nhận `doublesCount` reset đúng khi chuyển lượt; chỉ 3 đôi trong **cùng một lượt** mới vào tù.
- Nếu test lộ bug state thật → sửa.

## C. ⚙️ Mục 1 — Toggle "Cho đi tiếp khi ra tù bằng đôi"
- Thêm `allowJailDoublesContinue: boolean` vào `HouseRules` (mặc định `false` = đúng luật chuẩn).
- `rollDiceAndMove` nhánh ở tù: `state.rolledDoubles = escapedByDouble && houseRules.allowJailDoublesContinue`. (`escapedByDouble` = freed && dice[0]===dice[1].)
- Toggle ở `GameLobby`. Cập nhật `docs/RULES.md` §4.

## D. ⚙️ Mục 4 — Toggle "Bán đứt sổ đỏ"
- Thêm `sellDeedOutright: boolean` vào `HouseRules` (mặc định `false`).
- Engine: hàm mới `sellDeed(state, tileId)`:
  - Active player phải sở hữu ô.
  - Hoàn = `floor(0.8 × (giá đất + giá trị công trình))`, với **giá trị công trình** = `hotel ? 5×housePrice : houses×housePrice`.
  - Đặt ô về ngân hàng: `ownerId=null, houses=0, hotel=false, mortgaged=false`. Không chuộc lại.
  - Socket handler mới `sell_deed`.
- Frontend: khi `sellDeedOutright` BẬT, `PortfolioPanel` **thay** nút Cầm cố/Chuộc bằng nút "Bán đứt". Khi TẮT → cầm cố/chuộc như cũ.
- `liquidatableWorth`: khi `sellDeedOutright` bật, giá trị thanh lý mỗi ô = 80% × (giá đất + công trình) thay vì 50% cầm cố + 50% nhà, để con số ở mục A nhất quán.
- Cập nhật `docs/RULES.md` §9.

## Phạm vi & quy ước
Backend engine (TDD) + socket + frontend (lobby, portfolio, modal) + RULES.md + test. Verify: BE `npm test` xanh + boot; FE `tsc -b` + `vite build` exit 0.
