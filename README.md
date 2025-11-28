## Cây Cảnh Shop – E-commerce Web App

Website bán cây cảnh full chức năng, xây dựng bằng Node.js + Express + MongoDB + EJS. Hỗ trợ giỏ hàng, thanh toán guest/đăng nhập, OTP email, quản trị sản phẩm/đơn hàng, dashboard thống kê, phân trang/lọc/sắp xếp, bình luận và đánh giá realtime (websocket).

### 1) Công nghệ
- Node.js (Express) + EJS
- MongoDB (Mongoose)
- Session (connect-mongo)
- OTP mail (Nodemailer)
- OAuth Google (Passport)
- Socket.io (realtime)
- Docker + Docker Compose

### 2) Tính năng chính (tóm tắt)
- Xác thực: Đăng ký OTP → đặt mật khẩu, đăng nhập/đăng xuất, quên mật khẩu OTP, đăng nhập Google (tùy biến env).
- Tài khoản: Cập nhật hồ sơ, đổi mật khẩu, quản lý nhiều địa chỉ giao hàng, đặt mặc định.
- Cửa hàng: Danh mục sản phẩm có phân trang, sắp xếp (>= 4 tiêu chí), tìm kiếm toàn văn, lọc theo brand/giá/rating/tags.
- Chi tiết sản phẩm: Mô tả, 3+ ảnh, biến thể (variants) với tồn kho riêng, bình luận (không cần login), đánh giá sao (cần login), realtime update.
- Giỏ hàng + Thanh toán: Thêm/sửa/xóa, tính tổng, dùng coupon, điểm thưởng; guest checkout tự tạo user và lưu đơn.
- Quản trị: Dashboard đơn giản + nâng cao (API + charts), quản lý Sản phẩm/Đơn hàng/Khách/Coupon/Bình luận; đơn hàng có lọc phạm vi thời gian + phân trang; trừ/hoàn kho theo biến thể.

---

## 3) Chạy bằng Docker Compose (khuyến nghị khi nộp bài)

Yêu cầu: Đã cài Docker Desktop (hoặc Docker Engine + Compose v2).

1-lệnh khởi chạy (tự cài dependencies trong image):

```zsh
docker compose up -d
```

Truy cập: `http://localhost:4000`

- Admin (đã seed):
	- Email: `admin@caycanhshop.local`
	- Mật khẩu: `123456`

Lệnh hữu ích:

```zsh
# xem trạng thái
docker compose ps

# xem log ứng dụng
docker compose logs -f web

# dừng containers
docker compose down

# dừng & xóa volumes (reset DB)
docker compose down -v
```

Ghi chú:
- File `docker-compose.yml` đã tách `web` (Node) và `mongo` (database). `Dockerfile` đã `RUN npm install` nên không cần `npm install` thủ công.
- Biến môi trường dùng `env_file: .env.docker`. Bạn có thể chỉnh sửa email SMTP/OAuth cho demo của riêng bạn.
- Thư mục `public/uploads` được bind mount để giữ ảnh upload khi rebuild.

### 3.1) Cấu hình môi trường (`.env.docker`)
Ví dụ (đã sẵn trong repo, chỉ dành cho demo nội bộ):

```
PORT=4000
MONGODB_URI=mongodb://mongo:27017/caycanhshop
SESSION_SECRET=supersecret
APP_BASE_URL=http://localhost:4000

# SMTP Gmail (App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="\"Cây Cảnh Shop\" <you@gmail.com>"

# Google OAuth (tùy chọn)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

Lưu ý bảo mật: Không nên commit secrets thật vào repo public. Với bài nộp, nếu cần demo OTP/Google, bạn có thể cung cấp tệp `.env.docker` riêng tư cho giảng viên, hoặc dùng giá trị demo rồi thu hồi sau.

---

## 4) Chạy không Docker (tùy chọn)

```zsh
npm install
npm start
```

Mặc định app chạy `http://localhost:4000`. Cần MongoDB local, hoặc chỉnh `MONGODB_URI` phù hợp.

---

## 5) Seed dữ liệu

- Ứng dụng đã tự động seed trong `app.js` (gọi `helpers/seedData.js` và các seed liên quan) khi kết nối DB lần đầu, gồm: danh mục, sản phẩm (kèm variants), dữ liệu chi tiết, admin mặc định.
- Nếu muốn seed thủ công: tham khảo các file trong `helpers/`.

---

## 6) Cấu trúc thư mục (rút gọn)

```
controllers/
	admin/
config/
helpers/
middleware/
models/
public/
routes/
services/
utils/
views/
```

---

## 7) Checklist tự kiểm trước khi nộp

- Docker Compose khởi chạy OK bằng 1 lệnh: `docker compose up -d`.
- Truy cập trang chủ OK, duyệt Shop có phân trang/sort/filter; chi tiết sản phẩm có ảnh/variants/mô tả; thêm giỏ hàng và checkout guest thành công.
- Đăng nhập admin (tài khoản seed), kiểm tra Dashboard, Orders (lọc thời gian + phân trang), Products (phân trang + tìm kiếm + lọc/sắp xếp), Coupons, Comments.
- Gửi OTP email (nếu cấu hình SMTP), đăng nhập Google (nếu cấu hình OAuth).

---

## 8) Nộp Bài – Bạn cần nộp gì?

**Chọn 1 trong 2 phương án theo yêu cầu đề bài:**

---

### Phương án 1: Public Hosting (Heroku/Vercel/AWS/Netlify/...)

**Nộp các thông tin sau:**

1. **URL public** của website đã deploy (ví dụ: `https://cay-canh-shop.herokuapp.com`)
2. **Tài khoản Admin** để giảng viên đăng nhập chấm điểm:
   - Email: `admin@caycanhshop.local` (hoặc tài khoản bạn tạo)
   - Mật khẩu: `123456` (hoặc mật khẩu bạn đặt)
3. **Ghi chú** (nếu cần):
   - Hướng dẫn truy cập trang quản trị (ví dụ: `/admin/dashboard`)
   - Các chức năng đặc biệt cần lưu ý khi chấm
   - Thông tin môi trường nếu có (database, email SMTP đã cấu hình, ...)

**File đính kèm:**
- Link repo GitHub (public hoặc private - cấp quyền cho giảng viên)
- Hoặc file nén source code (.zip) với đầy đủ: `controllers/`, `models/`, `routes/`, `views/`, `package.json`, etc.

---

### Phương án 2: Docker Compose (không deploy public) ⭐ KHUYẾN NGHỊ

**Nộp các thành phần sau:**

#### A. Mã nguồn đầy đủ
Chọn 1 trong 2 cách:
- **Link repo GitHub** (public hoặc private - cấp quyền cho giảng viên):
  - Đảm bảo có đầy đủ `docker-compose.yml`, `Dockerfile`, `.env.docker`, `README.md`
- **File nén (.zip hoặc .tar.gz)** chứa toàn bộ source code, bao gồm:
  ```
  cay-canh-shop/
  ├── app.js
  ├── package.json
  ├── docker-compose.yml
  ├── Dockerfile
  ├── .env.docker           ← Quan trọng!
  ├── README.md             ← File này
  ├── controllers/
  ├── models/
  ├── routes/
  ├── views/
  ├── helpers/
  ├── middleware/
  ├── services/
  ├── utils/
  ├── public/
  └── config/
  ```

#### B. File `.env.docker` (Quan trọng!)
- **Nếu repo public**: Gửi riêng file `.env.docker` cho giảng viên qua email/LMS (không commit secrets thật vào repo).
- **Nếu repo private hoặc file nén**: Đính kèm `.env.docker` đầy đủ trong source code.
- Đảm bảo `.env.docker` có các biến:
  ```
  PORT=4000
  MONGODB_URI=mongodb://mongo:27017/caycanhshop
  SESSION_SECRET=supersecret
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=...
  SMTP_PASS=...
  GOOGLE_CLIENT_ID=...       (tùy chọn)
  GOOGLE_CLIENT_SECRET=...   (tùy chọn)
  ```

#### C. Tài khoản Admin (đã seed sẵn)
Cung cấp thông tin đăng nhập admin:
- **Email**: `admin@caycanhshop.local`
- **Mật khẩu**: `123456`

#### D. Hướng dẫn chạy 1 lệnh
Trong README (file này) hoặc file riêng `SETUP.md`, ghi rõ:

```zsh
# Từ thư mục gốc project
docker compose up -d
```

Truy cập: `http://localhost:4000`

#### E. Checklist tự kiểm (đính kèm)
Bạn có thể copy mục **"7) Checklist tự kiểm"** ở trên vào file `CHECKLIST.md` hoặc ghi ngay trong README này để giảng viên biết bạn đã test kỹ.

---

### Tóm tắt nhanh - Checklist nộp bài Docker Compose

- [ ] Source code đầy đủ (repo/zip) có `docker-compose.yml`, `Dockerfile`, `.env.docker`
- [ ] File `.env.docker` hoạt động (đã test chạy Docker thành công)
- [ ] Tài khoản admin: `admin@caycanhshop.local` / `123456`
- [ ] README.md có hướng dẫn rõ ràng: `docker compose up -d`
- [ ] Đã chạy thử và kiểm tra:
  - Trang chủ OK
  - Shop có phân trang/lọc/sắp xếp
  - Checkout guest thành công
  - Đăng nhập admin OK
  - Dashboard, Orders, Products hoạt động
- [ ] Không commit secrets thật vào repo public (hoặc thu hồi sau khi chấm điểm)

---

### Lưu ý quan trọng
- **Giảng viên sẽ chạy**: `docker compose up -d` và không chạy thêm lệnh nào khác như `npm install`.
- Đảm bảo `Dockerfile` đã có `RUN npm install` (đã có sẵn).
- Test trước khi nộp bằng cách xóa containers cũ (`docker compose down -v`) và chạy lại từ đầu.

---

## 9) Khắc phục sự cố nhanh

- Port 4000 bận: sửa `PORT` trong `.env.docker` và ánh xạ port trong `docker-compose.yml`.
- Không nhận email OTP: kiểm tra `SMTP_*` và dùng App Password Gmail.
- Ảnh upload mất khi rebuild: đảm bảo bind mount `./public/uploads:/app/public/uploads` còn nguyên.


