-- Add intro_video_url column to banner_settings
-- Stores the intro/pre-roll video URL that plays BEFORE the main video.

ALTER TABLE banner_settings
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- Default to the bundled intro asset
UPDATE banner_settings
  SET intro_video_url = '/videos/intro.mp4'
  WHERE id = 1 AND (intro_video_url IS NULL OR intro_video_url = '');

-- Verify
SELECT id, video_enabled, intro_video_url, video_url, updated_at
FROM banner_settings
WHERE id = 1;
