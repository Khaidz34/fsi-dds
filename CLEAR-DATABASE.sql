-- Clear all data from database
-- Run this in Supabase SQL Editor

-- Delete all data (respecting foreign key constraints)
-- Delete in correct order to avoid constraint violations
DELETE FROM orders;
DELETE FROM payments;
DELETE FROM feedback;
DELETE FROM menus;
DELETE FROM dishes;

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
