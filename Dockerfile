# 1. Chọn base image Node
FROM node:18-alpine

# 2. Tạo thư mục làm việc trong container
WORKDIR /app

# 3. Copy package.json và package-lock.json (nếu có) trước để tối ưu cache
COPY package*.json ./

# 4. Cài dependencies
RUN npm install

# 5. Copy toàn bộ source code vào container
COPY . .

# 6. Expose cổng server (ví dụ anh dùng PORT=4000)
EXPOSE 4000

# 7. Lệnh chạy app (chạy phiên bản production, không nodemon)
CMD ["node", "app.js"]
