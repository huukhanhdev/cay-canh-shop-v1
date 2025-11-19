Cây Cảnh Shop – E-commerce Web App

Website bán cây cảnh full chức năng, xây dựng bằng Node.js + Express + MongoDB + EJS, hỗ trợ giỏ hàng, thanh toán, xác thực OTP, phân quyền admin, quản lý sản phẩm và đơn hàng.

1. Công nghệ sử dụng
- Node.js + Express
- MongoDB + Mongoose
- EJS Template
- Express-session
- Nodemailer
- Passport.js
- Docker + Docker Compose
- MVC Architecture

2. Chức năng chính

2.1 Xác thực & tài khoản
- Đăng ký tài khoản bằng OTP email
- Đăng nhập / đăng xuất bằng session
- Quên mật khẩu bằng OTP
- Lưu địa chỉ giao hàng mặc định
- Guest checkout auto-create user

2.2 Giỏ hàng (Cart)
- Thêm / sửa / xóa sản phẩm
- Tính subTotal & totalPrice
- Hỗ trợ variants (màu/size/chất liệu)
- User cart nằm trong DB
- Guest cart lưu session

2.3 Thanh toán (Checkout)
- Điền thông tin giao hàng
- Save draft checkout cho guest
- Tạo đơn hàng
- Tích điểm
- Trang success

2.4 Sản phẩm
- Danh sách shop
- Chi tiết sản phẩm
- Variant handler
- Product images

2.5 Admin Dashboard
- CRUD sản phẩm
- CRUD đơn hàng
- CRUD khách hàng
- Seed dữ liệu

3. Docker
docker-compose up --build

App chạy tại: http://localhost:3000

4. Chạy không Docker
npm install
npm start

5. Seed
node helpers/seedCategories.js
node helpers/seedProducts.js
node helpers/seedPlantDetails.js
node helpers/seedPotDetails.js
node helpers/seedAdmin.js

6. Cấu trúc thư mục
controllers/
models/
routes/
views/
helpers/
middleware/
public/

Tác giả: Hữu Khánh

![Uploading image.png…]()
