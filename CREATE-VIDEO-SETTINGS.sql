-- Reuse row id=1 of banner_settings for video overlay
-- Avoids a second RLS-protected row (id=2) which was failing UPDATE.
--
-- Prerequisites:
--   1. CREATE-BANNER-SETTINGS-TABLE.sql must have run already (row id=1 exists).
--   2. RLS must already permit anon key to UPDATE banner_settings WHERE id = 1
--      (this is the configuration that powers POST /api/banner/settings).
--
-- New columns:
--   video_enabled BOOLEAN  -- true => overlay shown to all clients
--   video_url     TEXT     -- source URL for the overlay

ALTER TABLE banner_settings
  ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE banner_settings
  ADD COLUMN IF NOT EXISTS video_url TEXT;

UPDATE banner_settings
SET video_url = '/videos/0816.mp4'
WHERE id = 1 AND (video_url IS NULL OR video_url = '');

SELECT id, banner_type, video_enabled, video_url FROM banner_settings ORDER BY id;
