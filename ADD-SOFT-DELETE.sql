-- =====================================================
-- Add Soft Delete Support to Orders Table
-- Copy và paste vào Supabase SQL Editor
-- =====================================================

-- Add deleted_at column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index on deleted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);

-- Create index for active orders (not deleted)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(user_id, created_at) WHERE deleted_at IS NULL;

-- ✅ Migration completed successfully!
