-- Create banner_settings table for Admin Banner Management feature
-- This table stores the current banner configuration (game or anniversary)

CREATE TABLE IF NOT EXISTS banner_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  banner_type VARCHAR(50) NOT NULL CHECK (banner_type IN ('game', 'anniversary')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Create index on banner_type for query optimization
CREATE INDEX IF NOT EXISTS idx_banner_settings_banner_type ON banner_settings(banner_type);

-- Insert default row with game banner
INSERT INTO banner_settings (id, banner_type, updated_at, updated_by)
VALUES (1, 'game', CURRENT_TIMESTAMP, NULL)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT SELECT ON banner_settings TO authenticated;
GRANT SELECT ON banner_settings TO anon;
GRANT UPDATE ON banner_settings TO authenticated;
GRANT INSERT ON banner_settings TO authenticated;

-- Add RLS policies
ALTER TABLE banner_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read banner settings
CREATE POLICY "Allow public read banner_settings"
  ON banner_settings FOR SELECT
  USING (true);

-- Allow only admins to update banner settings
CREATE POLICY "Allow admin update banner_settings"
  ON banner_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow only admins to insert banner settings
CREATE POLICY "Allow admin insert banner_settings"
  ON banner_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
