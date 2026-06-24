# Game Cờ Tỷ Phú Online Realtime (MVP)

Dự án này là một game Cờ Tỷ Phú (Monopoly) trực tuyến chạy trên web, chơi được từ 2 đến 6 người thông qua mã phòng thời gian thực (realtime).

## Công Nghệ Sử Dụng

- **Backend**: Node.js, Express, Socket.IO, TypeScript.
- **Frontend**: React (TypeScript), Vite, TailwindCSS (v3), Lucide React.
- **Lưu Trữ**: Trạng thái game lưu trực tiếp trong RAM của server (In-Memory), không cần cài đặt Database.

---

## Hướng Dẫn Khởi Chạy Dự Án

Bạn cần cài đặt sẵn **Node.js** (Khuyến nghị phiên bản v18 trở lên).

### Bước 1: Chạy Server (Backend)

1. Mở terminal và di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy server ở chế độ phát triển (Dev Mode):
   ```bash
   npm run dev
   ```
   *Mặc định server sẽ chạy tại địa chỉ: `http://localhost:5000`.*

---

### Bước 2: Chạy Ứng Dụng (Frontend)

1. Mở một terminal mới và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng client ở chế độ phát triển (Dev Mode):
   ```bash
   npm run dev
   ```
4. Truy cập trình duyệt theo liên kết hiển thị trên terminal (thông thường là `http://localhost:5173`).

---

## Cách Chơi Trải Nghiệm (Test Multiplayer Local)

1. Mở 2 hoặc nhiều tab trình duyệt (có thể mở tab ẩn danh) trỏ vào đường link `http://localhost:5173`.
2. Ở tab thứ nhất: Nhập tên hiển thị (Ví dụ: `HostPlayer`) và bấm **Tạo Phòng**. Bạn sẽ nhận được một **Mã phòng** (Ví dụ: `ABCD`).
3. Ở tab thứ hai: Nhập tên hiển thị khác (Ví dụ: `GuestPlayer`), điền mã phòng `ABCD` đã nhận vào ô mã phòng và bấm **Tham Gia**.
4. Quay lại tab thứ nhất (Chủ phòng), bạn sẽ thấy danh sách người chơi tăng lên. Nhấp vào nút **Bắt Đầu Trận Đấu** để cùng chơi.
5. Thực hiện tung xúc xắc và chơi theo lượt.

Chúc các bạn có những giây phút chơi game vui vẻ!
