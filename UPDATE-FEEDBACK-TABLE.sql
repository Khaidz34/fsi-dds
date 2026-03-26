-- =====================================================
-- Update Feedback Table Schema
-- Run this in Supabase SQL Editor if you already have a feedback table
-- =====================================================

-- Add missing columns to feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'));

-- Update existing records to have default status
UPDATE feedback SET status = 'pending' WHERE status IS NULL;

-- Make rating optional (remove NOT NULL constraint if it exists)
ALTER TABLE feedback ALTER COLUMN rating DROP NOT NULL;

-- Success message
DO $
BEGIN
  RAISE NOTICE '✅ Feedback table updated successfully!';
  RAISE NOTICE '📝 Added columns: subject, message, status';
  RAISE NOTICE '🔧 Made rating optional';
END $;