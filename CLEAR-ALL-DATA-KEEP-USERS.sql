-- ⚠️  WARNING: This will DELETE ALL DATA except users!
-- ⚠️  Make sure you have a backup before running this!
-- ⚠️  This action CANNOT be undone!

-- Delete all data from tables (in correct order to respect foreign keys)

-- 1. Delete feedback (no foreign keys)
DELETE FROM feedback;

-- 2. Delete payments (references users)
DELETE FROM payments;

-- 3. Delete orders (references users, dishes)
DELETE FROM orders;

-- 4. Delete dishes (references menus)
DELETE FROM dishes;

-- 5. Delete menus (no foreign keys)
DELETE FROM menus;

-- 6. Keep users table intact (DO NOT DELETE)
-- Users table is preserved

-- Reset auto-increment sequences (optional - to start IDs from 1 again)
-- Note: This will NOT affect users table

-- Reset menus sequence
ALTER SEQUENCE menus_id_seq RESTART WITH 1;

-- Reset dishes sequence
ALTER SEQUENCE dishes_id_seq RESTART WITH 1;

-- Reset orders sequence
ALTER SEQUENCE orders_id_seq RESTART WITH 1;

-- Reset payments sequence
ALTER SEQUENCE payments_id_seq RESTART WITH 1;

-- Reset feedback sequence
ALTER SEQUENCE feedback_id_seq RESTART WITH 1;

-- Verify results
SELECT 'menus' as table_name, COUNT(*) as count FROM menus
UNION ALL
SELECT 'dishes', COUNT(*) FROM dishes
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- Expected result:
-- menus: 0
-- dishes: 0
-- orders: 0
-- payments: 0
-- feedback: 0
-- users: (your user count - should NOT be 0)
