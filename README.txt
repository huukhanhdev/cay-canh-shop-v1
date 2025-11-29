CÂY CẢNH SHOP - HỒ SƠ NỘP BÀI
=================================

1. TỔNG QUAN
Ứng dụng web thương mại điện tử bán cây cảnh (full-stack).
Stack: Node.js (Express 5), MongoDB (Mongoose 8), EJS, Socket.io, Passport (Local + Google), Docker Compose.

2. CHẾ ĐỘ CHẠY
A) Docker (Khuyến nghị)
---------------------------------
Yêu cầu: Cài Docker Desktop.
Lệnh chạy:
  docker compose up -d
Truy cập: http://localhost:4000
Xem log:
  docker compose logs -f web
Dừng:
  docker compose down
Reset DB:
  docker compose down -v

B) Local (Không dùng Docker)
---------------------------------
Yêu cầu: Node.js >= 18, MongoDB local.
Các bước:
  cp .env.example .env
  # Điền biến môi trường cần thiết
  npm install
  npm start
Truy cập: http://localhost:4000

3. BIẾN MÔI TRƯỜNG
Xem `.env.example` để biết đầy đủ. Đã gỡ bỏ secrets thật.
Quan trọng: Thay placeholder cho SMTP, Google OAuth, Gemini, Momo.

4. TÀI KHOẢN DEMO (ĐÃ SEED)
Admin:
  Email: admin@caycanhshop.local
  Mật khẩu: 123456
(Thêm các tài khoản demo khác nếu muốn.)

5. CHỨC NĂNG KHÁCH HÀNG
- Đăng nhập mạng xã hội (Google OAuth)
- Xem trang hồ sơ cá nhân
- Đổi mật khẩu
- Quên mật khẩu (OTP qua email)
- Quản lý nhiều địa chỉ giao hàng (nếu hoàn thiện, cần ghi rõ ở rubric)
- Xem lịch sử đơn hàng (/orders)
- Xem chi tiết đơn hàng (/orders/:id)
- Landing page (danh mục nổi bật, sản phẩm bán chạy, mới nhất)
- Danh sách sản phẩm theo danh mục (/shop)
- Phân trang, sắp xếp, lọc, tìm kiếm toàn văn
- Trang chi tiết sản phẩm (biến thể, gallery ảnh)
- Biến thể sản phẩm (trên cùng trang chi tiết)
- Tìm kiếm theo từ khóa (query param q)
- Lọc sản phẩm (giá, thương hiệu, rating, tags)
- Sắp xếp (giá, ngày tạo, số lượng bán)
- Giỏ hàng (hiển thị & cập nhật số lượng / xóa)
- Quy trình thanh toán (COD + Momo sandbox)
- Áp dụng mã giảm giá / coupon
- Gửi email thông báo sau khi đặt đơn
- Bình luận sản phẩm (real-time qua Socket.io)
- Đánh giá sao sản phẩm
- Cập nhật realtime bình luận & rating (Socket.io broadcast)
- Chương trình tích điểm (nếu chỉ ở mức placeholder, ghi PARTIAL)

6. CHỨC NĂNG ADMIN
- Quản lý sản phẩm (CRUD + biến thể + tồn kho)
- Quản lý người dùng (danh sách + hồ sơ cơ bản)
- Quản lý mã giảm giá / coupon
- Danh sách + chi tiết đơn hàng, cập nhật trạng thái
- Dashboard cơ bản (tổng quan)
- Dashboard nâng cao (API metrics, biểu đồ, xu hướng)

7. CÁC YÊU CẦU KHÁC
- UI/UX: EJS responsive cơ bản; partials `header`/`footer` tái sử dụng.
- Teamworking: Cung cấp ảnh chụp Git trong thư mục `git/`.
- Responsive: Giao diện chạy tốt trên màn hình nhỏ (ghi chú nếu còn hạn chế).
- Horizontal Scaling: Phiên làm việc stateless (có thể chuyển sang Redis). Docker sẵn sàng mở rộng theo replica.

8. CHỨC NĂNG NÂNG CAO / BONUS (LIỆT KÊ RÕ)
(Thay thế nội dung bên dưới bằng chức năng thực tế)
- Chatbot AI trợ lý sản phẩm (Gemini API)
- Luồng bình luận realtime qua Socket.io
- Script seed dữ liệu & chuẩn hóa tự động
- Script sửa ảnh sản phẩm
(Bằng chứng nằm trong thư mục BONUS/)

9. DỌN DẸP TRƯỚC KHI NỘP
Xóa hoặc loại trừ:
- node_modules (nếu nộp dạng Docker) 
- .env (giữ `.env.example` thôi)
- Cache, file tạm, `.DS_Store`
Đảm bảo bao gồm:
- Dockerfile
- docker-compose.yml
- README.txt (file này)
- BONUS/
- PROJECT_SUBMISSION_GUIDE.md
- RUBRIK_TEMPLATE.md (đã tự đánh giá)
- git/ (ảnh chụp cộng tác)
- demo.mp4 (video demo)

10. CHECKLIST TEST NHANH
[ ] Trang chủ tải thành công
[ ] Đăng nhập / Đăng xuất
[ ] Google OAuth (nếu bật)
[ ] OTP đăng ký / quên mật khẩu
[ ] Danh sách sản phẩm + tìm kiếm + phân trang
[ ] Chi tiết sản phẩm + biến thể + gallery
[ ] Thêm giỏ / cập nhật số lượng
[ ] Áp dụng coupon
[ ] Checkout COD
[ ] Checkout Momo (sandbox) -> trả về & IPN
[ ] Lịch sử đơn hàng + bảng statusHistory
[ ] Dashboard admin
[ ] CRUD sản phẩm admin
[ ] Cập nhật trạng thái đơn hàng admin
[ ] Bình luận realtime xuất hiện ở tab khác

11. VIDEO (demo.mp4) – HƯỚNG DẪN
Độ phân giải: >= 1080p
Nội dung: Trình diễn tất cả chức năng FULL (6–10 phút).
Trình tự gợi ý:
1. Luồng khách: duyệt → tìm → lọc → chi tiết → giỏ → thanh toán → theo dõi đơn.
2. Bình luận & rating realtime (2 trình duyệt).
3. OTP (nếu đủ thời gian).
4. Admin: dashboard + sản phẩm/đơn/coupon.
5. Bonus: chatbot, script, ...
Âm thanh: Rõ ràng, không giải thích lý thuyết dài dòng.

12. THÔNG TIN NHÓM
Thành viên:
- <MSSV1> - <Họ Tên 1>
- <MSSV2> - <Họ Tên 2>
(Thêm nếu có)
URL Deploy (nếu có): <URL hoặc N/A>

13. GHI CHÚ CHO GIẢNG VIÊN
- API ngoài (Gemini, Google) có thể rate-limit → có video minh họa.
- Cổng thanh toán dùng sandbox test.
- Tích điểm / địa chỉ giao hàng: đánh dấu PARTIAL nếu chưa hoàn chỉnh.

KẾT THÚC README.txt
