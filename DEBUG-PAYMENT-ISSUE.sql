-- Debug payment calculation issue
-- Check orders and their paid status

-- 1. Check all orders for a specific user (replace user_id with actual ID)
SELECT 
  id,
  user_id,
  price,
  paid,
  created_at,
  deleted_at
FROM orders
WHERE user_id = 2  -- Replace with actual user ID
  AND deleted_at IS NULL
  AND created_at >= '2025-03-01'
ORDER BY created_at DESC;

-- 2. Check payment calculation for that user
SELECT 
  user_id,
  COUNT(*) as total_orders,
  SUM(price) as total_amount,
  COUNT(*) FILTER (WHERE paid = true) as paid_orders,
  COUNT(*) FILTER (WHERE paid = false OR paid IS NULL) as unpaid_orders
FROM orders
WHERE user_id = 2  -- Replace with actual user ID
  AND deleted_at IS NULL
  AND created_at >= '2025-03-01'
GROUP BY user_id;

-- 3. Check payments table
SELECT 
  id,
  user_id,
  amount,
  created_at
FROM payments
WHERE user_id = 2  -- Replace with actual user ID
  AND created_at >= '2025-03-01'
ORDER BY created_at DESC;

-- 4. Calculate expected values
SELECT 
  o.user_id,
  COUNT(o.id) as orders_count,
  SUM(o.price) as orders_total,
  COALESCE(SUM(p.amount), 0) as paid_total,
  SUM(o.price) - COALESCE(SUM(p.amount), 0) as remaining_total,
  COUNT(*) FILTER (WHERE o.paid = true) as paid_count,
  COUNT(*) FILTER (WHERE o.paid = false OR o.paid IS NULL) as remaining_count
FROM orders o
LEFT JOIN payments p ON p.user_id = o.user_id 
  AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', o.created_at)
WHERE o.user_id = 2  -- Replace with actual user ID
  AND o.deleted_at IS NULL
  AND o.created_at >= '2025-03-01'
GROUP BY o.user_id;
