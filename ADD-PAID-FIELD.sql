-- Add 'paid' field to orders table
-- This field tracks whether each individual order has been paid for

-- Add the paid column (default false for all existing orders)
ALTER TABLE orders 
ADD COLUMN paid BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on paid status
CREATE INDEX idx_orders_paid ON orders(paid);

-- Add index for user_id + paid combination (for counting unpaid orders per user)
CREATE INDEX idx_orders_user_paid ON orders(user_id, paid) WHERE deleted_at IS NULL;

-- Optional: Add comment to explain the field
COMMENT ON COLUMN orders.paid IS 'Indicates whether this order has been paid for';
