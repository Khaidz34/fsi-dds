-- Add mobile_video_url column to banner_settings
-- Allows the Video Overlay to play a different video on mobile vs desktop.

ALTER TABLE banner_settings
  ADD COLUMN IF NOT EXISTS mobile_video_url TEXT;

-- Default to the bundled mobile asset if column was just added.
UPDATE banner_settings
  SET mobile_video_url = '/videos/mobile.mp4'
  WHERE id = 1 AND (mobile_video_url IS NULL OR mobile_video_url = '');

-- Verify
SELECT id, video_enabled, video_url, mobile_video_url, updated_at
FROM banner_settings
WHERE id = 1;
