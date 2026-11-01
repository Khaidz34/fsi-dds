-- ============================================================================
-- ENFORCE PROPER ROW LEVEL SECURITY (RLS) POLICIES FOR FSI-DDS
-- ============================================================================
-- Mục đích:
-- 1. Bật bảo vệ Row Level Security (RLS) trên tất cả các bảng.
-- 2. Chặn đứng nguy cơ kẻ tấn công dùng Supabase Anon Key để:
--    - Tự ý INSERT / UPDATE / DELETE đơn hàng (orders) hoặc thanh toán (payments)
--    - Xem trộm bảng users (mật khẩu đã hash, thông tin cá nhân)
--    - Sửa đổi menu hoặc bảng điều khiển banner/video.
-- 3. Cho phép quyền SELECT tối thiểu cho vai trò 'anon' để duy trì kết nối
--    Realtime WebSocket (Supabase Realtime) của ứng dụng.
-- 4. Backend Express sử dụng SUPABASE_SERVICE_ROLE_KEY sẽ tự động bypass RLS
--    để thực hiện mọi nghiệp vụ hợp lệ đã được xác thực qua JWT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BƯỚC 1: BẬT RLS TRÊN TẤT CẢ CÁC BẢNG
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS banner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auto_payment_transactions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- BƯỚC 2: XOÁ CÁC POLICY CŨ HOẶC QUÁ RỘNG (NẾU CÓ)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all for anon" ON orders;
DROP POLICY IF EXISTS "Enable all for anon" ON payments;
DROP POLICY IF EXISTS "Enable all for anon" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON menus;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON dishes;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON feedback;
DROP POLICY IF EXISTS "Allow public read banner_settings" ON banner_settings;
DROP POLICY IF EXISTS "Allow admin update banner_settings" ON banner_settings;
DROP POLICY IF EXISTS "Allow admin insert banner_settings" ON banner_settings;
DROP POLICY IF EXISTS "Allow public read" ON banner_settings;
DROP POLICY IF EXISTS "Allow authenticated update" ON banner_settings;
DROP POLICY IF EXISTS "Allow authenticated insert" ON banner_settings;

-- ----------------------------------------------------------------------------
-- BƯỚC 3: THIẾT LẬP POLICIES CHO TỪNG BẢNG
-- ----------------------------------------------------------------------------

-- 1. BẢNG USERS (Tài khoản & Mật khẩu)
-- Tuyệt đối không cho phép anon query trực tiếp qua Supabase Client.
-- Mọi xác thực / đăng nhập / đổi thông tin đều phải đi qua Express API.
CREATE POLICY "deny_anon_users" ON users
  FOR ALL
  TO anon
  USING (false);

-- 2. BẢNG MENUS & DISHES (Thực đơn & Món ăn)
-- Cho phép anon đọc danh sách món ăn để xem menu, nhưng cấm sửa/xoá.
CREATE POLICY "anon_select_menus" ON menus
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_dishes" ON dishes
  FOR SELECT
  TO anon
  USING (true);

-- 3. BẢNG BANNER_SETTINGS & VIDEO_SETTINGS
-- Cho phép anon đọc cấu hình hiển thị banner / video kỷ niệm.
CREATE POLICY "anon_select_banner" ON banner_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_video" ON video_settings
  FOR SELECT
  TO anon
  USING (true);

-- 4. BẢNG ORDERS (Đơn đặt cơm)
-- Cho phép SELECT để Supabase Realtime channel postgres_changes hoạt động.
-- CẤM tuyệt đối anon INSERT, UPDATE, DELETE trực tiếp!
-- Mọi thao tác đặt đơn / huỷ đơn bắt buộc phải đi qua Express API có JWT token.
CREATE POLICY "anon_select_orders_for_realtime" ON orders
  FOR SELECT
  TO anon
  USING (true);

-- 5. BẢNG PAYMENTS (Lịch sử thanh toán)
-- Cho phép SELECT để Supabase Realtime channel postgres_changes hoạt động.
-- CẤM tuyệt đối anon INSERT, UPDATE, DELETE trực tiếp!
CREATE POLICY "anon_select_payments_for_realtime" ON payments
  FOR SELECT
  TO anon
  USING (true);

-- 6. BẢNG FEEDBACK (Góp ý)
-- Chỉ Express Backend mới có quyền đọc/ghi. Anon bị khoá hoàn toàn.
CREATE POLICY "deny_anon_feedback" ON feedback
  FOR ALL
  TO anon
  USING (false);

-- 7. BẢNG AUTO_PAYMENT_TRANSACTIONS (Giao dịch tự động)
-- Chỉ Express Backend Webhook mới có quyền đọc/ghi. Anon bị khoá hoàn toàn.
CREATE POLICY "deny_anon_auto_payment" ON auto_payment_transactions
  FOR ALL
  TO anon
  USING (false);

-- ----------------------------------------------------------------------------
-- BƯỚC 4: KÍCH HOẠT SUPABASE REALTIME PUBLICATION
-- Đảm bảo Realtime WebSocket channel nhận được sự kiện khi DB có thay đổi
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE orders, payments, menus, banner_settings;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Bảng đã có trong publication, bỏ qua
        NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- HOÀN TẤT: RLS ĐÃ ĐƯỢC THIẾT LẬP CHẶT CHẼ
-- ============================================================================
