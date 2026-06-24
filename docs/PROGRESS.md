# TIẾP NỐI DỰ ÁN — Cờ Tỷ Phú 3D (Handoff)

> **Đọc file này đầu tiên khi mở session mới để tiếp tục.**
> Cập nhật: 2026-06-23.

## Cách tiếp tục ở session mới
Mở Claude Code trong thư mục dự án và nói đại ý:
> "Đọc `docs/PROGRESS.md` và các file trong `docs/specs/` để nắm trạng thái, rồi tiếp tục theo plan. Tiếp phần [X]."

Trong đó [X] là mục bạn muốn làm tiếp (xem "VIỆC TIẾP THEO" bên dưới).

## Tài liệu nguồn (đọc theo thứ tự)
1. `docs/PROGRESS.md` (file này) — trạng thái & việc tiếp theo.
2. `docs/RULES.md` — luật chuẩn (engine phải khớp).
3. `docs/GAP-ANALYSIS.md` — đối chiếu hiện trạng vs luật.
4. `docs/specs/2026-06-22-upgrade-design.md` — spec kiến trúc UI/UX + hybrid 3D.
5. `docs/specs/2026-06-22-implementation-plan.md` — plan chi tiết, chia task + agent đề xuất (🟢Haiku/🔵Sonnet/🟣Opus).

## Quyết định đã chốt
- Lối chơi: **Cờ Tỷ Phú đơn giản** (mortgage, 4 nhà→KS, doubles, jail đầy đủ, thẻ đầy đủ, phá sản chuyển chủ nợ). **Bỏ Trade & Auction, xây khi đáp, thắng nhanh: 3 nhóm màu / trọn 1 cạnh / cả 4 nhà ga.**
- UI: **tái thiết kế lớn**; **Hybrid 3D** (xúc xắc/quân/nhà 3D, bàn 2.5D, HUD là DOM).
- Cosmetic: token skins (8 quân), board/dice skins, nhà có icon bậc.
- House-rule toggles: game mode (classic/fast/chaos), Free Parking jackpot, Double GO, turn timer.
- GO về chuẩn $200 (Double GO là toggle). Khởi điểm $1500. Kho 32 nhà/12 KS.
- Quy trình: **TDD cho engine**; subagent làm module độc lập, mình review + chạy test (cổng chất lượng); phần tích hợp tự làm + chạy thử.

## ĐÃ XONG & VERIFY
### Backend (`backend/`) — `npm test` = **175 test xanh**, `tsc` sạch, server boot OK
- Engine thuần (có test): `engine/dice, movement, rent, build, mortgage, jail, bankruptcy, turn` + `cards/cardEngine` + data `cards/chance.ts, community.ts` (32 thẻ VN). (Đã bỏ auction, trade kể từ 2026-06-23.)
- `board.ts` (loader+validator), `types.ts` (mô hình mới).
- Facade `gameEngine.ts` đã dùng module mới (doubles tung lại, thuê chuẩn, tù, thẻ, jackpot, phá sản chủ nợ).
- Socket (`index.ts`): handlers mới `sell_house/mortgage_tile/unmortgage_tile/jail_action/settle_funds/decline_buy/update_room_settings/select_skin` + game-mode presets + phát `playerToken`. (Đã bỏ auction_*, trade_* kể từ 2026-06-23.)
- `realtime/events.ts` (hằng số+payload), `realtime/reconnect.ts` (registry, có test) — **đã viết, chưa nối hết**.

### Frontend (`frontend/`) — `tsc -b` sạch, `vite build` exit 0
- `types/game.ts` mirror shape mới; `hooks/useSocket.ts` +13 action mới + playerToken/roomSettings.
- `hooks/useGameSelectors.ts` (netWorth/myProperties/canBuild/currentRent) — **44 test xanh**.
- `components/hud/PortfolioPanel.tsx` — "Tài sản của tôi" + nút Xây/Bán/Cầm cố/Chuộc.
- Lobby: chọn **token skin** (8 quân, không trùng) + cấu hình phòng (mode + house rules).
- *(AuctionModal.tsx, TradeModal.tsx — đã xóa kể từ 2026-06-23.)*
- `components/scene3d/Dice3D.tsx` — **xúc xắc 3D thật** (react-three-fiber), snap đúng kết quả server. Đã thay xúc xắc ở giữa bàn.
- UI ra tù chủ động + gom tiền cứu phá sản (CenterStageControls).
- `data/skins.ts`, `utils/format.ts`.
- **Quân cờ & nhà 3D-CSS** (`Cell.tsx`): quân = emoji theo skin (nổi 3D), nhà = khối 3D xếp 1–4 + khách sạn (khối đỏ) đúng mô hình `houses`/`hotel`; nút xây theo luật mới (≤ khách sạn, không khi cầm cố). **Bàn cố ý để PHẲNG** (dev trước đã bỏ nghiêng để dễ đọc — giữ vậy).

## ĐÃ XONG THÊM (2026-06-23, đợt "làm nốt")
- **Polish**: `Dice3D` lazy-load (main bundle ~347KB gzip 102KB, Dice3D tách chunk riêng), **WinnerModal** (màn thắng + BXH net worth), **nút tắt/bật âm thanh** (lưu localStorage, `utils/sound.ts`), **board theme** đổi nền theo `boardSkin` (neon/classic/tet) ở `App.tsx`.
- **Auto turn-timer (server)**: `armTurnTimer` trong `index.ts` — hết giờ tự tung + kết thúc lượt (nếu trạng thái đơn giản), bỏ qua trạng thái phức tạp; arm khi `start_game`/`end_turn`/auto-fire.
- **Reconnect**: `relinkPlayer` (gameManager) cập nhật mọi tham chiếu id (players/tiles/payment); handler `rejoin` + grace 60s khi disconnect (không phá sản ngay); FE tự `rejoin` bằng token localStorage khi `connect`; nút "Thoát" xoá token.
- Đã verify: BE `tsc` + **175 test** + boot OK; FE `tsc -b` + `vite build` exit 0.

## ĐÃ XONG THÊM (2026-06-23, đợt "Đổi luật")
- **Đổi luật:** bỏ hoàn toàn Trade & Auction; xây **chỉ khi đáp xuống ô của mình** (lần 1 tới 4 nhà, lần 2+ mở khách sạn); **không cần trọn nhóm màu**; **bỏ xây đều**; **bỏ bán đều** (bán tự do); thêm **thắng nhanh: 3 nhóm màu bất kỳ → thắng ngay lập tức**.
- **Backend:** `ownerVisits` tracking cho mỗi ô (mua = 1, đáp lại += 1); engine `build.ts` kiểm `position === tileId` + `ownerVisits`; `rent.ts` giữ nguyên (bonus khi trọn nhóm vẫn có); `winConditions.ts` `checkInstantWin()` — thắng nhanh khi 3 nhóm màu / trọn 1 cạnh (`BOARD_SIDES`) / cả 4 nhà ga (`RAILROAD_IDS`); `passBuy()` từ chối mua → ô giữ ngân hàng (bỏ đấu giá); `bankruptcy` nợ bank → đất về bank (bỏ đấu giá).
- **Tài liệu:** `docs/RULES.md` cập nhật §1 (mục tiêu + thắng 3 nhóm), §5.1 (từ chối → ngân hàng), §7.4 (xây khi đáp lần 1→4 nhà/lần 2→khách sạn), §7.5 (bỏ bán đều), xóa §8 (đấu giá), sửa §9 (phá sản), đánh số lại. `docs/PROGRESS.md` ghi lại quyết định.
- Backend: `tsc` sạch, **142+ test xanh**, boot OK. Frontend: `tsc -b` sạch, `vite build` exit 0.

## ĐÃ XONG THÊM (2026-06-23, đợt a11y + perf)
- **T4.5 A11y**: `aria-label` cho mọi nút icon, `role="dialog"`/`aria-modal`/`aria-labelledby` + đóng bằng phím **Escape** cho modal (Help/Interactive), `role="alert"` cho toast lỗi, `aria-hidden` cho icon/emoji trang trí, nhãn cho input (chat/lobby), nâng tương phản chữ `slate-700→500`. (subagent Sonnet).
- **T4.6 Perf 3D (Dice3D)**: `frameloop="demand"` + driver `invalidate()` (chỉ render khi đang lăn/settle, hết hao 60fps lúc đứng yên); dispose material/texture khi đổi skin/unmount (hết leak); `gl.powerPreference:'high-performance'`, `shadows={false}`.
- Verify: FE `tsc -b` + `vite build` exit 0.

## VIỆC TIẾP THEO (ưu tiên)
1. **Kiểm thử multiplayer thật (việc chính còn lại)**: mở 2 tab, chạy toàn bộ luồng mới — xây nhà (lần 1→4 nhà, lần 2→KS), cầm cố, ra tù, phá sản gom tiền, doubles, **reconnect** (đóng tab rồi mở lại trong 60s), **turn-timer** (bật mode Nhanh), **thắng nhanh (3 nhóm màu / trọn 1 cạnh / cả 4 nhà ga)**. Sửa bug phát sinh.
2. **Responsive/mobile** pass (T4.4 — layout đang tối ưu desktop). *T4.5/T4.6 đã xong.*
3. (Tùy chọn) Token/nhà **WebGL thật** thay CSS-3D; áp theme sâu hơn cho board/dice skin; T2.1 tách `socketHandlers.ts`.

## Cách chạy
```
cd backend && npm install && npm run dev    # cổng 5000
cd frontend && npm install --legacy-peer-deps && npm run dev   # cổng 5173
```
Test: `cd backend && npm test` · `cd frontend && npx vitest run`.
Lưu ý: frontend cần `--legacy-peer-deps` (xung đột peer eslint có sẵn).

## Lệnh kiểm tra nhanh trạng thái
- Backend xanh: `cd backend && npm test` → mong đợi 175+ pass.
- Frontend build: `cd frontend && npx tsc -b` (exit 0) + `npx vite build` (exit 0).
