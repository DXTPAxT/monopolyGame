# Kế Hoạch Triển Khai — Cờ Tỷ Phú 3D

> Chia nhỏ công việc thành task có **hợp đồng (contract) rõ ràng**, gắn **agent đề xuất** (Haiku/Sonnet/Opus), input/output, tiêu chí nghiệm thu (acceptance) và phụ thuộc.
> Liên quan: [RULES.md](../RULES.md) · [GAP-ANALYSIS.md](../GAP-ANALYSIS.md) · [upgrade-design.md](./2026-06-22-upgrade-design.md).

## Cách Đọc / Quy Ước

- **Agent đề xuất:** 🟢 Haiku (việc cơ học, contract cực rõ) · 🔵 Sonnet (logic vừa, nhiều nhánh) · 🟣 Opus (3D, kiến trúc khó, mơ hồ).
- **Mọi task engine theo TDD:** viết test trước (test do task định nghĩa), code sau, test xanh mới xong.
- **Definition of Done (DoD) chung:** code biên dịch (tsc), test xanh, không phá facade cũ, có ví dụ dùng, tên/biến khớp RULES.md.
- **Quy tắc giao cho agent yếu:** mỗi task đính kèm (1) trích đúng mục RULES.md, (2) chữ ký hàm cố định, (3) danh sách test bắt buộc. Agent **không** được tự đổi chữ ký công khai.

---

## WS-0 — Foundations  *(làm trước tiên, chặn các WS khác)*

### T0.1 — Thiết lập test harness (Vitest) cho backend 🟢
- **Input:** repo `backend/`.
- **Việc:** thêm `vitest`, script `npm test`, thư mục `backend/test/`, 1 test mẫu chạy được.
- **Output:** `npm test` chạy xanh với 1 test giả.
- **DoD:** CI cục bộ chạy `npm test` ok.
- **Phụ thuộc:** —

### T0.2 — Mở rộng & tách `types.ts` 🔵
- **Việc:** cập nhật model theo spec §3 (Player thêm `getOutOfJailCards`, `tokenSkin`; TileState thêm `hotel`, `mortgaged`; thêm `RoomSettings`, `Card`/`CardEffect`, `AuctionState`, `TradeOffer`; GameState thêm `freeParkingPot`, `auction`, `pendingTrades`, `settings`, `rolledDoubles`, `doublesCount`, `turnDeadline`).
- **Output:** `types.ts` mới, biên dịch sạch; giá trị mặc định khởi tạo trong `initializeGame`.
- **DoD:** tsc sạch; không sửa logic.
- **Phụ thuộc:** —

### T0.3 — `board.ts`: loader + validator + helpers 🔵
- **Việc:** hàm `getTile(id)`, `getGroupTiles(group)`, `getGroupOf(id)`, `isProperty/railroad/utility`, và `validateBoard()` (đủ 40 ô, đủ nhóm, rent hợp lệ). Sửa chú thích nhóm `brown` (ô 1 & 3) theo RULES §2.
- **Test bắt buộc:** validateBoard pass với board.json hiện tại; getGroupTiles('orange') trả 3 ô đúng.
- **Phụ thuộc:** T0.2

### T0.4 — Design tokens & theme scaffolding (frontend) 🔵
- **Việc:** `frontend/src/theme/` — type scale (min 12px HUD), bảng màu, 3 board skin (biến CSS), token màu người chơi. Tailwind config map sang tokens.
- **Output:** file tokens + ví dụ dùng; chưa đổi component.
- **Phụ thuộc:** —

### T0.5 — `realtime/events.ts`: hằng số & payload type dùng chung 🟢
- **Việc:** liệt kê mọi event (cũ + mới ở spec §7) thành hằng số + interface payload. Chưa nối handler.
- **Phụ thuộc:** T0.2

---

## WS-1 — Engine Parity  *(TDD, lý tưởng cho Haiku/Sonnet)*

> Mỗi module là **hàm thuần** nhận `state` (+ tham số) trả `{state, events}`. Không đụng socket.

### T1.1 — `engine/dice.ts` 🟢
- **Hàm:** `rollDice(): [number,number]`, `isDoubles(d)`, `applyDoubles(state)`.
- **Luật:** RULES §4. Đếm `doublesCount`; 3 đôi → đánh dấu đi tù.
- **Test:** isDoubles đúng; chuỗi 3 đôi set cờ vào tù; đôi thường set `rolledDoubles`.
- **Phụ thuộc:** T0.2

### T1.2 — `engine/movement.ts` 🔵
- **Hàm:** `moveBy(state, player, steps)`, `moveTo(state, player, tileId, {grantGo})`, tính qua-GO chuẩn.
- **Luật:** RULES §3, §5.6, §5.7. Qua-GO +$200 cho **mọi** nguồn di chuyển; moveTo qua GO nhận $200 trừ khi cấm.
- **Test:** đi vòng qua 0 nhận $200; moveTo lùi không nhận; moveTo vượt 0 nhận.
- **Phụ thuộc:** T0.3

### T1.3 — `engine/rent.ts` 🔵
- **Hàm:** `calcRent(state, tileId, diceTotal)`.
- **Luật:** RULES §7.1–7.3. Sửa map nhà 1–4 = `rent[1..4]`, KS = `rent[5]`; ×2 khi trọn nhóm chưa nhà; đất cầm cố thuê = 0; railroad theo số ga; utility 4×/10×.
- **Test:** từng nhánh property/railroad/utility; trọn nhóm ×2; cầm cố =0; 4 nhà vs KS.
- **Phụ thuộc:** T0.3, T0.2

### T1.4 — `engine/build.ts` 🔵
- **Hàm:** `buildHouse(state, tileId)`, `sellHouse(state, tileId)`, helper `houseInventory(state)`.
- **Luật:** RULES §7.4–7.5. Trọn nhóm, không cầm cố, even-build, kho 32/12, 4 nhà→KS (trả 4 nhà về kho), bán nửa giá đều.
- **Test:** chặn khi chưa trọn nhóm; even-build; hết kho nhà; lên KS trả nhà; bán đều & nửa giá.
- **Phụ thuộc:** T0.3

### T1.5 — `engine/mortgage.ts` 🟢
- **Hàm:** `mortgage(state, tileId)`, `unmortgage(state, tileId)`.
- **Luật:** RULES §9. Cầm cố 50% giá, chuộc +10%; cấm cầm cố khi nhóm còn nhà.
- **Test:** số tiền đúng; cấm khi còn nhà; chuộc tính 10%.
- **Phụ thuộc:** T0.3

### T1.6 — `engine/jail.ts` 🔵
- **Hàm:** `goToJail(state, player)`, `jailAction(state, action)` với action `pay|use_card|roll`.
- **Luật:** RULES §6. Trả $50 / dùng thẻ / tung tìm đôi; ép sau 3 lượt; ra bằng đôi không tung lại.
- **Test:** 3 lựa chọn; ép lượt 3; hết thẻ thì không dùng được.
- **Phụ thuộc:** T1.1, T1.2

### T1.7 — `cards/cardEngine.ts` + data VN 🔵 (data: 🟢)
- **Hàm:** `applyCard(state, player, card)` xử lý mọi `CardEffect.kind` (RULES §11).
- **Data:** `cards/chance.ts`, `cards/community.ts` — ~16 thẻ/bộ, chủ đề VN, map sang `CardEffect` (data thuần — giao Haiku viết text/data sau khi engine xong).
- **Test:** mỗi `kind` (money, moneyPerPlayer, moveTo, moveBy, nearest, repairs, goToJail, getOutOfJail, advanceToGo).
- **Phụ thuộc:** T1.2, T1.3

### T1.8 — `engine/auction.ts` 🔵
- **Hàm:** `startAuction(state, tileId)`, `placeBid(state, playerId, amount)`, `passAuction(state, playerId)`, kết thúc → gán chủ.
- **Luật:** RULES §8. Mọi người chưa phá sản; không vượt tiền mặt; còn 1 người → thắng.
- **Test:** trả giá tăng; pass loại khỏi vòng; chốt đúng người & trừ tiền; không ai trả → vẫn của bank.
- **Phụ thuộc:** T0.3

### T1.9 — `engine/bankruptcy.ts` 🔵
- **Hàm:** `enterRaiseFunds(state, debt)`, `resolvePayment(state)`, `declareBankruptcy(state)`.
- **Luật:** RULES §10. Cho gom tiền (bán/cầm cố) trước; chuyển tài sản cho chủ nợ; nợ bank → đấu giá; kiểm tra kết thúc game.
- **Test:** gom đủ tiền thì không phá sản; chuyển tài sản cho chủ nợ kèm cầm cố; nợ bank đấu giá; còn 1 người → winner.
- **Phụ thuộc:** T1.4, T1.5, T1.8

### T1.10 — `engine/trade.ts` 🔵
- **Hàm:** `proposeTrade(state, offer)`, `respondTrade(state, id, accept)`, `cancelTrade`.
- **Luật:** RULES §9 (cầm cố khi chuyển), §1. Trao đất+tiền+thẻ ra tù; cấm chuyển đất còn nhà; xử lý phí cầm cố.
- **Test:** trao hợp lệ đổi chủ & tiền; chặn khi đất còn nhà; từ chối không đổi gì.
- **Phụ thuộc:** T1.5

### T1.11 — `engine/turn.ts` + facade `gameEngine.ts` 🔵
- **Việc:** `endTurn` (doubles-again, bỏ qua người phá sản, đặt `turnDeadline` nếu bật timer); facade `gameEngine.ts` export API tương thích, route sang module mới.
- **Luật:** RULES §3, §4.
- **Test:** đôi → cùng người tung lại; không đôi → người kế; timer set deadline.
- **Phụ thuộc:** T1.1–T1.10

### T1.12 — Tích hợp `resolveTileLanding` mới 🔵
- **Việc:** thay `resolveTileLanding` cũ dùng các module mới (rent/auction/cards/tax/jail/parking + jackpot toggle).
- **Test integration:** chuỗi vài lượt mô phỏng end-to-end qua facade.
- **Phụ thuộc:** T1.2–T1.8, T1.11

---

## WS-2 — Realtime, Room Settings, Reconnect, Timer

### T2.1 — Tách `socketHandlers.ts` khỏi `index.ts` 🔵
- **Việc:** chuyển handler hiện có sang `realtime/socketHandlers.ts`, dùng `events.ts`. Không đổi hành vi.
- **Phụ thuộc:** T0.5

### T2.2 — Room settings + lobby config 🔵
- **Việc:** `update_room_settings`, `select_skin`; lưu vào `RoomSettings`; `initializeGame` đọc settings (startingMoney/mode/houseRules/skins).
- **Phụ thuộc:** T2.1, T1.11

### T2.3 — Handlers cho action mới 🔵
- **Việc:** nối `build/sell/mortgage/unmortgage/decline_buy→auction/auction_bid/auction_pass/trade_*/jail_action/raise_funds_done` tới engine; **validate server** (đúng người/pha/điều kiện).
- **Phụ thuộc:** WS-1, T2.1

### T2.4 — Turn timer server-side 🔵
- **Việc:** khi bật, đặt timeout theo `turnDeadline`; hết giờ → auto roll/pass; phát `turn_timeout`.
- **Phụ thuộc:** T1.11, T2.1

### T2.5 — Reconnect 🟣
- **Việc:** cấp `playerToken` khi tạo/vào phòng; lưu localStorage; `rejoin` map token→player trong grace period thay vì auto phá sản; nếu hết hạn mới phá sản.
- **Phụ thuộc:** T2.1

---

## WS-3A — HUD / DOM Redesign  *(Sonnet/Haiku, theo design system)*

### T3A.1 — UI primitives 🟢
- **Việc:** `ui/` — `Button`, `Modal` shell, `Toast`, `Card`, `Money` (định dạng $), `Stat`. Dùng design tokens T0.4.
- **Phụ thuộc:** T0.4

### T3A.2 — `useGameSelectors.ts` 🔵
- **Việc:** derive `netWorth(player)`, `myProperties`, `canBuild(tileId)`, `rentPreview`, `groupOwnership`. Thuần, test được.
- **Test:** net worth = tiền + giá đất (½ nếu cầm cố) + giá nhà.
- **Phụ thuộc:** T0.2

### T3A.3 — Layout khung + TopBar 🔵
- **Việc:** `App.tsx` layout mới (spec §5), `hud/TopBar.tsx` (logo/phòng/mode/âm thanh). Responsive grid.
- **Phụ thuộc:** T3A.1

### T3A.4 — Leaderboard (net worth + timer ring) 🟢
- **Phụ thuộc:** T3A.1, T3A.2

### T3A.5 — PortfolioPanel "Tài sản của tôi" 🔵
- **Việc:** liệt kê đất theo nhóm, nhà/cấp, thuê hiện tại, trạng thái cầm cố; nút Build/Sell/Mortgage mở modal.
- **Phụ thuộc:** T3A.2

### T3A.6 — ActionDock 🔵
- **Việc:** khu nút chính theo `currentActionRequired` (đổ xúc xắc / kết thúc / build / jail options...). Thay bottom-sheet cũ.
- **Phụ thuộc:** T3A.1

### T3A.7 — Board2D 2.5D + Cell 🔵
- **Việc:** bàn cờ DOM nghiêng (CSS perspective), `Cell` rõ ràng (tên/giá ≥ ngưỡng, màu nhóm, owner, badge nhà/cầm cố). Xuất `tileMap` layout để 3D dùng chung.
- **Phụ thuộc:** T0.4

### T3A.8 — Modals: Buy / Card / Jail / Bankruptcy 🟢
- **Việc:** 4 modal đơn giản dùng shell T3A.1, hiển thị đẹp & rõ.
- **Phụ thuộc:** T3A.1

### T3A.9 — Modal: Mortgage 🔵 · T3A.10 — Modal: Auction 🔵 · T3A.11 — Modal: Trade 🟣
- **Việc:** UI cho 3 cơ chế mới; Trade phức tạp nhất (chọn đất/tiền/thẻ hai phía, preview).
- **Phụ thuộc:** WS-2 handlers, T3A.1

### T3A.12 — Lobby + SkinPicker + RoomSettings 🔵
- **Việc:** lobby mới: chọn token/board/dice skin (no-dup token), host chỉnh mode + house rules.
- **Phụ thuộc:** T3A.1, T2.2

---

## WS-3B — Hybrid 3D Scene  *(Opus chủ đạo)*

### T3B.1 — Cài đặt R3F + `GameCanvas` khung 🟣
- **Việc:** thêm `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`; `<Canvas>` trong suốt, camera nghiêng, lights, cờ `render3d`.
- **Phụ thuộc:** —

### T3B.2 — `tileMap.ts` 3D ↔ khớp Board2D 🟣
- **Việc:** `tileWorldPosition(tileId)` khớp layout T3A.7; chế độ debug grid để canh.
- **Acceptance:** ảnh chụp token nằm đúng tâm ô mọi vị trí.
- **Phụ thuộc:** T3A.7

### T3B.3 — Tokens3D + animation bước đi 🟣
- **Việc:** 8 skin low-poly; nhảy ô từng bước đồng bộ state; offset khi nhiều người 1 ô.
- **Phụ thuộc:** T3B.1, T3B.2

### T3B.4 — Buildings3D 🔵 (sau khi T3B.1/2 xong)
- **Việc:** mesh nhà (1–4) + khách sạn theo cấp, instanced; đặt theo viền ô.
- **Phụ thuộc:** T3B.2

### T3B.5 — Dice3D physics + snap kết quả server 🟣
- **Việc:** 2 xúc xắc rapier; **snap về đúng `[d1,d2]` từ server**; dice skin material.
- **Acceptance:** mặt trên cùng khớp số server qua nhiều lần.
- **Phụ thuộc:** T3B.1

### T3B.6 — Fallback 2.5D 🔵
- **Việc:** khi `render3d=false`/`reduced-motion`/mobile yếu → token & nhà sprite, dice CSS tumble.
- **Phụ thuộc:** T3A.7, T3B.3

---

## WS-4 — Polish

### T4.1 — Hệ thống SFX + nhạc nền + toggle 🟢 · T4.2 — Toast biến động tiền 🟢
### T4.3 — WinnerModal + thống kê ván 🔵 · T4.4 — Responsive/mobile pass 🔵
### T4.5 — A11y (tương phản, aria, keyboard) 🔵 · T4.6 — Perf pass 3D (DPR/instancing/shadow) 🟣
- **Phụ thuộc:** WS-3A/3B tương ứng.

---

## Thứ Tự Thực Thi Đề Xuất (sprints)

1. **Sprint 1 — Nền tảng & lõi luật:** WS-0 → T1.1–T1.5, T1.11 (facade tối thiểu). Mục tiêu: engine chuẩn cho di chuyển/thuê/build/mortgage có test xanh.
2. **Sprint 2 — Đủ luật:** T1.6–T1.10, T1.12 (jail, cards, auction, bankruptcy, trade) + WS-2 handlers.
3. **Sprint 3 — UI mới (DOM):** WS-3A (layout, portfolio, dock, modals, lobby/skins) nối realtime.
4. **Sprint 4 — Hybrid 3D:** WS-3B (canvas, tokens, dice, buildings) + fallback.
5. **Sprint 5 — Polish:** WS-4 (SFX, toasts, winner, responsive, a11y, perf) + reconnect T2.5.

**Song song được:** WS-3A có thể chạy song song WS-1/WS-2 (dùng mock state) — xem [dispatching-parallel-agents]. WS-3B phụ thuộc tileMap từ T3A.7 nên bắt đầu sau khi Board2D có layout.

## Cổng Chất Lượng Mỗi Sprint
- Engine: `npm test` xanh, phủ nhánh RULES.
- UI: chạy app, ảnh chụp các màn chính, không lỗi console.
- Trước khi gộp: [requesting-code-review] + [verification-before-completion].
