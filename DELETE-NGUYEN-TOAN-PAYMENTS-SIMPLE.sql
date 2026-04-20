-- Simple script to delete Nguyen Toan's overpayment
-- Run these queries one by one

-- Step 1: Check Nguyen Toan's user ID
SELECT id, fullname, username FROM users 
WHERE fullname ILIKE '%Nguyễn Toàn%' OR fullname ILIKE '%Nguyen Toan%';
-- Expected result: id = 2

-- Step 2: Check current payments (without paid_at column)
SELECT * FROM payments WHERE user_id = 2;

-- Step 3: Count payments
SELECT COUNT(*) as payment_count, SUM(amount) as total_amount
FROM payments WHERE user_id = 2;

-- Step 4: Check orders for this user
SELECT 
  id,
  created_at,
  price,
  paid,
  ordered_for
FROM orders
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01'
ORDER BY created_at;

-- Step 5: Count orders
SELECT 
  COUNT(*) as order_count, 
  SUM(price) as total_price,
  COUNT(CASE WHEN paid = true THEN 1 END) as paid_count,
  COUNT(CASE WHEN paid = false OR paid IS NULL THEN 1 END) as unpaid_count
FROM orders
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01';

-- Step 6: DELETE ALL PAYMENTS for Nguyen Toan
-- IMPORTANT: Only run this after confirming the user ID above
DELETE FROM payments WHERE user_id = 2;

-- Step 7: RESET ALL ORDERS to unpaid
-- This allows admin to mark payment again with correct amount
UPDATE orders
SET paid = false
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01';

-- Step 8: Verify deletion
SELECT COUNT(*) as payment_count FROM payments WHERE user_id = 2;
-- Should return 0

-- Step 9: Verify orders reset
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN paid = true THEN 1 END) as paid_orders,
  COUNT(CASE WHEN paid = false OR paid IS NULL THEN 1 END) as unpaid_orders
FROM orders
WHERE ordered_for = 2
  AND deleted_at IS NULL
  AND created_at >= '2026-04-01';
-- All orders should be unpaid now
