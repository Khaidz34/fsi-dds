-- Clear all data from database
-- Run this in Supabase SQL Editor

-- Disable foreign key constraints temporarily
ALTER TABLE orders DISABLE TRIGGER ALL;
ALTER TABLE payments DISABLE TRIGGER ALL;
ALTER TABLE feedback DISABLE TRIGGER ALL;
ALTER TABLE menus DISABLE TRIGGER ALL;

-- Delete all data
DELETE FROM orders;
DELETE FROM payments;
DELETE FROM feedback;
DELETE FROM menus;
DELETE FROM dishes;

-- Re-enable triggers
ALTER TABLE orders ENABLE TRIGGER ALL;
ALTER TABLE payments ENABLE TRIGGER ALL;
ALTER TABLE feedback ENABLE TRIGGER ALL;
ALTER TABLE menus ENABLE TRIGGER ALL;

-- Reset sequences (auto-increment)
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE feedback_id_seq RESTART WITH 1;
ALTER SEQUENCE menus_id_seq RESTART WITH 1;
ALTER SEQUENCE dishes_id_seq RESTART WITH 1;

-- Verify data is cleared
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback
UNION ALL
SELECT 'menus', COUNT(*) FROM menus
UNION ALL
SELECT 'dishes', COUNT(*) FROM dishes;
