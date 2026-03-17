-- =====================================================
-- Fix Payments Table Schema - SIMPLIFIED VERSION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop and recreate payments table with minimal columns
DROP TABLE IF EXISTS payments CASCADE;

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Verify the schema
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Payments table recreated with minimal schema!';
  RAISE NOTICE 'Columns: id, user_id, amount, status, created_at';
END $$;
