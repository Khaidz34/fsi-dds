-- Kiểm tra tables đã tồn tại chưa
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Kiểm tra users
SELECT COUNT(*) as user_count FROM users;

-- Xem danh sách users
SELECT id, username, fullname, role, created_at FROM users ORDER BY id;