-- Check if 'paid' column exists in orders table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'paid';

-- If the above returns no rows, the column doesn't exist
-- Run ADD-PAID-FIELD.sql first!

-- Check current orders and their paid status
SELECT id, user_id, price, paid, created_at
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Count paid vs unpaid orders
SELECT 
  COUNT(*) FILTER (WHERE paid = true) as paid_orders,
  COUNT(*) FILTER (WHERE paid = false OR paid IS NULL) as unpaid_orders,
  COUNT(*) as total_orders
FROM orders
WHERE deleted_at IS NULL;
