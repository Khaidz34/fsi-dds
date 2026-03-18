-- Tạo admin user (password: admin123)
INSERT INTO users (username, password, fullname, role)
VALUES ('admin', '$2a$10$rN8qNKZ5vN5xJ5xJ5xJ5xOqN8qNKZ5vN5xJ5xJ5xJ5xOqN8qNKZ5v', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Tạo menu cho hôm nay
INSERT INTO menus (date, image_url)
VALUES (CURRENT_DATE, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800')
ON CONFLICT DO NOTHING
RETURNING id;

-- Lấy menu_id vừa tạo và thêm món ăn
WITH latest_menu AS (
  SELECT id FROM menus WHERE date = CURRENT_DATE LIMIT 1
)
INSERT INTO dishes (menu_id, name, name_vi, name_en, name_ja, sort_order)
SELECT 
  id,
  'Cơm gà',
  'Cơm gà',
  'Chicken Rice',
  'チキンライス',
  1
FROM latest_menu
UNION ALL
SELECT 
  id,
  'Phở bò',
  'Phở bò',
  'Beef Pho',
  'フォー',
  2
FROM latest_menu
UNION ALL
SELECT 
  id,
  'Bún chả',
  'Bún chả',
  'Grilled Pork with Noodles',
  'ブンチャー',
  3
FROM latest_menu
ON CONFLICT DO NOTHING;

-- Kiểm tra kết quả
SELECT 
  m.id,
  m.date,
  d.name,
  d.name_vi,
  d.name_en,
  d.name_ja
FROM menus m
LEFT JOIN dishes d ON d.menu_id = m.id
WHERE m.date = CURRENT_DATE;
