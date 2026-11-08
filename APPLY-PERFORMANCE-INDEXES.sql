-- ==============================================================================
-- FSI-DDS: TỐI ƯU HÓA CHỈ MỤC DATABASE (POSTGRESQL / SUPABASE)
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào Supabase -> SQL Editor -> Run
-- Các chỉ mục sử dụng IF NOT EXISTS nên hoàn toàn an toàn khi chạy lại nhiều lần.
-- ==============================================================================

-- 1. ĐẢM BẢO CỘT SOFT DELETE (deleted_at) TRÊN BẢNG ORDERS TỒN TẠI
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. CHỈ MỤC CHO BẢNG ĐƠN HÀNG (orders)
-- Tối ưu triệt để các câu truy vấn lọc theo ngày, theo tháng, theo người ăn, loại trừ đơn đã xóa mềm
CREATE INDEX IF NOT EXISTS idx_orders_user_created_active 
  ON orders(user_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_created_active 
  ON orders(created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_ordered_for_active 
  ON orders(ordered_for, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_ordered_by_active 
  ON orders(ordered_by, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_dishes 
  ON orders(dish1_id, dish2_id);

-- 3. CHỈ MỤC CHO BẢNG THANH TOÁN (payments)
-- Bảng payments lưu thời gian thanh toán qua cột created_at (lọc theo tháng/ngày bằng created_at)
CREATE INDEX IF NOT EXISTS idx_payments_user_created 
  ON payments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_created_at 
  ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_created 
  ON payments(status, created_at DESC);

-- 4. CHỈ MỤC CHO BẢNG GIAO DỊCH TỰ ĐỘNG (auto_payment_transactions)
-- Khớp webhook ngân hàng (SePay / VietQR) tức thì theo mã code chuyển khoản
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auto_payment_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_auto_pay_payment_code ON auto_payment_transactions(payment_code);
    CREATE INDEX IF NOT EXISTS idx_auto_pay_trans_id ON auto_payment_transactions(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_auto_pay_user_month ON auto_payment_transactions(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_auto_pay_created ON auto_payment_transactions(created_at DESC);
  END IF;
END $$;

-- 5. CHỈ MỤC CHO BẢNG THỰC ĐƠN & MÓN ĂN (menus, dishes)
-- Truy vấn menu hôm nay và danh sách món ăn trong vài mili-giây
CREATE INDEX IF NOT EXISTS idx_menus_date_desc 
  ON menus(date DESC);

CREATE INDEX IF NOT EXISTS idx_dishes_menu_sort 
  ON dishes(menu_id, sort_order ASC);

-- 6. CHỈ MỤC CHO BẢNG NGƯỜI DÙNG & GÓP Ý (users, feedback)
CREATE INDEX IF NOT EXISTS idx_users_username_lower 
  ON users(LOWER(username));

CREATE INDEX IF NOT EXISTS idx_users_role 
  ON users(role);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback') THEN
    CREATE INDEX IF NOT EXISTS idx_feedback_created_status ON feedback(status, created_at DESC);
  END IF;
END $$;

-- ==============================================================================
-- KIỂM TRA LẠI DANH SÁCH CHỈ MỤC ĐÃ ĐƯỢC TẠO THÀNH CÔNG:
-- ==============================================================================
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
