-- =====================================================
-- DEPLOY SQL FUNCTION: get_payment_stats_debt_only
-- =====================================================
-- Function này CHỈ trả về users có nợ (remainingTotal > 0)
-- Sử dụng orders.paid boolean để tính toán
-- CHỈ tính orders mà user là người NHẬN (ordered_for)
-- =====================================================

-- XÓA function cũ nếu tồn tại
DROP FUNCTION IF EXISTS get_payment_stats_debt_only(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_payment_stats_debt_only(TEXT, TIMESTAMP, TIMESTAMP, INTEGER, INTEGER);

-- TẠO function mới với signature đơn giản (3 parameters)
CREATE OR REPLACE FUNCTION get_payment_stats_debt_only(
  p_month TEXT,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20
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
DECLARE
  p_start_date TIMESTAMP;
  p_next_month TIMESTAMP;
BEGIN
  -- Calculate date range from month string (e.g., '2026-04')
  p_start_date := (p_month || '-01')::TIMESTAMP;
  p_next_month := (p_start_date + INTERVAL '1 month')::TIMESTAMP;

  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      users.id as user_id,
      users.fullname,
      users.username,
      -- Count all orders where user is the RECEIVER (ordered_for)
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
      orders.ordered_for = users.id
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
GRANT EXECUTE ON FUNCTION get_payment_stats_debt_only(TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- =====================================================
-- TEST FUNCTION
-- =====================================================
-- Test với tháng 4/2026
SELECT * FROM get_payment_stats_debt_only('2026-04', 0, 20);

-- Nguyễn Toàn (user_id = 2) KHÔNG NÊN xuất hiện trong kết quả
-- vì tất cả orders của họ đã có paid = true

-- =====================================================
-- SAU KHI DEPLOY:
-- =====================================================
-- 1. Chạy toàn bộ script này trong Supabase SQL Editor
-- 2. Kiểm tra kết quả test - Nguyễn Toàn không nên có trong danh sách
-- 3. Refresh trang admin payments - Nguyễn Toàn sẽ biến mất
-- =====================================================
