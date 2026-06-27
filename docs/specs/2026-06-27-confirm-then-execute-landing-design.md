# Thiết kế: Mô hình "Thông báo → Xác nhận → Thực thi" cho hành động đáp ô

- **Ngày:** 2026-06-27
- **Trạng thái:** Đã duyệt thiết kế, sẵn sàng lập plan
- **Người thực thi dự kiến:** Claude Sonnet

---

## 1. Bối cảnh & Vấn đề

### Bug gốc người dùng báo
Khi đáp ô **Quỹ Cộng Đồng**, người chơi bị **nhảy thẳng vào tù** rồi mới hiện thông báo "bạn vào tù", thay vì: dừng ở ô → hiện thẻ "bạn bị vào tù" → bấm Chấp nhận → mới nhảy vào tù.

### Nguyên nhân gốc (đã xác minh)
Trong [`backend/src/game/gameEngine.ts`](../../backend/src/game/gameEngine.ts) hàm `drawAndApplyCard` gọi `applyCard()` **trước tiên**. Với thẻ `goToJail` ([`cardEngine.ts`](../../backend/src/game/cards/cardEngine.ts) dòng 83-89), hàm này **lập tức** gán `player.position = 10`, `player.inJail = true` — quân nhảy vào tù NGAY, rồi modal mới hiện sau.

Đây là biểu hiện của một vấn đề kiến trúc rộng hơn: **toàn bộ** hành động đáp ô (`resolveTileLanding`) đều **thực thi hiệu ứng ngay lập tức** (trừ tiền thuê/thuế, di chuyển theo thẻ, vào tù), rồi modal chỉ đóng vai trò **thông báo việc đã xảy ra**. Hai ngoại lệ duy nhất đã đúng "hỏi trước khi làm" là **mua đất** (`buy_or_pass`) và **phá sản**.

### Yêu cầu người dùng
> "Từ giờ tất cả các hành động khi đến ô phải có thông báo hiện lên, sau đó mới thực hiện."

Phạm vi đã chốt: **toàn bộ mọi hành động ô** (không chỉ thẻ vào tù).
Hướng đã chốt: **Hướng A — Hoãn thực thi ở backend** (chấp nhận chi phí sửa test để đúng hành vi).

---

## 2. Nguyên tắc cốt lõi

Tách mỗi lần đáp ô thành 2 pha rõ rệt:

1. **Pha THÔNG BÁO** (`announceTileLanding`): tính toán hậu quả, set modal mô tả + lưu trạng thái chờ. **KHÔNG** thay đổi `money` / `position` / `inJail` / quyền sở hữu.
2. **Pha THỰC THI** (`confirmLanding`): chạy khi người chơi bấm "Xác nhận" → engine **mới** áp dụng hiệu ứng, rồi quyết định bước tiếp (nối chuỗi hoặc kết thúc lượt).

Bất biến quan trọng: **sau pha THÔNG BÁO, state của người chơi (tiền/vị trí/tù) phải y hệt như trước khi đáp ô.**

---

## 3. Thay đổi mô hình dữ liệu

### 3.1 Field mới trên `GameState` (backend `types.ts` + frontend `types/game.ts`)

```ts
pendingLanding: PendingLanding | null;
```

với:

```ts
export interface PendingLanding {
  kind: 'pay_rent' | 'pay_tax' | 'card' | 'go_to_jail' | 'parking_jackpot';
  tileId?: number;        // ô liên quan
  amount?: number;        // số tiền cho pay_rent / pay_tax / parking_jackpot
  ownerId?: string;       // chủ ô cho pay_rent
  card?: {                // dữ liệu thẻ cho kind === 'card'
    type: 'chance' | 'community_chest';
    text: string;
    effect: CardEffect;
  };
}
```

- `pendingLanding` được khởi tạo `null` trong `initializeGame` và được dọn (`null`) mỗi khi `clearModals` chạy và khi `endTurn` chạy.
- Tận dụng các giá trị `ActionRequired` **đã có sẵn** nhưng chưa dùng: `pay_rent`, `pay_tax`, `draw_card`, `go_to_jail` (xem `types.ts` dòng 148-159).

### 3.2 Quy ước `currentActionRequired` trong pha THÔNG BÁO

| Loại ô khi đáp | `currentActionRequired` | `activeModal` | `pendingLanding.kind` |
|---|---|---|---|
| Đất chủ khác (có rent) | `pay_rent` | `pay_rent` | `pay_rent` |
| Ô thuế | `pay_tax` | `pay_tax` | `pay_tax` |
| Cơ Hội / Quỹ Cộng Đồng | `draw_card` | `chance`/`community_chest` | `card` |
| Ô Vào Tù (30) / 3 lần đôi | `go_to_jail` | `jail` | `go_to_jail` |
| Bãi đỗ xe có jackpot | `none` | `go_landing`/`parking` | `parking_jackpot` |
| Đất trống (mua) | `buy_or_pass` | `buy_property` | `null` (giữ nguyên) |
| Đất của mình | `none` | `build_houses` | `null` (giữ nguyên) |
| Ô an toàn (GO, thăm tù...) | `none` | `null`/`go_landing` | `null` |

> **Lưu ý:** `buy_or_pass` và `bankruptcy_decision` vốn đã "hỏi trước" — **không đổi**.

---

## 4. Thiết kế backend

### 4.1 `announceTileLanding(state, player, tile)` — thay cho `resolveTileLanding`

Chỉ **set trạng thái chờ + modal**, tuyệt đối không mutate tiền/vị trí/tù/sở hữu.

- **property/railroad/utility:**
  - Chưa ai sở hữu → `buy_or_pass` + modal `buy_property` (như cũ).
  - Của mình → `ownerVisits += 1` (đây là cập nhật sổ sách, được phép); property → `openBuildModal`; ga/tiện ích → `clearModals`.
  - Của người khác (không cầm cố, chủ chưa phá sản) → tính `rent = calcRent(...)`, **lưu** `pendingLanding = { kind:'pay_rent', tileId, amount:rent, ownerId }`, set `currentActionRequired='pay_rent'`, `activeModal='pay_rent'`. **Không trừ tiền.**
  - Của người khác nhưng cầm cố / chủ phá sản → `clearModals` (không phải trả).
- **tax:** lưu `pendingLanding = { kind:'pay_tax', tileId, amount }`, modal `pay_tax`. **Không trừ tiền, không cộng jackpot** (jackpot dồn vào lúc thực thi).
- **go_to_jail:** lưu `pendingLanding = { kind:'go_to_jail' }`, modal `jail`, `currentActionRequired='go_to_jail'`. **Không nhảy.**
- **chance / community_chest:** rút thẻ ngẫu nhiên, set `activeCard = { type, text }`, lưu `pendingLanding = { kind:'card', card:{ type, text, effect } }`, `currentActionRequired='draw_card'`, modal = loại thẻ. **Không áp hiệu ứng. Quân đứng yên tại ô thẻ.**
- **parking:** nếu có jackpot → lưu `pendingLanding={ kind:'parking_jackpot', amount:pot }`, modal thông báo; nếu không → `clearModals`.
- **default (GO / thăm tù):** nếu `doubleGo` và `tile.id===0` → lưu pending để cộng thưởng lúc thực thi (hoặc gộp vào parking_jackpot-style); ngược lại `clearModals`.

### 4.2 `confirmLanding(state): { state; event }` — hàm mới, export

Đọc `state.pendingLanding`; nếu `null` → coi như "không có gì để thực thi" → gọi `endTurn` (cho ô an toàn). Ngược lại theo `kind`:

- **`pay_rent`:** nếu `player.money >= amount` → trừ tiền player, cộng cho owner, `clearModals`, **kết thúc terminal**. Nếu thiếu → `setDebt(...,'rent')` (mở modal gom tiền/phá sản — KHÔNG kết thúc lượt).
- **`pay_tax`:** nếu bật `freeParkingJackpot` → `freeParkingPot += amount`. Nếu đủ tiền → trừ, terminal. Nếu thiếu → `setDebt(...,'tax')`.
- **`parking_jackpot`:** `player.money += amount`, `freeParkingPot = 0`, terminal.
- **`go_to_jail`:** `goToJail(state, player)` (nhảy vào tù), `clearModals`, terminal (lượt kết thúc, không đi tiếp dù có đôi — `endTurn` đã đảm bảo).
- **`card`:** gọi `applyCard(state, player, pendingLanding.card)` (áp hiệu ứng thật):
  - Nếu sau hiệu ứng `player.money < 0` → `setDebt` (như logic cũ trong `drawAndApplyCard`), không terminal.
  - Nếu thẻ khiến `player.inJail === true` (goToJail card) → `clearModals`, terminal.
  - Nếu thẻ **làm đổi vị trí** (`position !== beforePos`: moveTo/moveBy/advanceToGo/nearest) → **gọi lại `announceTileLanding`** cho ô mới. Đây là **chuỗi modal**: thẻ (đã xác nhận) → modal ô mới (chờ xác nhận tiếp). KHÔNG terminal.
  - Ngược lại (thẻ tiền/getOutOfJail/repairs) → `clearModals`, terminal.

**Kết thúc terminal:** sau khi thực thi xong và không còn modal/hành động đang chờ (`currentActionRequired === 'none'` và `pendingLanding === null` và không phải `must_raise_funds`/`bankruptcy_decision`) → **tự gọi `endTurn(state)`**.
- Việc dùng lại `endTurn` đảm bảo: đổ đôi → đi tiếp (trừ khi vừa vào tù — `endTurn` đã check `!player.inJail`); chuyển người chơi kế; reset cờ.
- Khi nối chuỗi (card → ô mới còn modal chờ): KHÔNG gọi `endTurn`, chờ `confirmLanding` lần kế.

### 4.3 Cập nhật `rollDiceAndMove` và nhánh thoát tù

- Mọi chỗ hiện đang gọi `resolveTileLanding(...)` → đổi sang `announceTileLanding(...)`.
- Nhánh **3 lần đôi → tù** (gameEngine.ts ~148-156): thay vì `goToJail` ngay, set `pendingLanding={kind:'go_to_jail'}` + modal `jail` + `currentActionRequired='go_to_jail'` để người chơi bấm xác nhận rồi mới nhảy. *(Đây là hành vi mong muốn theo nguyên tắc "thông báo trước".)*
- Nhánh **thoát tù bằng đôi → đã di chuyển** (gameEngine.ts ~139-143): sau khi `jailAction` đã di chuyển, gọi `announceTileLanding` cho ô mới (thay cho resolve).
- Nhánh **không thoát được tù** (giữ ở tù): giữ nguyên (đã set modal `jail` + có thể setDebt $50). Đây KHÔNG phải đáp ô mới nên không qua announce/confirm.

### 4.4 `clearModals` & `endTurn`
- `clearModals` thêm `state.pendingLanding = null`.
- `endTurn` (file `engine/turn.ts`) thêm dọn `state.pendingLanding = null` ở cả 2 nhánh (đi tiếp & chuyển lượt) — đồng bộ với việc nó đã dọn `activeCard`, `activeModal`, `modalPayload`.

### 4.5 Socket & events
- `realtime/events.ts`: thêm `CLIENT.CONFIRM_LANDING = 'confirm_landing'` + `interface ConfirmLandingPayload { roomCode: string }`.
- `index.ts`: thêm handler `socket.on('confirm_landing', ...)`:
  - Kiểm tra phòng + đúng lượt người chơi (giống các handler khác).
  - Gọi `confirmLanding(room.gameState)`, broadcast `game_state_update`.

---

## 5. Thiết kế frontend

### 5.1 `hooks/useSocket.ts`
- Thêm emitter `confirmLanding()` → `socket.emit('confirm_landing', { roomCode })`.
- Mirror field `pendingLanding` trong `types/game.ts` + cập nhật `ActionRequired` union nếu cần.

### 5.2 `components/InteractiveModal.tsx` (+ wiring ở `App.tsx`/`CenterStageControls.tsx`)
- Đổi các nút "Xác Nhận & Kết Thúc Lượt" của các modal **thuế / thuê / thẻ / tù(từ ô) / parking** từ gọi `onEndTurn` → gọi **`onConfirm`** (emit `confirm_landing`).
  - `modalType === 'card_info'` → nút gọi `onConfirm`.
  - `modalType === 'tax_info'` → `onConfirm`.
  - `modalType === 'rent_info'` → `onConfirm`.
  - `modalType === 'jail_info'` (khi đang chờ go_to_jail, chưa nhảy) → `onConfirm`.
  - `modalType === 'safe_info'` → giữ `onEndTurn` (ô an toàn không có pending; hoặc cũng có thể trỏ `onConfirm` vì backend xử lý pending=null → endTurn). **Quyết định: trỏ `onConfirm` cho đồng nhất một đường.**
- Thêm/điều chỉnh nhánh hiển thị cho **`go_to_jail` đang chờ**: khi `currentActionRequired === 'go_to_jail'` và người chơi **chưa** `inJail` (chưa nhảy) → hiện modal cảnh báo "Bạn sắp bị bắt vào tù" với nút Xác nhận (gọi `onConfirm`). Tránh nhầm với `safe_info` của ô 30.
  - Lưu ý: hiện `InteractiveModal` suy ra `modalType` từ state theo heuristic. Cần thêm nhánh `currentActionRequired === 'go_to_jail'` (ưu tiên cao, trước `safe_info`).
- Mua đất (`buy_or_pass`) & phá sản: giữ nguyên (`onBuy`/`onPass`/`onBankruptcy`).

### 5.3 Animation di chuyển
- Vì backend giờ đổi `position` **sau** khi xác nhận, animation nhảy quân (vốn chạy theo delta `position`) tự động diễn ra **sau** khi bấm Xác nhận — đúng yêu cầu. Không cần đổi logic animation; chỉ cần đảm bảo state mới được broadcast sau `confirm_landing`.

---

## 6. Chuỗi modal (ví dụ minh hoạ)

**A. Quỹ Cộng Đồng → thẻ goToJail (đúng bug gốc):**
1. Đáp ô 2. `announceTileLanding` rút thẻ goToJail → `activeCard` + modal Quỹ Cộng Đồng "Vào tù! Lao động công ích." Quân **vẫn ở ô 2**, `inJail=false`.
2. Người chơi bấm Xác nhận → `confirm_landing` → `applyCard` → `inJail=true`, `position=10` (quân nhảy). Terminal → `endTurn`.

**B. Cơ Hội → thẻ "Tiến tới Vịnh Hạ Long" (đất chưa ai mua):**
1. Đáp ô Cơ Hội → modal thẻ. Quân đứng yên.
2. Xác nhận → di chuyển tới ô 24 → `announceTileLanding(24)` → modal `buy_or_pass`. KHÔNG endTurn.
3. Người chơi Mua/Bỏ qua như bình thường.

**C. Đáp đất người khác:**
1. Đáp ô → modal "Sẽ trả $X tiền thuê cho Y". Tiền **chưa** trừ.
2. Xác nhận → trừ tiền → terminal → endTurn. (Nếu không đủ → modal gom tiền/phá sản.)

---

## 7. Ảnh hưởng test (quan trọng)

Các test engine hiện giả định `rollDiceAndMove`/card áp hiệu ứng **ngay**. Sau thay đổi, chúng phải gọi thêm `confirmLanding` để quan sát hiệu ứng.

- **Cần rà & cập nhật:** `gameEngine.integration.test.ts`, `turn.test.ts`, `jail.test.ts`, `jailDoubles.integration.test.ts`, `debtRouting.integration.test.ts`, `cardEngine.test.ts` (nếu test qua gameEngine), `movement.test.ts`, `bankruptcy.test.ts`, `doublesWarning.integration.test.ts`.
  - Lưu ý: test gọi trực tiếp `applyCard`/`moveBy`/`jailAction` ở tầng module **không đổi** (các hàm đó vẫn mutate như cũ). Chỉ test đi qua `rollDiceAndMove` (đường engine) mới cần thêm `confirmLanding`.
- **Test hồi quy mới (bắt buộc):** "Đáp Quỹ Cộng Đồng rút thẻ goToJail":
  - Sau `announceTileLanding` (qua `rollDiceAndMove`): `player.inJail === false`, `player.position === <ô thẻ>`, `activeCard` set, `pendingLanding.kind === 'card'`.
  - Sau `confirmLanding`: `player.inJail === true`, `player.position === 10`.
- **Test mới:** pay_rent/pay_tax không trừ tiền cho tới khi `confirmLanding`; chuỗi card→buy_or_pass; go_to_jail tile hoãn tới confirm.

> Để ép chọn thẻ xác định trong test (vì `drawAndApplyCard` rút ngẫu nhiên), cân nhắc cho phép tiêm thẻ (ví dụ tham số tuỳ chọn hoặc seed) — xem mục Rủi ro.

---

## 8. Phạm vi file thay đổi

**Backend:**
- `src/game/types.ts` — thêm `PendingLanding`, field `pendingLanding`.
- `src/game/gameEngine.ts` — `resolveTileLanding`→`announceTileLanding`; thêm `confirmLanding`; tách `drawAndApplyCard`; cập nhật `rollDiceAndMove`, `clearModals`, nhánh tù.
- `src/game/engine/turn.ts` — dọn `pendingLanding` trong `endTurn`.
- `src/realtime/events.ts` — `CONFIRM_LANDING` + payload.
- `src/index.ts` — handler `confirm_landing`.

**Frontend:**
- `src/types/game.ts` — mirror `pendingLanding`.
- `src/hooks/useSocket.ts` — emitter `confirmLanding`.
- `src/components/InteractiveModal.tsx` — đổi nút sang `onConfirm`; thêm nhánh `go_to_jail` chờ.
- `src/App.tsx` / `src/components/CenterStageControls.tsx` — nối `onConfirm` (wiring).

**Tests:** các file ở mục 7.

---

## 9. Rủi ro & Giảm thiểu

1. **Churn test lớn.** → Làm theo TDD: cập nhật/khẳng định test trước từng nhóm hành vi; chạy `npm test` ở backend sau mỗi bước.
2. **Rút thẻ ngẫu nhiên khó test xác định.** → Thêm cơ chế tiêm thẻ cho test (tham số tuỳ chọn cho `announceTileLanding`/`drawAndApplyCard`, hoặc tách bước "rút" ra hàm có thể mock). Giữ API công khai không đổi cho production.
3. **Quên một đường gọi `resolveTileLanding`.** → `grep` toàn bộ `resolveTileLanding` để đảm bảo đổi hết sang `announceTileLanding`.
4. **Double-confirm / spam nút.** → Handler `confirm_landing` chỉ chạy khi `pendingLanding !== null` (hoặc đúng `currentActionRequired`); nếu không có gì chờ thì no-op an toàn.
5. **Đồng bộ type frontend/backend.** → Mirror chính xác `PendingLanding`; build cả 2 phía.

---

## 10. Tiêu chí hoàn thành (Definition of Done)

- [ ] Đáp Quỹ Cộng Đồng/Cơ Hội: quân **đứng yên**, hiện modal thẻ; chỉ sau khi bấm Xác nhận mới áp hiệu ứng (di chuyển/vào tù/tiền).
- [ ] Đáp ô thuế/đất người khác: tiền **chỉ bị trừ sau** khi bấm Xác nhận.
- [ ] Đáp ô Vào Tù (30) và 3 lần đôi: hiện cảnh báo trước, bấm Xác nhận mới nhảy vào tù.
- [ ] Thẻ di chuyển dẫn tới ô có hành động (mua/thuê/thuế): hiện chuỗi modal đúng thứ tự.
- [ ] Mua đất & phá sản hoạt động như cũ.
- [ ] `npm test` (backend) xanh; thêm test hồi quy cho bug gốc.
- [ ] Build frontend + backend không lỗi type.
