-- =====================================================
-- XÓA THANH TOÁN THỪA CỦA NGUYỄN TOÀN
-- =====================================================
-- Nguyễn Toàn (user_id = 2) có thanh toán thừa 560,000đ
-- do admin bấm nút thanh toán nhiều lần trước khi bug được fix
-- 
-- Script này sẽ:
-- 1. Xóa TẤT CẢ payment records của user_id = 2
-- 2. Reset TẤT CẢ orders của user về trạng thái chưa thanh toán
-- 3. Sau đó admin có thể bấm thanh toán lại MỘT LẦN với số tiền đúng
-- =====================================================

-- BƯỚC 1: Kiểm tra số lượng payment records hiện tại
SELECT 
  COUNT(*) as total_payments,
  SUM(amount) as total_amount
FROM payments 
WHERE user_id = 2;

-- BƯỚC 2: Xem chi tiết các payment records (để backup nếu cần)
SELECT 
  id,
  user_id,
  amount,
  method,
  notes,
  status,
  created_at
FROM payments 
WHERE user_id = 2
ORDER BY created_at DESC;

-- BƯỚC 3: XÓA TẤT CẢ payment records của Nguyễn Toàn
-- ⚠️ CẢNH BÁO: Thao tác này KHÔNG THỂ HOÀN TÁC!
DELETE FROM payments WHERE user_id = 2;

-- BƯỚC 4: Reset TẤT CẢ orders của Nguyễn Toàn về trạng thái chưa thanh toán
-- Chỉ reset orders trong tháng 4/2026 và chưa bị xóa
UPDATE orders 
SET paid = false 
WHERE ordered_for = 2 
  AND deleted_at IS NULL 
  AND created_at >= '2026-04-01T00:00:00Z'
  AND created_at < '2026-05-01T00:00:00Z';

-- BƯỚC 5: Kiểm tra kết quả
-- Kiểm tra payments đã bị xóa hết chưa (phải trả về 0)
SELECT COUNT(*) as remaining_payments FROM payments WHERE user_id = 2;

-- Kiểm tra số orders chưa thanh toán (để admin biết cần thanh toán bao nhiêu)
SELECT COUNT(*) as unpaid_orders
FROM orders 
WHERE ordered_for = 2 
  AND paid = false 
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01T00:00:00Z'
  AND created_at < '2026-05-01T00:00:00Z';

-- =====================================================
-- SAU KHI CHẠY SCRIPT NÀY:
-- =====================================================
-- 1. Tất cả payment records của Nguyễn Toàn đã bị xóa
-- 2. Tất cả orders của Nguyễn Toàn đã được reset về paid = false
-- 3. Admin cần vào trang thanh toán và bấm nút thanh toán MỘT LẦN
-- 4. Hệ thống sẽ tự động tính số tiền đúng và đánh dấu orders là đã thanh toán
-- =====================================================
