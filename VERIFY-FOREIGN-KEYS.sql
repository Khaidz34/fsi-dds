-- Verify Foreign Keys on Orders Table
-- Run this in Supabase SQL Editor to check if foreign keys are properly set up

-- Check if foreign keys exist
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='orders'
ORDER BY tc.table_name, kcu.column_name;

-- Check sample data to see if ordered_for is populated
SELECT 
    id,
    user_id,
    ordered_by,
    ordered_for,
    created_at
FROM orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any orders where ordered_for != user_id
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN ordered_for != user_id THEN 1 END) as orders_for_others,
    COUNT(CASE WHEN ordered_for = user_id THEN 1 END) as orders_for_self
FROM orders
WHERE deleted_at IS NULL;
