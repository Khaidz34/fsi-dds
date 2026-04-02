-- Step 1: Drop the old function with wrong return type
DROP FUNCTION IF EXISTS get_payment_stats(text, timestamp without time zone, timestamp without time zone, integer, integer);

-- Step 2: Create the corrected function with INTEGER userId (not UUID)
CREATE OR REPLACE FUNCTION get_payment_stats(
  p_month TEXT,
  p_start_date TIMESTAMP,
  p_next_month TIMESTAMP,
  p_limit INTEGER,
  p_offset INTEGER
)
RETURNS TABLE (
  "userId" INTEGER,
  fullname TEXT,
  username TEXT,
  month TEXT,
  "ordersCount" BIGINT,
  "ordersTotal" NUMERIC,
  "paidCount" BIGINT,
  "paidTotal" NUMERIC,
  "remainingCount" BIGINT,
  "remainingTotal" NUMERIC,
  "overpaidTotal" NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_orders AS (
    SELECT 
      users.id as user_id,
      users.fullname,
      users.username,
      -- Count all orders (both placed by user and placed for user)
      COUNT(DISTINCT orders.id) as orders_count,
      -- Count orders where user is responsible for payment
      COUNT(DISTINCT CASE 
        WHEN (orders.ordered_for IS NULL AND orders.user_id = users.id)
             OR orders.ordered_for = users.id
        THEN orders.id 
      END) as orders_for_payment_count,
      -- Sum price only for orders user is responsible for
      COALESCE(SUM(CASE 
        WHEN (orders.ordered_for IS NULL AND orders.user_id = users.id)
             OR orders.ordered_for = users.id
        THEN orders.price 
        ELSE 0 
      END), 0) as orders_total,
      -- Count paid orders (where user is responsible)
      COUNT(CASE 
        WHEN ((orders.ordered_for IS NULL AND orders.user_id = users.id)
              OR orders.ordered_for = users.id)
             AND orders.paid = true
        THEN 1 
      END) as paid_count,
      -- Count unpaid orders (where user is responsible)
      COUNT(CASE 
        WHEN ((orders.ordered_for IS NULL AND orders.user_id = users.id)
              OR orders.ordered_for = users.id)
             AND (orders.paid = false OR orders.paid IS NULL)
        THEN 1 
      END) as remaining_count
    FROM users
    LEFT JOIN orders ON (
      (orders.user_id = users.id OR orders.ordered_for = users.id)
      AND orders.deleted_at IS NULL
      AND orders.created_at >= p_start_date
      AND orders.created_at < p_next_month
    )
    WHERE users.role = 'user'
    GROUP BY users.id, users.fullname, users.username
  ),
  user_payments AS (
    SELECT 
      users.id as user_id,
      COALESCE(SUM(payments.amount), 0) as paid_total
    FROM users
    LEFT JOIN payments ON (
      payments.user_id = users.id
      AND payments.created_at >= p_start_date
      AND payments.created_at < p_next_month
    )
    WHERE users.role = 'user'
    GROUP BY users.id
  )
  SELECT 
    uo.user_id as "userId",
    uo.fullname,
    uo.username,
    p_month as month,
    COALESCE(uo.orders_count, 0) as "ordersCount",
    COALESCE(uo.orders_total, 0) as "ordersTotal",
    COALESCE(uo.paid_count, 0) as "paidCount",
    COALESCE(up.paid_total, 0) as "paidTotal",
    COALESCE(uo.remaining_count, 0) as "remainingCount",
    GREATEST(0, COALESCE(uo.orders_total, 0) - COALESCE(up.paid_total, 0)) as "remainingTotal",
    CASE 
      WHEN COALESCE(up.paid_total, 0) > COALESCE(uo.orders_total, 0)
      THEN COALESCE(up.paid_total, 0) - COALESCE(uo.orders_total, 0)
      ELSE 0
    END as "overpaidTotal"
  FROM user_orders uo
  JOIN user_payments up ON uo.user_id = up.user_id
  ORDER BY uo.fullname
  LIMIT p_limit OFFSET p_offset;
END;
$$;
