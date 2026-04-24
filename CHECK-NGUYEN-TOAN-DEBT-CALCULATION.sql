-- =====================================================
-- KIỂM TRA TÍNH TOÁN NỢ CỦA NGUYỄN TOÀN
-- =====================================================
-- Tất cả orders đã paid = true nhưng vẫn hiện nợ 440,000đ
-- Kiểm tra xem SQL function nào đang được dùng
-- =====================================================

-- BƯỚC 1: Kiểm tra orders thực tế (đã thấy: TẤT CẢ paid = true)
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN paid = true THEN 1 END) as paid_orders,
  COUNT(CASE WHEN paid = false OR paid IS NULL THEN 1 END) as unpaid_orders,
  SUM(CASE WHEN paid = false OR paid IS NULL THEN price ELSE 0 END) as total_debt
FROM orders
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01'
  AND created_at < '2026-05-01';
-- Kết quả mong đợi: total_debt = 0 (vì tất cả đã paid = true)

-- BƯỚC 2: Kiểm tra function nào đang tồn tại trong database
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_name LIKE '%payment_stats%'
ORDER BY routine_name;

-- BƯỚC 3: Test function get_payment_stats_debt_only (nếu tồn tại)
SELECT * FROM get_payment_stats_debt_only('2026-04', 0, 20);

-- BƯỚC 4: Test function get_payment_stats (function cũ - có thể vẫn đang dùng)
SELECT * FROM get_payment_stats('2026-04', 0, 20);

-- BƯỚC 5: Kiểm tra xem có bao nhiêu user có nợ thật
SELECT 
  u.id,
  u.fullname,
  COUNT(o.id) as unpaid_orders,
  SUM(o.price) as total_debt
FROM users u
LEFT JOIN orders o ON o.ordered_for = u.id
  AND o.deleted_at IS NULL
  AND o.created_at >= '2026-04-01'
  AND o.created_at < '2026-05-01'
  AND (o.paid = false OR o.paid IS NULL)
GROUP BY u.id, u.fullname
HAVING COUNT(o.id) > 0
ORDER BY total_debt DESC;
-- Nguyễn Toàn KHÔNG NÊN xuất hiện trong kết quả này

-- =====================================================
-- PHÂN TÍCH:
-- =====================================================
-- Nếu Bước 5 KHÔNG có Nguyễn Toàn → orders đã paid đúng
-- Nếu Bước 3 hoặc 4 VẪN trả về Nguyễn Toàn → SQL function tính sai
-- 
-- GIẢI PHÁP:
-- 1. Nếu function tính sai → Deploy lại CREATE-PAYMENT-STATS-DEBT-ONLY-FIXED.sql
-- 2. Nếu backend dùng function cũ → Kiểm tra backend/server.js buildPaymentStatsQuery
-- =====================================================
