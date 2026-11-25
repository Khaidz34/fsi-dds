-- ============================================================================
-- FIX SUPABASE SECURITY VULNERABILITIES (STRICT LOCKDOWN)
-- Khắc phục triệt để các cảnh báo từ Supabase Security Advisor:
--   1. rls_disabled_in_public (Table publicly accessible)
--   2. sensitive_columns_exposed (Sensitive data publicly accessible)
--   3. function_search_path_mutable (custom functions trong schema public)
--   4. rls_enabled_no_policy (có policy deny rõ ràng cho anon/authenticated)
-- ============================================================================
-- LƯU Ý QUAN TRỌNG TRƯỚC KHI CHẠY TRONG SUPABASE SQL EDITOR:
--   1. Đảm bảo Render Backend đã deploy code mới và có biến môi trường:
--      SUPABASE_SERVICE_ROLE_KEY
--      (Lấy tại: Supabase Dashboard -> Project Settings -> API -> service_role)
--   2. Kiểm tra trước tại: https://fsi-dds.onrender.com/health/db
--      BẮT BUỘC phải thấy "authMode": "service_role" trước khi chạy script này!
--   3. Frontend không kết nối trực tiếp Supabase (chỉ dùng Express API + SSE),
--      do đó khóa 100% quyền truy cập qua PUBLIC / anon / authenticated.
-- ============================================================================

-- 1. Khóa toàn bộ bảng trong schema public (bỏ qua an toàn nếu có bảng hệ thống/extension)
DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename <> 'spatial_ref_sys'
  LOOP
    BEGIN
      -- Bật Row Level Security (KHÔNG dùng FORCE để service_role luôn bypass RLS)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);

      -- Xóa toàn bộ policy cũ (tránh sót policy lỏng lẻo như USING (true))
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl.tablename
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl.tablename);
      END LOOP;

      -- Thu hồi toàn bộ quyền truy cập trực tiếp từ PUBLIC, anon & authenticated
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;', tbl.tablename);

      -- Đảm bảo service_role giữ toàn quyền cho Backend Express
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', tbl.tablename);

      -- Tạo policy chặn tuyệt đối mọi truy vấn qua PostgREST (anon / authenticated)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
        'deny_public_access_' || tbl.tablename,
        tbl.tablename
      );
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Bỏ qua bảng không thuộc quyền sở hữu: public.%', tbl.tablename;
    END;
  END LOOP;
END $$;

-- 2. Khóa toàn bộ VIEW / MATERIALIZED VIEW trong schema public (nếu có)
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT viewname AS objname
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname NOT LIKE 'pg_%'
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;', v.objname);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role;', v.objname);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Bỏ qua view không thuộc quyền sở hữu: public.%', v.objname;
    END;
  END LOOP;
END $$;

-- 3. Khóa quyền truy cập sequence trực tiếp từ PUBLIC, anon & authenticated
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Khóa quyền gọi RPC trực tiếp từ public và cố định search_path cho TẤT CẢ hàm custom (không thuộc extension)
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated;', fn.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', fn.sig);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp;', fn.sig);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Bỏ qua hàm không thuộc quyền sở hữu: %', fn.sig;
    END;
  END LOOP;
END $$;

-- 5. Khóa quyền MẶC ĐỊNH cho mọi bảng / sequence / hàm tạo mới trong tương lai
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 6. Kiểm tra lại trạng thái RLS, Policies & quyền của anon sau khi chạy
SELECT
  t.tablename,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', format('public.%I', t.tablename), 'SELECT') AS anon_can_select,
  COALESCE(string_agg(p.policyname, ', '), 'NONE') AS policies
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename, c.relrowsecurity
ORDER BY t.tablename;
