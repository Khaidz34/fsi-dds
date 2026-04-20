-- PostgreSQL function to calculate payment stats - ONLY USERS WITH DEBT
-- Returns only users who have remainingTotal > 0
-- Uses orders.paid boolean instead of payments table

CREATE OR REPLACE FUNCTION get_payment_stats_debt_only(
  p_month TEXT,
  p_start_date TIMESTAMP,
  p_next_month TIMESTAMP,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
  WITH user_stats AS (
    SELECT 
      users.id as user_id,
      users.fullname,
      users.username,
      -- Count all orders where user is responsible for payment
      COUNT(DISTINCT orders.id) as orders_count,
      -- Sum price for all orders user is responsible for
      COALESCE(SUM(orders.price), 0) as orders_total,
      -- Count paid orders
      COUNT(CASE WHEN orders.paid = true THEN 1 END) as paid_count,
      -- Sum price for paid orders
      COALESCE(SUM(CASE WHEN orders.paid = true THEN orders.price ELSE 0 END), 0) as paid_total,
      -- Count unpaid orders
      COUNT(CASE WHEN (orders.paid = false OR orders.paid IS NULL) THEN 1 END) as remaining_count
    FROM users
    LEFT JOIN orders ON (
      (orders.user_id = users.id OR orders.ordered_for = users.id)
      AND orders.deleted_at IS NULL
      AND orders.created_at >= p_start_date
      AND orders.created_at < p_next_month
    )
    WHERE users.role = 'user'
    GROUP BY users.id, users.fullname, users.username
    HAVING COALESCE(SUM(orders.price), 0) - COALESCE(SUM(CASE WHEN orders.paid = true THEN orders.price ELSE 0 END), 0) > 0
  )
  SELECT 
    us.user_id as "userId",
    us.fullname,
    us.username,
    p_month as month,
    us.orders_count as "ordersCount",
    us.orders_total as "ordersTotal",
    us.paid_count as "paidCount",
    us.paid_total as "paidTotal",
    us.remaining_count as "remainingCount",
    (us.orders_total - us.paid_total) as "remainingTotal",
    0::NUMERIC as "overpaidTotal"
  FROM user_stats us
  ORDER BY (us.orders_total - us.paid_total) DESC, us.fullname
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_payment_stats_debt_only(TEXT, TIMESTAMP, TIMESTAMP, INTEGER, INTEGER) TO anon, authenticated;
