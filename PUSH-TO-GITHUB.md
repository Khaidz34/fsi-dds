# Hướng Dẫn Đẩy Code Lên GitHub

## Bước 1: Kiểm Tra Trạng Thái Git

```bash
git status
```

Bạn sẽ thấy các file đã thay đổi:
- `backend/server.js` - Cập nhật soft delete logic
- `ADD-SOFT-DELETE.sql` - Migration SQL
- `SOFT-DELETE-IMPLEMENTATION.md` - Hướng dẫn

## Bước 2: Thêm Các File Vào Staging

```bash
git add backend/server.js ADD-SOFT-DELETE.sql SOFT-DELETE-IMPLEMENTATION.md PUSH-TO-GITHUB.md
```

## Bước 3: Commit

```bash
git commit -m "feat: implement soft delete for orders to preserve history

- Add deleted_at column to orders table
- Update all order queries to filter out deleted orders
- Soft delete instead of permanent deletion
- Preserve order history for audit trail
- Fix payment calculation to use only active orders"
```

## Bước 4: Push Lên GitHub

```bash
git push origin main
```

## Bước 5: Kiểm Tra Trên GitHub

1. Vào https://github.com/your-username/your-repo
2. Kiểm tra commit mới nhất
3. Xem các file đã thay đổi

## Bước 6: Deploy (Nếu Có CI/CD)

Nếu bạn có Render hoặc Vercel được kết nối với GitHub:
1. Render sẽ tự động deploy khi push
2. Kiểm tra deployment status trên Render Dashboard

## Bước 7: Chạy Migration SQL

1. Đăng nhập vào Supabase Dashboard
2. Vào SQL Editor
3. Copy nội dung từ `ADD-SOFT-DELETE.sql`
4. Paste vào SQL Editor
5. Nhấn "Run"

## Xong!

Lịch sử đơn hàng sẽ được lưu lại thay vì tự động xóa.

---

## Nếu Có Lỗi

### Lỗi: "Permission denied"
```bash
# Kiểm tra SSH key
ssh -T git@github.com

# Nếu không có, tạo SSH key mới
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### Lỗi: "Merge conflict"
```bash
# Pull latest changes
git pull origin main

# Resolve conflicts manually
# Sau đó commit lại
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

### Lỗi: "File too large"
```bash
# Xóa file lớn khỏi git history
git rm --cached backend/public/assets/*.js
git commit -m "Remove large files"
git push origin main
```
