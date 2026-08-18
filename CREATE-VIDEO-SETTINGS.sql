-- Video settings (toggle + URL)
-- Stored alongside banner_settings row id=1, separate row id=2
-- Run this AFTER CREATE-BANNER-SETTINGS-TABLE.sql

ALTER TABLE banner_settings
  DROP CONSTRAINT IF EXISTS banner_settings_banner_type_check;

ALTER TABLE banner_settings
  ADD CONSTRAINT banner_settings_banner_type_check
  CHECK (banner_type IN ('game', 'anniversary', 'video'));

INSERT INTO banner_settings (id, banner_type, updated_at, updated_by)
VALUES (2, 'game', NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

-- Add video URL column to banner_settings for video overlay
ALTER TABLE banner_settings
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Ensure default video URL
UPDATE banner_settings
SET video_url = '/videos/0816.mp4'
WHERE id = 2 AND (video_url IS NULL OR video_url = '');

SELECT * FROM banner_settings ORDER BY id;