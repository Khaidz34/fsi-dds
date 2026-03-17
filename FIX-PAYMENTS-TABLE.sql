-- =====================================================
-- Fix Payments Table Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check if method column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'method'
  ) THEN
    ALTER TABLE payments ADD COLUMN method TEXT DEFAULT 'cash';
    RAISE NOTICE '✅ Added method column to payments table';
  ELSE
    RAISE NOTICE 'ℹ️ Method column already exists';
  END IF;
END $$;

-- Check if month column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'month'
  ) THEN
    ALTER TABLE payments ADD COLUMN month TEXT;
    RAISE NOTICE '✅ Added month column to payments table';
  ELSE
    RAISE NOTICE 'ℹ️ Month column already exists';
  END IF;
END $$;

-- Create index on month if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month);

-- Verify the schema
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

RAISE NOTICE '✅ Payments table schema fixed!';
