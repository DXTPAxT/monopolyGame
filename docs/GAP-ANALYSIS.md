# Đối Chiếu Hiện Trạng vs Luật Chuẩn (Gap Analysis)

> So sánh code hiện tại (`backend/src/game/gameEngine.ts`, `board.json`, frontend) với [RULES.md](./RULES.md).
> Trạng thái: ✅ đã có & đúng · ⚠️ có nhưng sai/sơ sài · ❌ thiếu hoàn toàn.
> Cập nhật: 2026-06-22.

---

## A. Cơ Chế Lõi (Engine)

| # | Hạng mục | Trạng thái | Hiện trạng | Cần làm |
|---|---|---|---|---|
| A1 | Tung xúc xắc & di chuyển | ✅ | `rollDiceAndMove` chạy đúng cơ bản | Giữ, tách logic doubles |
| A2 | **Xúc xắc đôi → tung lại** | ❌ | Doubles chỉ dùng để thoát tù | Thêm: đôi → được tung lại; 3 đôi → vào tù |
| A3 | Nhận $200 khi qua GO | ⚠️ | Dùng `newPosition < oldPosition` — sai khi thẻ dịch chuyển/lùi ô | Tính qua-GO theo quãng đường thực, mọi nguồn di chuyển |
| A4 | Mua đất | ✅ | `buyProperty` ổn | Giữ |
| A5 | **Đấu giá khi từ chối mua** | ❌ | Từ chối = bỏ qua, mất luôn | Thêm cơ chế đấu giá (§8 RULES) |
| A6 | Tính thuê đất thường | ⚠️ | Có ×2 khi trọn nhóm; nhưng map nhà chỉ tới 3, khách sạn=`rent[5]` | Sửa theo 4 nhà chuẩn: `rent[houses]`, KS=`rent[5]` |
| A7 | Tính thuê nhà ga | ✅ | Đúng theo số ga | Giữ |
| A8 | Tính thuê tiện ích | ✅ | 4×/10× tổng xúc xắc | Giữ (lưu ý dùng đúng xúc xắc khi tới bằng thẻ) |
| A9 | Không thu thuê khi đất cầm cố | ❌ | Chưa có khái niệm cầm cố | Thêm khi làm mortgage |
| A10 | **Xây nhà chuẩn 4 nhà → khách sạn** | ⚠️ | Cap 3 nhà; KS chỉ qua "đáp lại ô" hoặc sự kiện GO; tên cấp kỳ cục ("Chuồng Chó") | Làm chuẩn 0→4 nhà→KS, xây bất kỳ lúc nào trong lượt |
| A11 | Xây đều (even build) | ⚠️ | Có chặn chênh >1 khi xây, nhưng luồng nâng cấp dị | Giữ luật even-build, gắn vào luồng build chuẩn |
| A12 | **Giới hạn kho 32 nhà / 12 KS** | ❌ | Không giới hạn | Thêm đếm kho toàn bàn |
| A13 | **Bán nhà (nửa giá)** | ❌ | Không thể bán | Thêm bán đều, nửa `housePrice` |
| A14 | **Cầm cố / chuộc đất** | ❌ | Không có | Thêm mortgage 50% giá, chuộc +10% |
| A15 | Vào tù (ô 30 / thẻ) | ✅ | Đúng | Giữ, bổ sung nguồn "3 đôi" |
| A16 | **Lựa chọn ở tù** | ⚠️ | Chỉ: đôi để thoát, hoặc ép $50 sau 3 lượt | Thêm: chủ động trả $50 / dùng thẻ ra tù bất kỳ lúc nào |
| A17 | **Thẻ "Ra Tù Miễn Phí"** | ❌ | Không có | Thêm vào cả 2 bộ, giữ trong tay người chơi |
| A18 | Ô thuế | ✅ | $200 / $100 cố định | Giữ; nối vào jackpot nếu bật |
| A19 | **Bộ thẻ Cơ Hội/Quỹ đầy đủ** | ⚠️ | 5 thẻ random mỗi bộ, chỉ ±tiền & 2 dịch chuyển | Mở rộng ~16 thẻ/bộ, data-driven, đủ loại hiệu ứng (§11) |
| A20 | Phá sản | ⚠️ | Có, nhưng tài sản **xóa về ngân hàng** (kể cả nợ người chơi) | Chuyển tài sản cho **chủ nợ**; nợ bank → đấu giá |
| A21 | Bắt buộc bán/cầm cố trước khi phá sản | ❌ | Thiếu tiền = phá sản ngay | Cho phép gom tiền (bán nhà/cầm cố) trước khi buộc phá sản |
| A22 | Điều kiện thắng | ✅ | Còn 1 người → thắng | Giữ; thêm thắng theo tài sản khi hết giờ (chế độ timer) |
| A23 | **Giao dịch người-người (trade)** | ❌ | Không có | Thêm đề nghị/đồng ý trao đổi đất+tiền+thẻ ra tù |
| A24 | GO bonus tùy chọn ($150/nâng free) | ⚠️ | House-rule lạ, không chuẩn | Bỏ về $200 chuẩn; chuyển thành toggle Double GO |
| A25 | Free Parking | ⚠️ | Không có gì (đúng chuẩn) nhưng không có toggle jackpot | Thêm toggle jackpot |

---

## B. Realtime / Server

| # | Hạng mục | Trạng thái | Hiện trạng | Cần làm |
|---|---|---|---|---|
| B1 | Tạo/vào/bắt đầu phòng | ✅ | Ổn | Giữ |
| B2 | Đồng bộ state qua socket | ✅ | `game_state_update` broadcast | Giữ, mở rộng event mới |
| B3 | Kiểm tra đúng lượt | ✅ | Check `activePlayer.id` | Giữ; với trade/auction cần cho phép người khác hành động |
| B4 | **Reconnect** | ❌ | Mất kết nối = auto phá sản | Thêm grace period + reconnect bằng token |
| B5 | **Turn timer (server-side)** | ❌ | Không có | Thêm đếm giờ + auto-pass khi bật toggle |
| B6 | Cấu hình phòng (modes/toggles/skins) | ❌ | Không có | Thêm room settings (game mode, house rules, skins) |
| B7 | Validate hành động phía server | ⚠️ | Một phần | Bổ sung cho mọi action mới (trade/auction/mortgage/build/sell) |
| B8 | Chống tác động ngoài lượt | ⚠️ | Chặn cứng theo activePlayer | Cho phép quản lý tài sản/giao dịch ngoài lượt theo luật |

---

## C. UI / UX (Frontend)

| # | Hạng mục | Trạng thái | Hiện trạng | Cần làm |
|---|---|---|---|---|
| C1 | **Khả năng đọc (font-size)** | ⚠️ | Phần lớn `7.5px–10px` | Hệ thống typography mới, cỡ tối thiểu hợp lý |
| C2 | **"Tài sản của tôi" (portfolio)** | ❌ | Không có | Panel danh sách đất, nhà, thuê, cầm cố của mình |
| C3 | **Net worth / tổng tài sản** | ❌ | Chỉ hiện tiền mặt | Tính & hiển thị tổng tài sản trong leaderboard |
| C4 | **Token quân cờ** | ⚠️ | Vòng tròn chữ cái | Token 3D có skin chọn được |
| C5 | Bàn cờ | ⚠️ | Flat, chữ chen chúc | 2.5D nghiêng + scene 3D objects, tile rõ ràng |
| C6 | Khu hành động / modal | ⚠️ | Bottom-sheet nhỏ trong tâm bàn | Khu quyết định rõ ràng, đủ lớn, dễ thao tác |
| C7 | Cột phải quá tải | ⚠️ | Leaderboard+log+chat+exit dồn 260px | Tổ chức lại HUD, tab/collapse hợp lý |
| C8 | **Trade/Auction/Mortgage UI** | ❌ | Không có | Modal/panel cho 3 cơ chế mới |
| C9 | Toast biến động tiền | ❌ | Chỉ toast lỗi | +$/−$ nổi lên khi thu/chi |
| C10 | Turn timer UI | ❌ | Không có | Vòng đếm giờ quanh avatar người đang đi |
| C11 | Âm thanh | ⚠️ | Có click, không toggle | Thêm SFX + nút bật/tắt + nhạc nền tùy chọn |
| C12 | Trạng thái thắng/empty | ⚠️ | Có nút chơi lại | Màn hình thắng hoành tráng + thống kê ván |
| C13 | Responsive / mobile | ❌ | Center stage cố định | Layout co giãn; mobile fallback 2.5D |
| C14 | **3D dice / token / house** | ❌ | Tất cả phẳng | react-three-fiber scene (hybrid) |
| C15 | Lobby chọn skin/mode | ❌ | Chỉ tên + mã phòng | Bộ chọn token/board/dice skin + cấu hình phòng |
| C16 | Hiệu ứng độc quyền nhóm màu | ✅ | Có viền phát sáng monopoly | Giữ, đưa vào theme mới |
| C17 | A11y (tương phản, keyboard, aria) | ⚠️ | Yếu | Cải thiện tương phản & điều hướng |

---

## D. Tóm Tắt Ưu Tiên

**Thiếu nghiêm trọng nhất về luật (phải có để gọi là "đủ chuẩn"):**
1. Xây nhà chuẩn 4→KS + giới hạn kho (A10, A12)
2. Bán nhà & cầm cố để cứu phá sản (A13, A14, A21)
3. Đấu giá (A5)
4. Doubles tung lại / 3 đôi vào tù (A2)
5. Lựa chọn ra tù đầy đủ + thẻ ra tù (A16, A17)
6. Bộ thẻ đầy đủ data-driven (A19)
7. Phá sản chuyển tài sản cho chủ nợ (A20)
8. Giao dịch người-người (A23)

**Thiếu nghiêm trọng nhất về UX:**
1. Khả năng đọc (C1)
2. Portfolio "tài sản của tôi" + net worth (C2, C3)
3. UI cho trade/auction/mortgage (C8)
4. Token/dice/house 3D + skins (C4, C14, C15)
5. Tổ chức lại HUD + responsive (C7, C13)
