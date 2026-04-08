# Dự án NestJS - IT4788

Đây là dự án NestJS mẫu đã được thiết lập sẵn các thành phần cơ bản Middleware, Guard, Pipe, Interceptor và cấu hình kết nối cơ sở dữ liệu MySQL bằng TypeORM.

## Yêu cầu hệ thống

- Node.js (phiên bản khuyến nghị: >= 18)
- Docker và Docker Compose

## Hướng dẫn cài đặt và khởi chạy

### 1. Cài đặt thư viện

Chạy lệnh sau tại thư mục gốc của dự án (`d:/laptrinh/IT4788`) để cài đặt tất cả các gói phụ thuộc (bao gồm NestJS, TypeORM, MySQL,...):

```bash
npm install
```

### 2. Thiết lập Biến môi trường

Dự án sử dụng file `.env` để lưu trữ các thông tin bảo mật và cấu hình môi trường. Hãy đảm bảo file `.env` đã tồn tại ở thư mục gốc với nội dung tương tự với file `.env.example`.

### 3. Chạy MySQL bằng Docker

Dự án đã đính kèm sẵn `docker-compose.yml`. Để khởi chạy MySQL Server độc lập ở dưới nền, hãy gõ lệnh:

```bash
docker-compose up -d
```

> **Lưu ý**: Lần đầu tiên chạy lệnh này docker sẽ mất một lúc để kéo image `mysql:8.0` về máy.

Để dừng cơ sở dữ liệu, bạn có thể chạy:

```bash
docker-compose down
```

### 4. Khởi tạo Database (TypeORM Migrations)

Dự án **không** dùng cơ chế `synchronize: true` tự động của TypeORM để an toàn hơn cho dữ liệu. Thay vào đó, chúng ta sẽ dùng Migrations để đồng bộ các cấu trúc Entities vào Database.

Sau khi Docker MySQL đã chạy lên thành công, hãy thực thi các lệnh sau:

- **Sinh ra file Migration mới khi bạn thay đổi các lớp cấu trúc/Entity**:

  ```bash
  npm run migration:generate
  ```

- **Chạy toàn bộ file Migration hiện có (Áp dụng Schema vào CSDL)**:

  ```bash
  npm run migration:run
  ```

- **Cách reset toàn bộ database về trạng thái trống**:
  Xóa sạch toàn bộ bảng trong db:
  ```bash
  npm run migration:drop
  ```
  Dọn dẹp thư mục migrations: xóa hết các file trong folder migrations đi

### 5. Chạy ứng dụng NestJS

Sau khi cài đặt thư viện và khởi tạo xong Database thì bạn có thể mở web-server NestJS lên để giao tiếp:

- Khởi chạy ở chế độ Development (Tự động Restart khi code thay đổi):
  ```bash
  npm run start:dev
  ```

Khởi động dự án thành công, hãy truy cập vào `http://localhost:8000` để bắt đầu!
