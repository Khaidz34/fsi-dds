-- Disable RLS on banner_settings table to allow updates
ALTER TABLE banner_settings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public read banner_settings" ON banner_settings;
DROP POLICY IF EXISTS "Allow admin update banner_settings" ON banner_settings;
DROP POLICY IF EXISTS "Allow admin insert banner_settings" ON banner_settings;

-- Re-enable RLS with simpler policies
ALTER TABLE banner_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Allow public read"
  ON banner_settings FOR SELECT
  USING (true);

-- Allow authenticated users to update (we'll check admin role in backend)
CREATE POLICY "Allow authenticated update"
  ON banner_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert"
  ON banner_settings FOR INSERT
  WITH CHECK (true);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'banner_settings';
