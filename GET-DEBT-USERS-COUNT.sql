-- Function to count total users with debt
CREATE OR REPLACE FUNCTION get_debt_users_count(
  p_month TEXT,
  p_start_date TIMESTAMP,
  p_next_month TIMESTAMP
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  debt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO debt_count
  FROM (
    SELECT users.id
    FROM users
    LEFT JOIN orders ON (
      (orders.user_id = users.id OR orders.ordered_for = users.id)
      AND orders.deleted_at IS NULL
      AND orders.created_at >= p_start_date
      AND orders.created_at < p_next_month
    )
    WHERE users.role = 'user'
    GROUP BY users.id
    HAVING COALESCE(SUM(orders.price), 0) - COALESCE(SUM(CASE WHEN orders.paid = true THEN orders.price ELSE 0 END), 0) > 0
  ) AS users_with_debt;
  
  RETURN COALESCE(debt_count, 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_debt_users_count(TEXT, TIMESTAMP, TIMESTAMP) TO anon, authenticated;
