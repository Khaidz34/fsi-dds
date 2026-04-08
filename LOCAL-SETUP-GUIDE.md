# Hướng Dẫn Chạy Local Development

## Bước 1: Khởi động Dev Server

Double-click vào file **`dev.bat`** hoặc chạy lệnh:
```bash
npm run dev
```

Chờ cho đến khi thấy:
```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
```

## Bước 2: Tạo Tài Khoản Test

Mở terminal mới (hoặc cmd mới) và double-click vào **`create-account.bat`** hoặc chạy:
```bash
node create-test-account.js
```

Bạn sẽ thấy:
```
✅ Test account created successfully!

You can now login with:
  Username: testuser
  Password: Test@123456
```

## Bước 3: Đăng Nhập và Xem Thay Đổi

1. Mở trình duyệt: `http://localhost:5173/`
2. Đăng nhập với:
   - **Username**: `testuser`
   - **Password**: `Test@123456`
3. Chỉnh sửa code trong editor
4. Giao diện sẽ tự động cập nhật (Hot Reload)

## Lưu Ý

- **Dev server** phải luôn chạy ở terminal thứ nhất
- **Không cần push git** để xem thay đổi local
- Khi chỉnh sửa file, giao diện cập nhật trong vài giây
- Nếu có lỗi TypeScript, sẽ hiển thị trong trình duyệt

## Dừng Dev Server

Nhấn `Ctrl+C` trong terminal chạy dev server

## Tạo Tài Khoản Khác

Chỉnh sửa file `create-test-account.js`:
```javascript
const testAccount = {
  username: 'your-username',
  password: 'Your@Password123',
  fullname: 'Your Full Name'
};
```

Rồi chạy lại `create-account.bat`
