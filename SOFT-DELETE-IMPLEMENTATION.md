# Soft Delete Implementation - Lưu Lịch Sử Đơn Hàng

## Tổng Quan
Thay vì xóa vĩnh viễn các đơn hàng, hệ thống sẽ sử dụng **soft delete** - đánh dấu đơn hàng là đã xóa nhưng vẫn lưu lịch sử.

## Các Thay Đổi

### 1. Database Schema
- Thêm cột `deleted_at` vào bảng `orders`
- Tạo index để tối ưu hóa query

**File SQL**: `ADD-SOFT-DELETE.sql`

### 2. Backend Logic
- Thay đổi endpoint `/api/orders/:id` (DELETE) - thay vì xóa vĩnh viễn, cập nhật `deleted_at`
- Cập nhật tất cả các query lấy orders - thêm điều kiện `deleted_at IS NULL`
- Các query được cập nhật:
  - `/api/orders/today` - lấy đơn hàng hôm nay
  - `/api/orders/my` - lấy đơn hàng của user
  - `/api/payments` - tính toán thanh toán
  - `/api/stats/dashboard` - thống kê dashboard
  - `/api/orders/weekly-stats` - thống kê tuần

**File**: `backend/server.js`

### 3. Hành Động Cần Thực Hiện

#### Bước 1: Chạy Migration SQL
1. Đăng nhập vào Supabase Dashboard
2. Vào SQL Editor
3. Copy toàn bộ nội dung từ file `ADD-SOFT-DELETE.sql`
4. Paste vào SQL Editor
5. Nhấn "Run"

#### Bước 2: Deploy Backend
```bash
# Commit changes
git add backend/server.js ADD-SOFT-DELETE.sql SOFT-DELETE-IMPLEMENTATION.md

git commit -m "feat: implement soft delete for orders to preserve history"

# Push to GitHub
git push origin main

# Deploy to Render (nếu có CI/CD)
# Hoặc deploy thủ công
```

#### Bước 3: Kiểm Tra
1. Đăng nhập vào admin account
2. Tạo một đơn hàng test
3. Xóa đơn hàng đó
4. Kiểm tra:
   - Đơn hàng không hiển thị trong danh sách
   - Lịch sử thanh toán vẫn được cập nhật đúng
   - Số nợ được tính toán chính xác

## Lợi Ích

✅ **Lưu lịch sử** - Không mất dữ liệu khi xóa đơn hàng
✅ **Tính toán chính xác** - Thanh toán được tính dựa trên đơn hàng chưa xóa
✅ **Audit trail** - Có thể xem khi nào đơn hàng bị xóa
✅ **Khôi phục dữ liệu** - Có thể khôi phục đơn hàng nếu cần

## Lưu Ý

- Đơn hàng đã xóa sẽ có giá trị `deleted_at` không phải NULL
- Tất cả các query đều kiểm tra `deleted_at IS NULL` để chỉ lấy đơn hàng chưa xóa
- Nếu muốn xem lịch sử đơn hàng đã xóa, có thể tạo endpoint riêng với điều kiện `deleted_at IS NOT NULL`

## Endpoint Mới (Tùy Chọn)

Nếu muốn xem lịch sử đơn hàng đã xóa, có thể thêm endpoint:

```javascript
// Get deleted orders (admin only)
app.get('/api/orders/deleted', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }

  const { data: deletedOrders, error } = await supabase
    .from('orders')
    .select('*')
    .is('deleted_at', 'not', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Lỗi database' });
  }

  res.json(deletedOrders || []);
});
```

## Câu Hỏi Thường Gặp

**Q: Làm sao để khôi phục đơn hàng đã xóa?**
A: Cập nhật `deleted_at = NULL` trong Supabase SQL Editor

**Q: Dữ liệu cũ có bị ảnh hưởng không?**
A: Không, tất cả đơn hàng cũ sẽ có `deleted_at = NULL` (chưa xóa)

**Q: Có thể xóa vĩnh viễn không?**
A: Có, nhưng không nên. Nếu cần, có thể chạy SQL: `DELETE FROM orders WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'`
