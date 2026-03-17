-- Add indexes for performance optimization
-- Run this in Supabase SQL Editor

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_by ON orders(ordered_by);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_for ON orders(ordered_for);

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Indexes for feedback table
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- Indexes for menus table
CREATE INDEX IF NOT EXISTS idx_menus_date ON menus(date);

-- Indexes for dishes table
CREATE INDEX IF NOT EXISTS idx_dishes_menu_id ON dishes(menu_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at);

-- Verify indexes were created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
