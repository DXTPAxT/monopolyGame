# Luật Chơi Cờ Tỷ Phú (Monopoly) — Tài Liệu Chuẩn

> Đây là tài liệu luật **chuẩn (authoritative)** cho dự án. Engine phải khớp với tài liệu này.
> Phiên bản: 1.2 — Cập nhật: 2026-06-23 (bỏ Trade & Auction, xây khi đáp, thắng nhanh: 3 nhóm màu / trọn 1 cạnh / cả 4 nhà ga).
> Bàn cờ giữ chủ đề **địa danh Việt Nam** nhưng cơ chế bám sát Monopoly bản US chuẩn.

---

## 1. Tổng Quan

- **Số người chơi:** 2–6.
- **Mục tiêu:** Là người chơi cuối cùng chưa phá sản (hoặc giàu nhất khi hết giờ ở chế độ có giới hạn thời gian).
- **Thắng nhanh (thắng ngay lập tức khi thoả MỘT trong các điều kiện):**
  1. Sở hữu trọn vẹn **3 nhóm màu** bất kỳ.
  2. Sở hữu trọn **1 cạnh bàn cờ** — tức tất cả ô **đất xây nhà được** trên 1 trong 4 cạnh (KHÔNG tính nhà ga & tiện ích).
  3. Sở hữu cả **4 nhà ga**.
- **Tiền khởi điểm:** $1500 mỗi người.
- **Bàn cờ:** 40 ô, đánh số 0–39, đi theo chiều kim đồng hồ.
- **Ngân hàng:** Không bao giờ "phá sản". Trả lương GO, tiền thưởng thẻ, nhận thuế/phạt, bán/cầm cố tài sản. Quản lý kho **32 nhà** và **12 khách sạn** (giới hạn vật lý — xem §7.4).

---

## 2. Thành Phần Bàn Cờ (40 ô)

| Loại ô | Mô tả | Số lượng |
|---|---|---|
| GO (Bắt đầu) | Ô 0. Nhận $200 khi đi qua/đáp xuống | 1 |
| Đất thường (property) | Có nhóm màu, mua/xây nhà được | 22 |
| Nhà ga (railroad) | Tiền thuê theo số ga sở hữu | 4 |
| Tiện ích (utility) | Tiền thuê theo xúc xắc | 2 |
| Thuế (tax) | Nộp tiền cố định | 2 |
| Cơ Hội (Chance) | Rút thẻ Cơ Hội | 3 |
| Quỹ Cộng Đồng (Community Chest) | Rút thẻ Quỹ | 3 |
| Nhà Tù (Jail / Just Visiting) | Ô 10. Thăm viếng hoặc bị giam | 1 |
| Vào Tù (Go To Jail) | Ô 30. Đưa thẳng vào tù | 1 |
| Bãi Đỗ Xe Miễn Phí (Free Parking) | Ô 20. Mặc định không có gì | 1 |

**Nhóm màu đất (8 nhóm):**

| Nhóm | Số ô | Giá nhà/khách sạn mỗi cấp |
|---|---|---|
| brown (nâu) | 2 | $50 |
| light_blue (xanh nhạt) | 3 | $50 |
| pink (hồng) | 3 | $100 |
| orange (cam) | 3 | $100 |
| red (đỏ) | 3 | $150 |
| yellow (vàng) | 3 | $150 |
| green (lục) | 3 | $200 |
| dark_blue (xanh đậm) | 2 | $200 |

> **Lưu ý dữ liệu hiện tại:** nhóm `brown` đang gồm 2 ô **không liền kề** (ô 1 và ô 3, kẹp giữa là Quỹ Cộng Đồng ô 2). Đây đúng theo Monopoly chuẩn (nhóm tím đậm Mediterranean/Baltic kẹp Community Chest). Giữ nguyên.

---

## 3. Lượt Chơi (Turn) — Trình Tự Chuẩn

Mỗi lượt của người chơi diễn ra theo thứ tự:

1. **(Tùy chọn trước khi tung)** Người chơi có thể: xây/bán nhà, cầm cố/chuộc đất, trả tiền ra tù (nếu đang ở tù). *(Trong nhiều ván online, các hành động quản lý tài sản được phép thực hiện cả ngoài lượt — xem §9.)*
2. **Tung 2 xúc xắc.**
3. **Xử lý xúc xắc đôi (doubles):** nếu hai mặt bằng nhau → sau khi giải quyết ô, người chơi **được tung lại** (xem §4).
4. **Di chuyển** số ô bằng tổng điểm, theo chiều kim đồng hồ. Nếu đi qua/đáp GO → nhận $200.
5. **Giải quyết ô đáp xuống** (mua đất / trả thuê / nộp thuế / rút thẻ / vào tù / v.v. — §5). **Nếu mua tài sản được mở modal xây nhà** (nếu điều kiện cho phép).
6. **(Tùy chọn sau khi giải quyết)** tiếp tục xây/bán/cầm cố.
7. **Kết thúc lượt** (trừ khi vừa tung đôi và còn được tung lại).

---

## 4. Xúc Xắc Đôi (Doubles)

- Tung đôi → di chuyển và giải quyết ô như bình thường, **sau đó được tung lại** một lần nữa.
- **3 lần đôi liên tiếp trong cùng một lượt** → người chơi **bị đưa thẳng vào tù ngay lập tức** (không di chuyển theo lần tung thứ 3, không giải quyết ô đó).
- Khi đang **ở trong tù**, tung đôi là cách thoát ra (xem §6) — nhưng **KHÔNG** được tung lại sau khi thoát tù bằng đôi. *(House rule "Ra tù bằng đôi được đi tiếp" — §11 — có thể bật để cho phép tung lại; mặc định tắt.)*
- **Cảnh báo:** sau khi đổ đôi **lần thứ 2 liên tiếp**, hệ thống nhắc người chơi rằng đổ đôi lần nữa sẽ vào tù.

---

## 5. Giải Quyết Theo Loại Ô

### 5.1 Đất thường / Nhà ga / Tiện ích (chưa có chủ)
- Người chơi được chọn **MUA** với giá niêm yết, hoặc **TỪ CHỐI**.
- Nếu **từ chối** → tài sản **vẫn thuộc ngân hàng** (không đấu giá). Người chơi khác có thể mua sau nếu đáp xuống ô đó.

### 5.2 Đất đã có chủ (không phải mình)
- Trả **tiền thuê** cho chủ (§7). Nếu đất đang **bị cầm cố** → không thu thuê.
- Nếu không đủ tiền mặt → phải bán nhà/cầm cố để gom tiền; nếu vẫn không đủ → **phá sản** (§9).

### 5.3 Đất của chính mình
- Không làm gì (có thể chủ động xây nhà nếu đủ điều kiện — §7.4).

### 5.4 Ô Thuế
- **Thuế Thu Nhập (ô 4):** $200 (bản chuẩn cho phép chọn $200 hoặc 10% tổng tài sản — dự án dùng cố định **$200**).
- **Thuế Xa Xỉ (ô 38):** $100.
- Nếu bật **Free Parking jackpot** → số tiền này dồn vào hũ giữa bàn.

### 5.5 Ô Cơ Hội / Quỹ Cộng Đồng
- Rút thẻ trên cùng, thực hiện hành động, để thẻ xuống đáy chồng (trừ thẻ "Ra Tù Miễn Phí" được giữ lại — §11).

### 5.6 Ô GO (đáp xuống)
- Nhận $200 (như đi qua). **Không** có thưởng đặc biệt (luật chuẩn). *(House-rule cũ "+$150 hoặc nâng cấp free" bị loại bỏ; có thể bật lại qua toggle "Double GO" ở chế độ Hỗn Loạn — §12.)*

### 5.7 Ô Vào Tù (ô 30)
- Đưa thẳng quân cờ vào ô Nhà Tù (ô 10), đặt trạng thái **đang bị giam**. Không nhận $200 dù đi ngang GO.

### 5.8 Nhà Tù (ô 10) khi chỉ "Thăm Viếng"
- Không có hiệu ứng.

### 5.9 Bãi Đỗ Xe Miễn Phí (ô 20)
- Mặc định: không có gì. Nếu bật **Free Parking jackpot** → người đáp xuống **nhận toàn bộ hũ** rồi hũ về $0.

---

## 6. Nhà Tù (Jail)

**Cách bị vào tù:** (a) đáp ô 30 "Vào Tù", (b) rút thẻ "Đi thẳng vào tù", (c) tung đôi 3 lần liên tiếp.

**Khi đang ở tù, đầu lượt người chơi chọn một trong:**
1. **Trả $50** cho ngân hàng → ra tù ngay rồi tung và đi bình thường.
2. **Dùng thẻ "Ra Tù Miễn Phí"** (nếu có) → ra tù, tung và đi.
3. **Tung xúc xắc, hi vọng ra đôi:**
   - Ra đôi → ra tù, di chuyển theo tổng điểm (KHÔNG được tung lại).
   - Không ra đôi → ở lại tù, lượt kết thúc.
4. Sau **3 lượt** vẫn chưa ra → **bắt buộc trả $50** (hoặc dùng thẻ) ở lần tung thứ 3 rồi di chuyển theo điểm vừa tung. Nếu không đủ $50 → phải gom tiền hoặc phá sản.

> Người ở tù **vẫn được** thu tiền thuê, xây nhà, cầm cố.

---

## 7. Tiền Thuê (Rent)

### 7.1 Đất thường
- **Đất trống (không nhà):** tiền thuê cơ bản `rent[0]`.
- **Sở hữu trọn nhóm màu (monopoly), chưa xây nhà:** tiền thuê cơ bản **×2**.
- **Có nhà/khách sạn:** theo bảng `rent[1..5]` (1 nhà → `rent[1]`, …, 4 nhà → `rent[4]`, khách sạn → `rent[5]`).

> **Sửa lỗi dữ liệu/engine:** bảng `rent` có 6 phần tử `[trống, 1 nhà, 2 nhà, 3 nhà, 4 nhà, khách sạn]`. Engine hiện tại bỏ qua chỉ số 4 và map khách sạn = `rent[5]` (do giới hạn 3 nhà). Sau nâng cấp 4-nhà-chuẩn, index phải là `rent[houses]` với houses 1–4, và khách sạn = `rent[5]`.

### 7.2 Nhà ga
Theo số nhà ga **cùng một chủ** sở hữu:
| Số ga | Tiền thuê |
|---|---|
| 1 | $25 |
| 2 | $50 |
| 3 | $100 |
| 4 | $200 |

### 7.3 Tiện ích
- Sở hữu **1 tiện ích:** thuê = **4 × tổng xúc xắc** vừa tung.
- Sở hữu **2 tiện ích:** thuê = **10 × tổng xúc xắc**.

### 7.4 Xây Nhà & Khách Sạn

**Luật mới (từ 2026-06-23):** Xây nhà **chỉ khi đáp xuống ô của mình** — không cần sở hữu trọn nhóm màu, không xây đều. Giới hạn xây theo **số lần chủ nhân đã đáp xuống ô** (gọi là `ownerVisits`):

- **Lần đáp 1 (mua ô):** `ownerVisits = 1`. Được xây **tối đa 4 nhà** (từng cấp một, cần kho và tiền). Không được nâng lên khách sạn ở lần này.
- **Lần đáp 2 trở đi:** `ownerVisits >= 2`. Được xây nốt nhà còn thiếu (nếu muốn) rồi nâng lên **khách sạn** (1 khách sạn thay 4 nhà).

**Điều kiện xây chung:**
- Ô là `property`, do chủ người chơi đang tới lượt sở hữu.
- **Phải đang đứng trên ô** (`position === tileId`) — đây là điều kiện chính để xây.
- Ô **không bị cầm cố**.
- Đủ tiền và kho còn nhà/khách sạn:
  - Nhà: mỗi cấp = `housePrice` của nhóm (§2).
  - Khách sạn: `housePrice`, nhưng yêu cầu **`ownerVisits >= 2`** + đủ 4 nhà. Khi xây KS, 4 nhà trả về kho.

**Giới hạn kho:** tổng **32 nhà** và **12 khách sạn** trên bàn. Khi hết nhà, người chơi chờ. Khi xây KS, 4 nhà về kho.

**Lưu ý:** Xây là **tùy chọn** — không bắt buộc khi đáp xuống ô.

### 7.5 Bán Nhà
- Bán lại cho ngân hàng với **nửa giá** `housePrice`.
- Bán **tự do** — không cần bán đều. Được bán bất cứ ô nào của mình (mỗi lần giảm 1 cấp).
- Khách sạn bán = quy về 4 nhà rồi bán, hoặc bán trực tiếp về nửa giá (cần đủ nhà trong kho khi quy đổi).

---

## 8. Cầm Cố (Mortgage)

- Mỗi đất/ga/tiện ích có **giá trị cầm cố = 50% giá mua**.
- **Cầm cố:** nhận tiền cầm cố từ ngân hàng. Đất bị cầm cố **không thu thuê**. Không được cầm cố nếu trên nhóm còn nhà (phải bán hết nhà trong nhóm trước).
- **Chuộc lại (unmortgage):** trả **giá cầm cố + 10% lãi**.
- Tài sản đang cầm cố không thể được chuyển nhượng.

> **House rule "Bán đứt sổ đỏ" (§11):** khi bật, cơ chế cầm cố/chuộc bị **thay** bằng **bán đứt** — bán nhận **80%** tổng giá trị (giá đất + công trình; khách sạn quy 5 căn = 4 nhà + 1 KS), ô trở về ngân hàng và **không chuộc lại được**.

---

## 9. Phá Sản (Bankruptcy)

Xảy ra khi người chơi nợ nhiều hơn khả năng huy động (kể cả sau khi bán hết nhà & cầm cố/bán đứt hết đất).

> **Quan trọng:** nếu tiền mặt không đủ **nhưng** tổng tài sản bán/cầm cố được vẫn đủ trả nợ, người chơi **chưa bị ép phá sản** — game chuyển sang trạng thái *"gom tiền trả nợ"* để họ bán nhà/cầm cố (hoặc bán đứt) rồi bấm thanh toán. Chỉ khi thật sự không đủ mới hiện nút tuyên bố phá sản.

- **Nợ một người chơi khác:** toàn bộ tài sản (tiền mặt, đất — kèm trạng thái cầm cố) chuyển cho **chủ nợ**. Chủ nợ phải trả ngay 10% phí cho các đất đang cầm cố nhận về (hoặc giữ nguyên trạng thái cầm cố).
- **Nợ ngân hàng (thuế/phạt):** nhà bị trả về kho, đất **vẫn thuộc ngân hàng** (không đấu giá).
- Người phá sản rời khỏi ván.
- **Kết thúc game** khi chỉ còn 1 người chưa phá sản → người đó thắng. (Hoặc người giàu nhất khi hết giờ ở chế độ giới hạn.)

---

## 10. Bộ Thẻ Cơ Hội & Quỹ Cộng Đồng

Mỗi bộ ~16 thẻ, xáo trộn, rút lần lượt, để xuống đáy sau khi dùng. Các **loại hiệu ứng** cần hỗ trợ:

- **Nhận/Trả tiền cố định** với ngân hàng.
- **Đi tới một ô cụ thể** (qua GO thì nhận $200; tới ô đất → mua/trả thuê như thường).
- **Đi tới ô gần nhất** (nhà ga / tiện ích) — có thể nhân đôi thuế.
- **Lùi lại N ô.**
- **Đi thẳng vào tù** (không nhận $200).
- **Thẻ "Ra Tù Miễn Phí"** (giữ lại đến khi dùng hoặc bán/trao).
- **Nhận tiền từ / trả tiền cho mỗi người chơi.**
- **Sửa chữa nhà:** trả $X mỗi nhà và $Y mỗi khách sạn.
- **Tiến tới GO.**

> Dự án dùng **bộ thẻ chủ đề Việt Nam** (lì xì Tết, trúng vé số, kẹt xe, ngập lụt sửa nhà…) ánh xạ vào các loại hiệu ứng trên. Mỗi thẻ là dữ liệu thuần (data-driven), không hard-code logic riêng từng thẻ.

---

## 11. Biến Thể & House Rules (Tùy Chọn — Toggle)

Mặc định **TẮT** (ván chuẩn). Host bật khi tạo phòng:

| Toggle | Hiệu ứng |
|---|---|
| **Free Parking jackpot** | Thuế/phạt dồn vào hũ giữa; đáp ô 20 ăn hết. |
| **Double GO** | Đáp đúng ô GO nhận $400 (×2). |
| **Chế độ Nhanh** | Tiền khởi điểm thấp hơn (vd $1000) + bật turn timer ngắn. |
| **Chế độ Hỗn Loạn** | Bật jackpot + Double GO + nhiều thẻ sự kiện hơn. |
| **Turn timer** | Mỗi lượt có giới hạn thời gian; hết giờ auto-pass (tung tự động nếu chưa tung). |
| **Ra tù bằng đôi được đi tiếp** | Thoát tù bằng đôi vẫn được tung thêm lượt (khác luật chuẩn ở §4). |
| **Bán đứt sổ đỏ** | Thay cầm cố/chuộc bằng **bán đứt**: nhận **80%** (giá đất + công trình), ô về ngân hàng, **không chuộc lại được** (xem §9). |

---

## 12. Bảng Tham Chiếu Dữ Liệu Bàn Cờ (hiện tại)

40 ô, vị trí & giá theo `backend/src/data/board.json`. Tóm tắt nhóm:

- **GO** (0), **Jail** (10), **Free Parking** (20), **Go To Jail** (30).
- **Nhà ga:** 5 (Sài Gòn), 15 (Đà Nẵng), 25 (Hà Nội), 35 (Hải Phòng) — đều $200, rent `[25,50,100,200]`.
- **Tiện ích:** 12 (Điện lực), 28 (Nước sạch) — đều $150.
- **Thuế:** 4 (Thu Nhập $200), 38 (Xa Xỉ $100).
- **Cơ Hội:** 7, 22, 36. **Quỹ Cộng Đồng:** 2, 17, 33.
- **Đất thường:** 22 ô còn lại, chia 8 nhóm màu (xem §2).

> Giá trị `rent`, `price`, `housePrice` trong board.json đã bám sát bản chuẩn US (đổi tên địa danh sang VN). Giữ nguyên trừ khi cần cân bằng.
