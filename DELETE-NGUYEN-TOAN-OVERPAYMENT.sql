-- Delete overpayment records for Nguyễn Toàn
-- This will remove the 560,000đ overpayment

-- Step 1: Find Nguyễn Toàn's user ID
-- Run this first to confirm the user ID
SELECT id, fullname, username FROM users WHERE fullname ILIKE '%Nguyễn Toàn%' OR fullname ILIKE '%Nguyen Toan%';

-- Step 2: Check current payments for this user
-- Replace USER_ID with the actual ID from Step 1
SELECT * FROM payments WHERE user_id = 2 ORDER BY paid_at DESC;

-- Step 3: Delete the overpayment records
-- IMPORTANT: Only run this after confirming the user ID and payment records above
-- This will delete payments totaling 560,000đ (14 meals worth)

-- Option 1: Delete specific payment records by ID
-- Replace PAYMENT_IDS with the actual IDs you want to delete
-- DELETE FROM payments WHERE id IN (PAYMENT_ID_1, PAYMENT_ID_2, ...);

-- Option 2: Delete the most recent payments totaling 560,000đ
-- This assumes the overpayment was the most recent
WITH recent_payments AS (
  SELECT id, amount, paid_at
  FROM payments
  WHERE user_id = 2
  ORDER BY paid_at DESC
  LIMIT 14  -- 560,000 / 40,000 = 14 payments
)
DELETE FROM payments
WHERE id IN (SELECT id FROM recent_payments);

-- Step 4: Verify the deletion
SELECT 
  COUNT(*) as payment_count,
  SUM(amount) as total_paid
FROM payments 
WHERE user_id = 2;

-- Step 5: Check orders status
-- Make sure orders are marked correctly
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
