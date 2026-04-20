# Fix: Xóa thanh toán thừa của Nguyễn Toàn (560,000đ)

## Vấn đề
Nguyễn Toàn đã thanh toán thừa 560,000đ (tương đương 14 bữa ăn).

## Nguyên nhân
Do bug trước đó trong mark-paid endpoint:
- Endpoint tạo payment record thành công
- Nhưng không update orders.paid = true (do tìm sai orders với user_id thay vì ordered_for)
- Admin đánh dấu thanh toán nhiều lần → Tạo nhiều payment records thừa

## Giải pháp
Xóa các payment records thừa trong database.

## Các bước thực hiện

### Bước 1: Vào Supabase Dashboard
1. Mở https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào **SQL Editor** (menu bên trái)

### Bước 2: Kiểm tra user ID của Nguyễn Toàn
Copy và chạy query này:

```sql
SELECT id, fullname, username FROM users 
WHERE fullname ILIKE '%Nguyễn Toàn%' OR fullname ILIKE '%Nguyen Toan%';
```

Kết quả sẽ cho bạn user ID (ví dụ: id = 2)

### Bước 3: Kiểm tra payments hiện tại
Thay `2` bằng user ID thực tế nếu khác:

```sql
SELECT * FROM payments WHERE user_id = 2 ORDER BY paid_at DESC;
```

Xem có bao nhiêu payment records và tổng số tiền.

### Bước 4: Kiểm tra orders
```sql
SELECT 
  id,
  created_at,
  price,
  paid,
  ordered_for
FROM orders
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01'
ORDER BY created_at;
```

Đếm số orders và tính tổng tiền thực tế cần thanh toán.

### Bước 5: Xóa payment records thừa

**Cách 1: Xóa tất cả payments và để admin đánh dấu lại**
```sql
DELETE FROM payments WHERE user_id = 2;
```

**Cách 2: Xóa chỉ các payments thừa (14 payments gần nhất = 560,000đ)**
```sql
WITH recent_payments AS (
  SELECT id, amount, paid_at
  FROM payments
  WHERE user_id = 2
  ORDER BY paid_at DESC
  LIMIT 14
)
DELETE FROM payments
WHERE id IN (SELECT id FROM recent_payments);
```

**Khuyến nghị:** Dùng Cách 1 (xóa tất cả) rồi để admin đánh dấu thanh toán lại với số tiền đúng.

### Bước 6: Reset orders về unpaid
Nếu bạn xóa tất cả payments, cần reset orders về unpaid:

```sql
UPDATE orders
SET paid = false
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01';
```

### Bước 7: Verify
Kiểm tra lại:

```sql
-- Check payments
SELECT COUNT(*) as payment_count, SUM(amount) as total_paid
FROM payments WHERE user_id = 2;

-- Check orders
SELECT COUNT(*) as order_count, SUM(price) as total_orders
FROM orders 
WHERE ordered_for = 2 
  AND deleted_at IS NULL 
  AND created_at >= '2026-04-01';
```

### Bước 8: Đánh dấu thanh toán lại (nếu cần)
Sau khi xóa, vào trang admin payments và đánh dấu thanh toán lại với số tiền đúng.

## Lưu ý
- **Backup trước khi xóa:** Supabase có automatic backups, nhưng nên chụp screenshot các payment records trước khi xóa
- **Kiểm tra kỹ user ID:** Đảm bảo đang xóa đúng user
- **Sau khi fix bug mark-paid:** Vấn đề này sẽ không xảy ra nữa vì endpoint đã được fix

## Files
- `DELETE-NGUYEN-TOAN-OVERPAYMENT.sql` - SQL script để xóa overpayment
