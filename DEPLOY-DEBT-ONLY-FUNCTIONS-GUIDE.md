# Hướng dẫn Deploy Functions Hiển Thị Người Đang Nợ

## Vấn đề
- Trang admin không hiển thị đầy đủ người đang nợ
- Không hiển thị số tiền đã thanh toán
- Hiển thị cả người không nợ

## Giải pháp
Tạo 2 functions mới trong Supabase để:
1. Chỉ trả về người đang nợ (remainingTotal > 0)
2. Tính đúng số tiền đã thanh toán từ orders.paid
3. Sắp xếp theo số nợ (cao nhất trước)

## Các bước thực hiện

### Bước 1: Mở Supabase SQL Editor
1. Truy cập https://supabase.com/dashboard
2. Chọn project của bạn
3. Click vào "SQL Editor" ở sidebar bên trái

### Bước 2: Chạy SQL Query 1 - Function get_payment_stats_debt_only

Copy và paste đoạn SQL này vào SQL Editor, sau đó click "Run":

```sql
-- PostgreSQL function to calculate payment stats - ONLY USERS WITH DEBT
-- Returns only users who have remainingTotal > 0
-- Uses orders.paid boolean instead of payments table

CREATE OR REPLACE FUNCTION get_payment_stats_debt_only(
  p_month TEXT,
  p_start_date TIMESTAMP,
  p_next_month TIMESTAMP,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  "userId" INTEGER,
  fullname TEXT,
  username TEXT,
  month TEXT,
  "ordersCount" BIGINT,
  "ordersTotal" NUMERIC,
  "paidCount" BIGINT,
  "paidTotal" NUMERIC,
  "remainingCount" BIGINT,
  "remainingTotal" NUMERIC,
  "overpaidTotal" NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      users.id as user_id,
      users.fullname,
      users.username,
      -- Count all orders where user is responsible for payment
      COUNT(DISTINCT orders.id) as orders_count,
      -- Sum price for all orders user is responsible for
      COALESCE(SUM(orders.price), 0) as orders_total,
      -- Count paid orders
      COUNT(CASE WHEN orders.paid = true THEN 1 END) as paid_count,
      -- Sum price for paid orders
      COALESCE(SUM(CASE WHEN orders.paid = true THEN orders.price ELSE 0 END), 0) as paid_total,
      -- Count unpaid orders
      COUNT(CASE WHEN (orders.paid = false OR orders.paid IS NULL) THEN 1 END) as remaining_count
    FROM users
    LEFT JOIN orders ON (
      (orders.user_id = users.id OR orders.ordered_for = users.id)
      AND orders.deleted_at IS NULL
      AND orders.created_at >= p_start_date
      AND orders.created_at < p_next_month
    )
    WHERE users.role = 'user'
    GROUP BY users.id, users.fullname, users.username
    HAVING COALESCE(SUM(orders.price), 0) - COALESCE(SUM(CASE WHEN orders.paid = true THEN orders.price ELSE 0 END), 0) > 0
  )
  SELECT 
    us.user_id as "userId",
    us.fullname,
    us.username,
    p_month as month,
    us.orders_count as "ordersCount",
    us.orders_total as "ordersTotal",
    us.paid_count as "paidCount",
    us.paid_total as "paidTotal",
    us.remaining_count as "remainingCount",
    (us.orders_total - us.paid_total) as "remainingTotal",
    0::NUMERIC as "overpaidTotal"
  FROM user_stats us
  ORDER BY (us.orders_total - us.paid_total) DESC, us.fullname
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_payment_stats_debt_only(TEXT, TIMESTAMP, TIMESTAMP, INTEGER, INTEGER) TO anon, authenticated;
```

### Bước 3: Chạy SQL Query 2 - Function get_debt_users_count

Copy và paste đoạn SQL này vào SQL Editor, sau đó click "Run":

```sql
-- Function to count total users with debt
CREATE OR REPLACE FUNCTION get_debt_users_count(
  p_month TEXT,
  p_start_date TIMESTAMP,
  p_next_month TIMESTAMP
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  debt_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT users.id) INTO debt_count
  FROM users
  LEFT JOIN orders ON (
    (orders.user_id = users.id OR orders.ordered_for = users.id)
    AND orders.deleted_at IS NULL
    AND orders.created_at >= p_start_date
    AND orders.created_at < p_next_month
  )
  WHERE users.role = 'user'
  GROUP BY users.id
  HAVING COALESCE(SUM(orders.price), 0) - COALESCE(SUM(CASE WHEN orders.paid = true THEN orders.price ELSE 0 END), 0) > 0;
  
  RETURN COALESCE(debt_count, 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_debt_users_count(TEXT, TIMESTAMP, TIMESTAMP) TO anon, authenticated;
```

### Bước 4: Kiểm tra kết quả

Sau khi chạy 2 queries trên, bạn sẽ thấy:
- ✅ Success (no rows returned) - Điều này là bình thường!

### Bước 5: Deploy backend lên Render

1. Commit và push code lên GitHub (đã làm rồi)
2. Render sẽ tự động deploy
3. Đợi vài phút để deploy hoàn tất

### Bước 6: Test

1. Truy cập trang admin trên website
2. Bạn sẽ thấy:
   - Chỉ hiển thị người đang nợ
   - Hiển thị đúng số tiền đã thanh toán
   - Sắp xếp theo số nợ (cao nhất trước)
   - Nút "Xem thêm" để load thêm 20 người tiếp theo

## Kết quả mong đợi

Theo test script, hiện có **13 người đang nợ** với tổng số nợ **1.560.000đ**:

1. Ngọc - 240.000đ
2. Nishimura - 240.000đ
3. Khải-Admin - 200.000đ
4. Tuyết - 160.000đ
5. Huyền - 120.000đ
6. Minh Mun - 120.000đ (đã trả 80.000đ)
7. Nguyễn Toàn - 120.000đ (đã trả 200.000đ)
8. Khải Nguyễn - 80.000đ
9. thuy - 80.000đ (đã trả 200.000đ)
10. Trương Linh - 80.000đ
11. Lê Xuân Kỳ - 40.000đ (đã trả 80.000đ)
12. Lưu Thảo - 40.000đ (đã trả 160.000đ)
13. Nguyen Quang - 40.000đ

## Troubleshooting

Nếu vẫn không hiển thị đúng:
1. Kiểm tra Supabase SQL Editor xem functions đã được tạo chưa
2. Kiểm tra backend logs trên Render
3. Clear cache trình duyệt và refresh trang
