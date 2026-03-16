# 🗄️ Hướng dẫn xem Database

## 1. **Local Development (Trên máy tính)**

### A. Sử dụng Script có sẵn (Dễ nhất)
```bash
# Chạy script xem database
node view-database.js
```

### B. Sử dụng SQLite Browser (Khuyến nghị)
1. **Download:** https://sqlitebrowser.org/
2. **Cài đặt** DB Browser for SQLite
3. **File** → **Open Database** → Chọn `gourmetgrid.db`
4. **Browse Data** tab để xem dữ liệu

### C. Command Line
```bash
# Mở SQLite CLI
sqlite3 gourmetgrid.db

# Xem danh sách tables
.tables

# Xem users
SELECT * FROM users;

# Xem orders với thông tin chi tiết
SELECT 
  o.id,
  u1.fullname as orderer,
  u2.fullname as receiver,
  d1.name as dish1,
  d2.name as dish2,
  o.notes,
  o.created_at
FROM orders o
LEFT JOIN users u1 ON o.ordered_by = u1.id
LEFT JOIN users u2 ON o.ordered_for = u2.id
LEFT JOIN dishes d1 ON o.dish1_id = d1.id
LEFT JOIN dishes d2 ON o.dish2_id = d2.id
ORDER BY o.created_at DESC;

# Thoát
.quit
```

### D. VS Code Extension
1. **Install:** SQLite Viewer extension
2. **Right-click** file `gourmetgrid.db`
3. **Open with SQLite Viewer**

---

## 2. **Production Database (Trên Render)**

### A. Sử dụng Debug API (Development only)

**Chỉ hoạt động khi NODE_ENV !== 'production'**

```bash
# Xem thống kê tất cả tables
GET /debug/stats

# Xem tất cả dữ liệu
GET /debug/tables

# Xem table cụ thể
GET /debug/table/users
GET /debug/table/orders
GET /debug/table/menus
```

### B. Render Dashboard
1. **Vào Render Dashboard**
2. **Chọn backend service**
3. **Shell tab** → Connect
4. **Chạy commands:**
```bash
sqlite3 /opt/render/project/src/data/gourmetgrid.db
.tables
SELECT COUNT(*) FROM users;
SELECT * FROM users LIMIT 5;
```

### C. Download Database từ Render
1. **Render Dashboard** → **Service** → **Settings**
2. **Persistent Disk** section
3. **Download** database file (nếu có option)

---

## 3. **Database Schema**

### Tables Structure:
```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  fullname TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Menus table
CREATE TABLE menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dishes table
CREATE TABLE dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER,
  name TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (menu_id) REFERENCES menus (id)
);

-- Orders table
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  ordered_by INTEGER,
  ordered_for INTEGER,
  dish1_id INTEGER,
  dish2_id INTEGER,
  price DECIMAL(10,2) DEFAULT 40000,
  notes TEXT,
  rating INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (dish1_id) REFERENCES dishes (id),
  FOREIGN KEY (dish2_id) REFERENCES dishes (id)
);

-- Payments table
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  month TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Feedback table
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

---

## 4. **Useful Queries**

### Thống kê cơ bản:
```sql
-- Tổng số users
SELECT COUNT(*) as total_users FROM users;

-- Users theo role
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Orders hôm nay
SELECT COUNT(*) as today_orders 
FROM orders 
WHERE DATE(created_at) = DATE('now');

-- Top dishes được order nhiều nhất
SELECT d.name, COUNT(*) as order_count
FROM orders o
JOIN dishes d ON o.dish1_id = d.id OR o.dish2_id = d.id
GROUP BY d.name
ORDER BY order_count DESC
LIMIT 10;
```

### Dữ liệu chi tiết:
```sql
-- Orders với thông tin đầy đủ
SELECT 
  o.id,
  orderer.fullname as ordered_by,
  receiver.fullname as ordered_for,
  d1.name as dish1,
  d2.name as dish2,
  o.price,
  o.notes,
  o.created_at
FROM orders o
LEFT JOIN users orderer ON o.ordered_by = orderer.id
LEFT JOIN users receiver ON o.ordered_for = receiver.id
LEFT JOIN dishes d1 ON o.dish1_id = d1.id
LEFT JOIN dishes d2 ON o.dish2_id = d2.id
ORDER BY o.created_at DESC;

-- Payments summary
SELECT 
  u.fullname,
  p.month,
  p.amount,
  p.created_at
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

---

## 5. **Backup & Restore**

### Backup database:
```bash
# Local
cp gourmetgrid.db backup_$(date +%Y%m%d).db

# Từ Render (nếu có shell access)
cp /opt/render/project/src/data/gourmetgrid.db /tmp/backup.db
```

### Export to SQL:
```bash
sqlite3 gourmetgrid.db .dump > backup.sql
```

### Import from SQL:
```bash
sqlite3 new_database.db < backup.sql
```

---

## 6. **Troubleshooting**

### Database locked:
```bash
# Kiểm tra processes đang sử dụng database
lsof gourmetgrid.db

# Hoặc restart backend server
```

### Corrupt database:
```bash
# Check integrity
sqlite3 gourmetgrid.db "PRAGMA integrity_check;"

# Repair if needed
sqlite3 gourmetgrid.db ".recover" | sqlite3 repaired.db
```

---

## 💡 **Tips:**

1. **Backup thường xuyên** database trước khi thay đổi
2. **Sử dụng transactions** cho multiple operations
3. **Index** các columns thường query để tăng performance
4. **Monitor database size** trên Render (giới hạn 1GB free tier)

**Cần hỗ trợ thêm? Hỏi tôi về queries cụ thể!** 🚀