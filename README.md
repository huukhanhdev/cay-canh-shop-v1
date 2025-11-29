## Cây Cảnh Shop – Hướng dẫn nhanh (Docker)

Ứng dụng chạy bằng Docker Compose. Tài liệu này chỉ nêu phần cần thiết để vận hành.

### 1. Yêu cầu
- Docker & Docker Compose
- Không cần cài Node/Mongo trên máy

### 2. Chức năng chính
- Duyệt sản phẩm, giỏ hàng, thanh toán COD + Momo (sandbox)
- Bình luận & đánh giá realtime
- Quản trị sản phẩm/đơn hàng/coupon, dashboard

### 3. Tài khoản mặc định
Admin: `admin@caycanhshop.local` / `123456`

### 4. Khởi chạy
```zsh
docker compose up -d
```
Mở `http://localhost:4000`

### 5. Seed dữ liệu
- Tự động khi app kết nối Mongo lần đầu (`helpers/seedData.js`).
- Seed lại: `docker compose down -v && docker compose up -d`.

### 6. Lệnh thường dùng
```zsh
docker compose logs -f web    # xem log
docker compose restart web    # khởi động lại
docker compose down           # dừng
docker compose down -v        # dừng & xoá DB
```

### 7. Đăng nhập
- Admin: sử dụng tài khoản mặc định ở mục 3.
- OTP email: cần cấu hình SMTP (xem mục 8). Nếu không dùng OTP: tạo user rồi đặt `isVerified=true` trong DB.

### 8. Biến môi trường (.env.docker)
```env
PORT=4000
MONGODB_URI=mongodb://mongo:27017/caycanhshop
SESSION_SECRET=supersecret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...        # App Password
SMTP_PASS=...
MAIL_FROM="\"Cây Cảnh Shop\" <you@gmail.com>"
GOOGLE_CLIENT_ID=...      # (tùy chọn)
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:4000/payment/momo/return
MOMO_IPN_URL=http://localhost:4000/payment/momo/ipn
```

### 9. Ghi chú
- Google OAuth: để trống `GOOGLE_CLIENT_ID/SECRET` nếu không dùng.
- Momo sandbox: kiểm tra đúng keys và thời gian hệ thống nếu lỗi signature.
- Không commit secrets thật. Dùng `.env.example` làm mẫu.

### 10. Hỗ trợ
Nếu cần thêm hướng dẫn chi tiết cho Docker, xem `DOCKER.md`.

### 11. Liên hệ
Điền thông tin nhóm và URL deploy (nếu có) bên dưới.

### 12. Thông tin nhóm (điền khi nộp)
- MSSV1 – Họ Tên 1
- MSSV2 – Họ Tên 2
URL deploy (nếu có): <...>

### 13. Thông tin nhóm (điền khi nộp)
- MSSV1 – Họ Tên 1
- MSSV2 – Họ Tên 2
URL deploy (nếu có): <...>

### 14. Bảo mật
Không commit secrets thật. Dùng sandbox cho Momo. Gmail dùng App Password.

### 13. Lệnh hỗ trợ (tuỳ chọn)
```zsh
docker compose exec web sh     # vào container web
docker compose logs -f mongo   # xem log Mongo
```



