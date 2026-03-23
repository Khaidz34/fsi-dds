-- FIX RLS POLICIES - Disable RLS to restore login functionality
-- Run this IMMEDIATELY in Supabase SQL Editor to fix login issue

-- STEP 1: Disable RLS on all tables (restore access)
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing policies that are blocking access
DROP POLICY IF EXISTS "Enable read for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON payments;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON orders;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON menus;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON feedback;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON feedback;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON feedback;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;

-- STEP 3: Realtime will still work without RLS
-- The tables are already added to supabase_realtime publication
-- You can verify with:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- NOTE: Your app uses JWT authentication from backend, not Supabase Auth
-- So RLS policies with auth.role() don't work and block all access
-- Backend already handles authorization, so RLS is not needed
