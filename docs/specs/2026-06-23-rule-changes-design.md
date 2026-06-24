# Spec: Đổi Luật — Bỏ Giao Dịch & Đấu Giá, Xây Khi Đáp Ô, Thắng 3 Nhóm Màu

> Ngày: 2026-06-23. Trạng thái: đã duyệt brainstorm, chờ implement.
> Liên quan: `docs/RULES.md` (sẽ cập nhật), `backend/src/game/**`, `frontend/src/**`.

## 1. Mục tiêu

Thay đổi luật chơi theo yêu cầu người dùng:

1. **Bỏ hoàn toàn Giao Dịch (Trade).**
2. **Bỏ hoàn toàn Đấu Giá (Auction).**
3. **Đổi luật xây nhà**: không cần sở hữu trọn nhóm màu; xây **chỉ khi đáp xuống ô của mình**; lần đáp đầu (mua) được xây tới 4 nhà, lần đáp thứ 2 trở đi mở khoá khách sạn. Bỏ luật "xây đều".
4. **Thêm luật thắng nhanh**: sở hữu trọn vẹn **3 nhóm màu** bất kỳ → thắng ngay.
5. **Tiền thuê giữ nguyên** (kể cả bonus ×2 khi sở hữu trọn nhóm màu).

Phi mục tiêu: không đổi cầm cố, tù, thẻ bài, doubles, free parking, turn-timer, reconnect.

## 2. Thay đổi mô hình dữ liệu

`backend/src/game/types.ts`:

- `TileState` thêm trường `ownerVisits: number` (số lần chủ hiện tại đã "ghé" ô — mua tính là 1, mỗi lần đáp lại +1). Khởi tạo 0; reset về 0 khi ô về ngân hàng (phá sản nợ bank); set 1 khi mua.
- Bỏ `AuctionState`, `TradeBundle`, `TradeOffer` (và mọi tham chiếu). Trong `GameState` bỏ `auction` và `pendingTrades`.
- `ModalType`: bỏ `'auction'`, `'trade'`. Có thể giữ `'build_houses'` mới thay cho `'upgrade_hotel'` (xem §4).
- `ActionRequired`: bỏ `'auction'`. Không thêm trạng thái bắt buộc mới cho xây (xây là tùy chọn — xem §4).

Khi mua đất (`tokenSkin` của FE mirror), FE `types/game.ts` cập nhật tương ứng (bỏ Trade/Auction types, thêm `ownerVisits`).

## 3. Bỏ Giao Dịch & Đấu Giá

### Backend
- Xóa file: `engine/trade.ts`, `engine/auction.ts` và các test tương ứng (`*.test.ts`).
- `gameEngine.ts`: bỏ import + các facade `startAuction/placeBid/passAuction`, `declineBuyToAuction`, `auctionBid`, `auctionPass`, `proposeTradeOffer`, `respondToTrade`, `cancelTradeOffer`. Thêm hàm `passBuy(state)` (từ chối mua → đóng modal, ô vẫn thuộc ngân hàng).
- `index.ts`: bỏ socket handlers `auction_bid`, `auction_pass`, `trade_propose`, `trade_respond`, `trade_cancel`. Đổi `decline_buy` → gọi `passBuy` (không đấu giá). `endTurn` nhánh `buy_or_pass`: chỉ log "không mua".
- `bankruptcy.ts`: nợ ngân hàng đã trả đất về bank (đã đúng) — không cần đấu giá. Chỉ cập nhật docs.
- `realtime/events.ts`: bỏ hằng số sự kiện trade/auction nếu có.

### Frontend
- Xóa `components/modals/TradeModal.tsx`, `components/modals/AuctionModal.tsx`.
- `hooks/useSocket.ts`: bỏ `auctionBid`, `auctionPass`, `tradePropose`, `tradeRespond`, `tradeCancel` và export của chúng; giữ `declineBuy` (giờ chỉ đóng modal).
- `components/Board.tsx`: bỏ render TradeModal/AuctionModal, banner đề nghị giao dịch đến, nút mở Trade.
- `types/game.ts`: bỏ Trade/Auction types, `auction`, `pendingTrades`.

## 4. Luật xây mới — xây khi đáp xuống ô

### Quy tắc engine (`engine/build.ts` `buildHouse`)
Điều kiện hợp lệ để xây **một cấp** trên `tileId`:
1. Ô là `property`, do **người chơi đang tới lượt** sở hữu.
2. **`tileId === player.position`** — phải đang đứng trên ô (thay cho điều kiện "trọn nhóm màu"). Đây là cơ chế "xây khi đáp xuống".
3. Ô **không bị cầm cố** (chỉ xét chính ô này, bỏ xét cả nhóm).
4. Chưa đạt khách sạn.
5. **Bỏ** kiểm tra trọn nhóm màu (`ownsFullGroup`) và **bỏ** xây đều (`even-build`).
6. Nếu đang xây nhà (`houses < 4`): cần kho nhà còn (`housesLeft > 0`), đủ tiền `housePrice`.
7. Nếu lên khách sạn (`houses === 4`): cần **`ownerVisits >= 2`** (mở khoá ở lần đáp thứ 2), kho khách sạn còn, đủ tiền.

Hệ quả:
- **Lần đáp 1 (mua ô)**: `ownerVisits = 1`, được bấm xây liên tiếp 0→1→2→3→4 nhà (mỗi lần +1, trả tiền), không lên được khách sạn (vì `ownerVisits < 2`).
- **Lần đáp 2+**: `ownerVisits >= 2`, được xây nốt nhà còn thiếu rồi lên khách sạn.

`sellHouse`: bỏ luật bán đều (`maxLevel` check). Cho bán bất cứ ô nào mình sở hữu (vẫn chỉ giảm 1 cấp/lần, hoàn nửa giá). Bán không cần đứng trên ô (quản lý tài sản khi gom tiền trả nợ vẫn cần) — **giữ bán tự do**, chỉ xây mới bị giới hạn theo ô.

### Tăng `ownerVisits`
- `buyProperty`: sau khi gán `ownerId`, đặt `ownerVisits = 1`. Nếu là `property`, mở modal xây (`activeModal = 'build_houses'`, `modalPayload = { tileId }`, `currentActionRequired = 'none'` — tùy chọn).
- `resolveTileLanding`, nhánh `ownerId === player.id` và là `property`: `ownerVisits += 1`, mở modal xây tương tự. (Ga/tiện ích: chỉ `clearModals`.)

### Luồng UI xây
- Xây là **tùy chọn**, không chặn kết thúc lượt (`currentActionRequired = 'none'`).
- Modal `build_houses` hiển thị khi đáp/mua ô property của mình: nút **"Xây (+$X)"** (gọi `build_house` với `tileId = player.position`), hiển thị cấp hiện tại và mức trần cho lần đáp này (4 nhà nếu `ownerVisits===1`, khách sạn nếu `>=2`). Nút **"Xong"** đóng modal (`pass_build` → clear modal).
- `index.ts`: `build_house` chỉ cho active player; engine tự kiểm `tileId === position`. Đổi/giữ `pass_upgrade_hotel` thành `pass_build` (đóng modal). Bỏ `upgrade_hotel`/`go_choose_bonus` nếu không còn dùng (giữ tương thích tối thiểu nếu rủi ro).
- FE `PortfolioPanel.tsx`: **bỏ nút Xây** (xây nay qua modal khi đáp ô). Giữ nút Bán/Cầm cố/Chuộc.
- FE thêm modal xây nhà (có thể tái dụng modal nâng cấp cũ): `components/modals/BuildModal.tsx` hoặc mở rộng modal hiện có.

## 5. Tiền thuê — giữ nguyên
`engine/rent.ts` **không đổi**: `rent[houses]`, `rent[5]` cho khách sạn, bonus `rent[0]*2` khi trọn nhóm. (Bonus dựa trên sở hữu nhóm, độc lập với luật xây.)

## 6. Luật thắng nhanh

> Cập nhật 2026-06-23: bổ sung 2 điều kiện (trọn 1 cạnh / cả 4 nhà ga). Module đổi tên `winGroups.ts` → `winConditions.ts`, hàm `checkColorGroupWin` → `checkInstantWin`.

`engine/board.ts`: `countFullGroups(state, playerId): number` (số nhóm `PROPERTY_GROUPS` trọn vẹn); hằng `BOARD_SIDES` (id ô mua được theo 4 cạnh) và `RAILROAD_IDS`.

`engine/winConditions.ts` — `checkInstantWin(state): { gameOver; winnerId? }`: với mỗi người chưa phá sản, thắng ngay nếu thoả MỘT trong:
1. `countFullGroups >= 3` (3 nhóm màu).
2. `ownsFullSide` — sở hữu mọi ô **đất (property)** trên ít nhất 1 trong 4 cạnh (không tính ga/tiện ích; `BOARD_SIDES` lọc theo `isProperty`).
3. `ownsAllRailroads` — sở hữu cả 4 nhà ga.

Gọi sau mỗi lần đổi chủ đất: `buyProperty` (sau khi gán owner) và `declareBankruptcy` (chủ nợ nhận đất).

Giữ nguyên điều kiện thắng cũ (người cuối chưa phá sản / giàu nhất khi hết giờ).

## 7. Kế hoạch test (TDD cho engine)

- **Xóa**: `trade.test.ts`, `auction.test.ts`.
- **Viết lại `build.test.ts`**: xây không cần trọn nhóm; chặn xây khi không đứng trên ô (`position` khác); chặn khách sạn khi `ownerVisits < 2`; cho khách sạn khi `>=2` & đủ 4 nhà; bỏ even-build (xây ô bất kỳ trong nhóm OK); kho nhà/khách sạn; bán không cần bán đều.
- **Giữ** `rent.test.ts` (không đổi logic; chỉ đảm bảo vẫn xanh).
- **Thêm** `winGroups.test.ts`: 3 nhóm trọn → thắng; 2 nhóm → chưa; chuyển nhóm qua phá sản → chủ nợ thắng.
- **Cập nhật** test nào tham chiếu `auction`/`pendingTrades`/`ownsFullGroup` build cũ.
- Mục tiêu: `cd backend && npm test` xanh; `tsc` sạch. FE `tsc -b` + `vite build` exit 0.

## 8. Cập nhật tài liệu
- `docs/RULES.md`: viết lại §7.4 (xây theo lần đáp), bỏ §8 (đấu giá), bỏ phần Trade, sửa §5.1 (từ chối mua → giữ ngân hàng), §10 (nợ bank → trả về ngân hàng), thêm mục luật thắng 3 nhóm màu.
- `docs/PROGRESS.md`: ghi mốc đổi luật, cập nhật "đã chốt" & việc tiếp theo.

## 9. Rủi ro & lưu ý
- Nhiều file FE/BE tham chiếu chéo trade/auction → xóa phải gỡ sạch import để `tsc` không vỡ.
- `realtime/reconnect.ts` `relinkPlayer` có cập nhật tham chiếu auction/trades → gỡ phần đó khi bỏ.
- `useGameSelectors.ts` `canBuild` dựa luật cũ (trọn nhóm) → cập nhật/loại bỏ; test `useGameSelectors.test.ts` sửa theo.
