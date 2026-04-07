-- Create banner_settings table for Admin Banner Management
-- This table stores the current banner configuration (game or anniversary)

CREATE TABLE IF NOT EXISTS banner_settings (
  id SERIAL PRIMARY KEY,
  banner_type VARCHAR(20) NOT NULL CHECK (banner_type IN ('game', 'anniversary')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_banner_settings_type ON banner_settings(banner_type);

-- Insert default row with game banner
INSERT INTO banner_settings (id, banner_type, updated_at, updated_by)
VALUES (1, 'game', NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

-- Verify the table was created
SELECT * FROM banner_settings;
