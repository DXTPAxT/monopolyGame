# Thiết kế: Giao diện điện thoại (Mobile UI) — Cờ Tỷ Phú 3D

> Spec cho **T4.4 Responsive/mobile** trong `docs/PROGRESS.md`.
> Ngày: 2026-07-02. Viết chi tiết để agent bất kỳ (kể cả model nhỏ) thực hiện được từng bước.

## 1. Mục tiêu & phạm vi

Làm cho toàn bộ game chơi được tốt trên **điện thoại** (dọc là chính, có hỗ trợ ngang), **không phá vỡ layout desktop hiện tại**.

**Trong phạm vi:**
- Màn chơi game: bàn cờ 3D + HUD + panel phụ + modal.
- Sảnh chờ (Lobby): tạo/vào phòng, chọn quân, cấu hình phòng, chat.
- Modal phụ: WinnerModal, HelpButton, toast lỗi.
- Hỗ trợ cả xoay ngang (landscape).

**Ngoài phạm vi (KHÔNG làm lần này):**
- Không viết lại engine, socket, hay logic game.
- Không đổi luật chơi.
- Không làm bản 2D thay bàn 3D (đã chốt giữ 3D).
- Không tách thành app mobile riêng (giữ một codebase responsive).

## 2. Quyết định đã chốt (từ brainstorming)

| Vấn đề | Quyết định |
|---|---|
| Bàn cờ trên mobile | **Giữ bàn 3D**, camera tự thích ứng màn hình dọc; bật vuốt/pinch xoay. |
| HUD / nút / modal | Trên mobile **kéo ra khỏi mặt bàn**, render DOM dạng **bottom-sheet dính đáy**. Desktop giữ HUD-trên-bàn như cũ. |
| 3 panel phụ (Người chơi / Tài sản / Chat) | **Thanh tab đáy + drawer trượt lên**. Bàn cờ luôn chiếm toàn màn. |
| Phát hiện mobile | **Hook `useViewport()` (matchMedia) + class Tailwind `md:`**. Không tách component `<MobileApp>` riêng. |
| Breakpoint | Mobile = chiều rộng `< 768px` (điểm `md` mặc định của Tailwind). |

## 3. Kiến trúc

Một codebase, responsive. Nguồn sự thật cho JavaScript là hook `useViewport()`. Layout DOM thuần dùng class `md:` của Tailwind. Chỉ những chỗ CSS không với tới (camera 3D, chọn nơi render HUD) mới đọc từ hook.

**Nguyên tắc bất biến:** nhánh desktop (≥768px) phải cho ra kết quả **y hệt hiện tại**. Mọi thay đổi mobile nằm sau điều kiện `isMobile` hoặc class `max-md:` / block `md:hidden`.

### Sơ đồ luồng render (gameplay)

```
App.tsx
 ├─ useViewport() → { isMobile, isPortrait }
 ├─ Header (mảnh hơn trên mobile)
 ├─ <Board>  ← luôn full-screen trên mobile
 │    ├─ <GameBoard3D>
 │    │    ├─ <ResponsiveCamera>  ← đọc size viewport, đặt camera
 │    │    └─ <Html> HUD-trên-bàn   ← CHỈ render khi !isMobile
 │    └─ (mobile) HUD DOM đè trên Canvas: <MobileActionSheet>
 ├─ (desktop) Sidebar 260px: PlayerList + PortfolioPanel + ChatPanel   ← md:flex, max-md:hidden
 └─ (mobile) <MobileNavBar> + <BottomSheet> chứa panel   ← md:hidden
```

## 4. Thành phần & thay đổi từng file

### 4.1. MỚI — `frontend/src/hooks/useViewport.ts`
Hook trả `{ width, isMobile, isPortrait, isLandscape }`.
- Dùng `window.matchMedia('(max-width: 767px)')` cho `isMobile` và `'(orientation: portrait)'` cho `isPortrait`.
- Đăng ký listener trong `useEffect`, **cleanup** khi unmount (dùng `addEventListener('change', …)` / `removeEventListener`).
- Giá trị khởi tạo an toàn khi `window` chưa có (mặc định desktop: `isMobile=false, isPortrait=false`) để không vỡ khi test.
- Có unit test `useViewport.test.ts` (vitest): mock `matchMedia`, kiểm tra flag đổi đúng.

### 4.2. MỚI — `frontend/src/components/mobile/BottomSheet.tsx`
Primitive tấm trượt lên, tái dùng cho cả modal HUD lẫn drawer panel.
- Props: `open: boolean`, `onClose: () => void`, `title?: string`, `children`, `heightMode?: 'auto' | 'full'`.
- Backdrop mờ (bấm ra ngoài để đóng), tấm trượt từ đáy lên (`translate-y` + transition).
- Có "grabber" (thanh kéo) trên đỉnh; kéo xuống quá ngưỡng → gọi `onClose`.
- Đóng bằng phím `Escape`; `role="dialog"` + `aria-modal="true"` (khớp chuẩn a11y sẵn có của dự án).
- Padding đáy tôn trọng tai thỏ: `pb-[env(safe-area-inset-bottom)]`.
- Khoá cuộn nền khi mở (thêm/xoá class `overflow-hidden` trên `document.body`).

### 4.3. MỚI — `frontend/src/components/mobile/MobileNavBar.tsx`
Thanh tab dính đáy (chỉ hiện trên mobile), gồm 3 nút: **Người chơi**, **Tài sản**, **Chat** (icon + nhãn ngắn). Có thể thêm badge (ví dụ số chat chưa đọc — tùy chọn, không bắt buộc lần này).
- Props: `active: 'players' | 'portfolio' | 'chat' | null`, `onOpen: (tab) => void`.
- `md:hidden`; `pb-[env(safe-area-inset-bottom)]`; tap target ≥ 44px.

### 4.4. MỚI — `frontend/src/components/mobile/MobileActionSheet.tsx`
Phiên bản DOM của HUD (badge xúc xắc + `CenterStageControls` + log + modal center-stage) cho mobile, dính đáy, đè trên Canvas.
- Nhận đúng dữ liệu mà `hudContent` đang dùng trong `Board.tsx` (dice, controls, modal payload…).
- Để **không nhân đôi** JSX modal, tách logic dựng modal/controls hiện có ở `Board.tsx` thành hàm/thành phần dùng chung có tham số `variant: 'board' | 'sheet'` (xem 4.5). `MobileActionSheet` gọi cùng renderer với `variant='sheet'`.
- Nút to (≥44px), chữ lớn hơn desktop.

### 4.5. SỬA — `frontend/src/components/Board.tsx`
- Tách phần dựng HUD hiện tại (`hudContent`, `renderCenterStageModal`) sao cho render được ở **2 nơi**: trong 3D (desktop) hoặc DOM đáy (mobile). Cách gọn nhất: giữ nguyên hàm dựng, thêm tham số `variant` chỉ để tinh chỉnh kích thước/khoảng cách (desktop nhỏ gọn như cũ; mobile chữ/nút to hơn).
- Đọc `useViewport()`:
  - `!isMobile`: truyền `hudContent` vào `GameBoard3D` như hiện tại → HUD render trên mặt bàn. **Không đổi hành vi desktop.**
  - `isMobile`: **không** truyền HUD-trên-bàn (truyền `null`/cờ tắt); thay vào đó render `<MobileActionSheet>` như sibling **đè trên** `<GameBoard3D>` trong cùng container.
- Mọi timer/animation xúc xắc, `visualPositions`, `onAnimationStatusChange`… **giữ nguyên**.

### 4.6. SỬA — `frontend/src/components/scene3d/GameBoard3D.tsx`
- Thêm component con `<ResponsiveCamera>` đặt **bên trong** `<Canvas>`:
  - Dùng `useThree()` lấy `size` (width/height) và `camera`.
  - Trong `useEffect` theo `[size.width, size.height]`: nếu khung **cao hơn rộng** (portrait) → đặt camera xa hơn (ví dụ z lớn hơn) và/hoặc tăng `fov`, nghiêng gần top-down để bàn 11 đơn vị vừa bề ngang; nếu landscape/rộng → giữ `[0,10,12] fov 50` như hiện tại. Gọi `camera.updateProjectionMatrix()`.
  - **Không** hard-code trong prop `camera` của `<Canvas>` nữa nếu cần điều chỉnh động; hoặc giữ prop mặc định rồi override trong effect. (Giữ giá trị desktop y như cũ.)
- `<OrbitControls>`: giữ `enableDamping`; đảm bảo cảm ứng hoạt động (mặc định react-three đã hỗ trợ touch). Cân nhắc `minDistance/maxDistance` rộng hơn chút cho mobile để pinch-zoom thoải mái. **Giữ giới hạn cũ cho desktop.**
- HUD `<Html transform>`: chỉ render khi có `hudContent` (Board sẽ truyền `null` trên mobile) → thêm guard `{hudContent && (<Html …>{hudContent}</Html>)}`.

### 4.7. SỬA — `frontend/src/App.tsx`
- Gọi `useViewport()`.
- Nhánh gameplay:
  - Container chính: mobile → bàn chiếm toàn bộ (`flex-1`), **ẩn** sidebar 260px (`max-md:hidden` hoặc render có điều kiện). Desktop giữ `md:w-[260px]` như cũ.
  - Thêm (mobile) `<MobileNavBar>` + state `openPanel` + `<BottomSheet>` bọc panel tương ứng:
    - `players` → `<PlayerList …>` (props y hệt sidebar).
    - `portfolio` → `<PortfolioPanel …>`.
    - `chat` → `<ChatPanel …>`.
  - Header: trên mobile giảm chiều cao/padding, rút gọn nhãn nếu chật (`text` nhỏ hơn, ẩn chữ "Phòng:" giữ mã).
- Nút "Thoát ra Sảnh": trên mobile chuyển vào drawer (ví dụ cuối drawer Người chơi) hoặc header để không chiếm chỗ đáy.

### 4.8. SỬA — `frontend/src/components/GameLobby.tsx`
- Xếp **1 cột dọc** trên mobile (các khối chọn quân / cấu hình phòng / chat sảnh stack; desktop giữ layout hiện tại).
- Lưới chọn quân (8 quân): `grid-cols-4 max-md:grid-cols-4` hoặc `grid-cols-2` cho vừa; ô chọn quân tap target ≥44px.
- Input tên/mã phòng: `text-base` (≥16px) để iOS **không auto-zoom** khi focus.
- Toàn màn cuộn được (`overflow-y-auto`) đã có ở App; đảm bảo không tràn ngang.

### 4.9. SỬA — modal phụ
- `WinnerModal.tsx`: `max-w` co theo màn, padding nhỏ hơn trên mobile, cuộn được nếu bảng xếp hạng dài; nút ≥44px; `p-[env(safe-area-inset-*)]`.
- `HelpButton.tsx` / help modal: full-width trên mobile, đóng bằng Escape (đã có), cuộn nội dung.
- Toast lỗi (trong `App.tsx`): trên mobile đặt `top` dưới header, `max-w` vừa màn, tránh đè nút đáy.

### 4.10. SỬA — CSS nền (`index.css` / `App.css`)
- Thêm `touch-action: manipulation` để tránh double-tap-zoom cho vùng bấm.
- Đảm bảo `100dvh` (dynamic viewport height) thay `100vh` ở container gốc để không bị thanh địa chỉ trình duyệt che (ví dụ `h-screen` → cân nhắc `h-[100dvh]`).
- Không thêm meta viewport nếu `index.html` đã có `width=device-width, initial-scale=1`; nếu chưa, thêm.

## 5. Landscape (xoay ngang)

Quyết theo `isPortrait`, **không chỉ theo width**:
- Điện thoại landscape thường **đủ rộng (≥768px)** → tự rơi vào nhánh desktop (bàn giữa + sidebar). Ổn, không cần xử lý thêm nhiều.
- Nếu landscape mà vẫn `<768px` (máy nhỏ) → dùng nhánh mobile (bàn + nav đáy + drawer); camera dùng cấu hình "rộng" (giống desktop) vì khung ngang.
- Kiểm tra không có gì tràn/khuất khi xoay; safe-area hai bên (tai thỏ ngang) nếu cần `pl/pr-[env(safe-area-inset-left/right)]`.

## 6. A11y & chạm

- Tap target tối thiểu 44×44px cho mọi nút mobile.
- Giữ chuẩn a11y sẵn có: `aria-label`, `role="dialog"`/`aria-modal`, đóng Escape cho mọi sheet/drawer/modal mới.
- Input `font-size ≥ 16px` để iOS không auto-zoom.
- `safe-area-inset` cho nav đáy và sheet.

## 7. Kiểm thử & nghiệm thu

**Bắt buộc xanh:**
- `cd frontend && npx tsc -b` → exit 0.
- `cd frontend && npx vite build` → exit 0.
- `npx vitest run` → mọi test cũ vẫn xanh + test mới `useViewport` xanh.

**Test tay (Chrome DevTools → Device toolbar):**
- iPhone (ví dụ iPhone 12/14) dọc & ngang; một Android (Pixel) dọc & ngang.
- Kịch bản: vào sảnh → chọn quân → tạo/vào phòng → bắt đầu → đổ xúc xắc → mua đất → trả thuê → rút thẻ → mở từng drawer (Người chơi/Tài sản/Chat) → gửi chat → mở BuildModal khi đáp đất mình → màn thắng.
- Xác nhận: bàn 3D vừa khít không tràn ngang; nút đáy bấm được 1 tay; không có phần tử bị tai thỏ che; desktop (≥768px) **không đổi** so với trước.

**Nghiệm thu định tính:** desktop pixel-parity với hiện tại; mobile mọi hành động chạm tới được không cần zoom.

## 8. Rủi ro & lưu ý

- **HUD-trên-bàn dùng `<Html transform>`**: khi tách render cho mobile, cẩn thận không phá đường đi dữ liệu (dice/modal payload) — giữ cùng một renderer, chỉ đổi `variant` và nơi mount.
- **Camera**: đừng hard-code đè lên desktop; chỉ đổi khi portrait. Test kỹ landscape ↔ portrait chuyển qua lại.
- **`100dvh`**: kiểm tra hỗ trợ trình duyệt; fallback `100vh` chấp nhận được.
- Giữ `frameloop="demand"` / tối ưu perf 3D đã có (T4.6) — không vô tình bật lại render 60fps liên tục.

## 9. Thứ tự thực hiện đề xuất (cho plan)

1. `useViewport` hook (+ test) — nền tảng, không phụ thuộc gì.
2. `BottomSheet` primitive (+ dùng thử độc lập).
3. `MobileNavBar` + nối drawer panel trong `App.tsx` (tái dùng PlayerList/Portfolio/Chat).
4. `ResponsiveCamera` trong `GameBoard3D`.
5. Tách renderer HUD trong `Board.tsx` + `MobileActionSheet` (đè đáy trên mobile), guard `<Html>`.
6. Lobby responsive.
7. Modal phụ + CSS nền (dvh, safe-area, touch-action).
8. Landscape pass + kiểm thử tay + verify build/test.

Mỗi bước tự verify `tsc -b` + `vite build` trước khi sang bước sau.
