require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── SQLite Database ─────────────────────────────────────────
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'gourmetgrid.db');

console.log('🗄️  Database Configuration:');
console.log('   Path:', dbPath);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   Platform:', process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Other');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created database directory:', dbDir);
} else {
  console.log('📁 Database directory exists:', dbDir);
}

// Check if database file already exists
const dbExists = fs.existsSync(dbPath);
console.log('🗄️  Database file exists:', dbExists);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối SQLite:', err.message);
    console.error('📍 Database path:', dbPath);
    console.error('📁 Directory exists:', fs.existsSync(dbDir));
    process.exit(1);
  } else {
    console.log('✅ Đã kết nối SQLite database:', dbPath);
    
    // Check if this is existing database with data
    db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"', (err, row) => {
      if (err) {
        console.log('📊 New database - will initialize tables');
      } else {
        console.log(`📊 Database has ${row.count} tables`);
        if (row.count > 0) {
          // Check user count
          db.get('SELECT COUNT(*) as count FROM users', (err, userRow) => {
            if (!err && userRow) {
              console.log(`👥 Database has ${userRow.count} existing users`);
            }
          });
        }
      }
    });
    
    // Production optimizations
    db.run('PRAGMA journal_mode = WAL;'); // Better concurrency
    db.run('PRAGMA synchronous = NORMAL;'); // Faster writes  
    db.run('PRAGMA cache_size = 1000000;'); // 1GB cache
    db.run('PRAGMA temp_store = memory;'); // Use RAM for temp
    db.run('PRAGMA foreign_keys = ON;'); // Enable foreign keys
  }
});

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and local network IPs
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3001',
      'http://127.0.0.1:5500',
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^https:\/\/.*\.onrender\.com$/,
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      return pattern.test(origin);
    });
    
    if (isAllowed || process.env.FRONTEND_URL === origin) {
      callback(null, true);
    } else {
      console.log('⚠️  CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ─── Auth Middleware ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'default-secret');
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền này' });
  }
  next();
}

// ─── Database Schema Setup ───────────────────────────────────
function initDatabase() {
  return new Promise((resolve, reject) => {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullname TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS dishes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_id INTEGER,
        name TEXT NOT NULL,
        name_vi TEXT,
        name_en TEXT,
        name_ja TEXT,
        order_index INTEGER,
        FOREIGN KEY (menu_id) REFERENCES menus (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date DATE NOT NULL,
        dish1_id INTEGER,
        dish2_id INTEGER,
        price INTEGER DEFAULT 40000,
        notes TEXT,
        rating INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (dish1_id) REFERENCES dishes (id),
        FOREIGN KEY (dish2_id) REFERENCES dishes (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        month TEXT NOT NULL,
        amount INTEGER NOT NULL,
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    let completed = 0;
    const total = tables.length;

    tables.forEach(sql => {
      db.run(sql, (err) => {
        if (err) {
          console.error('❌ Lỗi tạo bảng:', err.message);
          reject(err);
        } else {
          completed++;
          if (completed === total) {
            console.log('✅ Database schema created');
            createSampleData().then(resolve).catch(reject);
          }
        }
      });
    });
  });
}

function createSampleData() {
  return new Promise((resolve) => {
    // Add multilingual columns if they don't exist
    db.run(`ALTER TABLE dishes ADD COLUMN name_vi TEXT`, (err) => {
      // Ignore error if column already exists
      db.run(`ALTER TABLE dishes ADD COLUMN name_en TEXT`, (err) => {
        // Ignore error if column already exists
        db.run(`ALTER TABLE dishes ADD COLUMN name_ja TEXT`, (err) => {
          // Ignore error if column already exists
          
          // Tạo default users
          const adminPassword = bcrypt.hashSync('admin123', 10);
          const userPassword = bcrypt.hashSync('user123', 10);
          
          const defaultUsers = [
            ['admin', adminPassword, 'Administrator', 'admin'],
            ['toan', userPassword, 'Nguyễn Tiến Toàn', 'user'],
            ['user1', userPassword, 'Nhân viên 1', 'user'],
            ['user2', userPassword, 'Nhân viên 2', 'user']
          ];
          
          let usersCreated = 0;
          defaultUsers.forEach(([username, password, fullname, role]) => {
            db.run(`INSERT OR IGNORE INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)`,
              [username, password, fullname, role], (err) => {
                if (err) console.error(`Error creating user ${username}:`, err);
                usersCreated++;
                
                if (usersCreated === defaultUsers.length) {
                  console.log('✅ Default users ready:');
                  console.log('   - admin/admin123 (Administrator)');
                  console.log('   - toan/user123 (Nguyễn Tiến Toàn)');
                  console.log('   - user1/user123 (Nhân viên 1)');
                  console.log('   - user2/user123 (Nhân viên 2)');
                  console.log('✅ Multilingual columns added');
                  
                  // Clean up markdown formatting from all dish names
                  console.log('🧹 Cleaning up markdown formatting...');
                  
                  const cleanupQueries = [
                    `UPDATE dishes SET name_vi = REPLACE(name_vi, '**', '') WHERE name_vi LIKE '%**%'`,
                    `UPDATE dishes SET name_en = REPLACE(name_en, '**', '') WHERE name_en LIKE '%**%'`,
                    `UPDATE dishes SET name_ja = REPLACE(name_ja, '**', '') WHERE name_ja LIKE '%**%'`,
                    `UPDATE dishes SET name = REPLACE(name, '**', '') WHERE name LIKE '%**%'`
                  ];
                  
                  let cleanupCompleted = 0;
                  cleanupQueries.forEach((query, index) => {
                db.run(query, function(err) {
                  if (err) {
                    console.error(`❌ Cleanup error for query ${index + 1}:`, err);
                  } else if (this.changes > 0) {
                    console.log(`✅ Cleaned ${this.changes} records in column ${index + 1}`);
                  }
                  
                  cleanupCompleted++;
                  if (cleanupCompleted === cleanupQueries.length) {
                    console.log('✅ Markdown cleanup completed');
                    resolve();
                  }
                });
              });
              
              // If no cleanup queries needed, resolve immediately
              if (cleanupQueries.length === 0) {
                resolve();
              }
            });
        });
      });
    });
  });
}

// ─── API Routes ──────────────────────────────────────────────

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      );
      
      res.json({
        user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role },
        token
      });
    } else {
      res.status(401).json({ error: 'Mật khẩu không đúng' });
    }
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.get('SELECT id, username, fullname, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại' });
    res.json(user);
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, fullname } = req.body;
  
  if (!username || !password || !fullname) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
  }
  
  // Validate username length
  if (username.length < 3) {
    return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
  }
  
  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }
  
  // Check if username already exists
  db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi kiểm tra tài khoản' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }
    
    // Create new user
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)`,
      [username, hashedPassword, fullname, 'user'],
      function(err) {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Lỗi tạo tài khoản' });
        }
        
        // Return success without token (user must login)
        res.json({
          success: true,
          message: 'Đăng ký thành công! Vui lòng đăng nhập.',
          user: { id: this.lastID, username, fullname, role: 'user' }
        });
      }
    );
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { username, newPassword } = req.body;
  
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
  }
  
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Lỗi cập nhật mật khẩu' });
      
      res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
    });
  });
});

// Menu Routes
app.get('/api/menu/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const lang = req.query.lang || 'vi';
  
  db.get('SELECT * FROM menus WHERE date = ?', [today], (err, menu) => {
    if (err) {
      console.error('Menu query error:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    if (!menu) {
      return res.json({
        date: today,
        imageUrl: '',
        dishes: []
      });
    }
    
    // Query with language support
    let nameColumn = 'name';
    if (lang === 'en') nameColumn = 'COALESCE(name_en, name) as name';
    else if (lang === 'ja') nameColumn = 'COALESCE(name_ja, name) as name';
    else nameColumn = 'COALESCE(name_vi, name) as name';
    
    db.all(`SELECT id, ${nameColumn}, order_index FROM dishes WHERE menu_id = ? ORDER BY order_index`, [menu.id], (err, dishes) => {
      if (err) {
        console.error('Dishes query error:', err);
        return res.status(500).json({ error: 'Lỗi database' });
      }
      
      res.json({
        id: menu.id,
        date: menu.date,
        imageUrl: menu.image_url || '',
        dishes: dishes || []
      });
    });
  });
});

// Create menu with multilingual support
app.post('/api/menu/multilingual', authMiddleware, adminMiddleware, (req, res) => {
  const { dishes, imageUrl } = req.body;
  const today = new Date().toISOString().split('T')[0];
  
  console.log('Creating multilingual menu with dishes:', dishes);
  
  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).json({ error: 'Vui lòng nhập danh sách món ăn' });
  }
  
  // Delete existing menu for today
  db.get('SELECT id FROM menus WHERE date = ?', [today], (err, oldMenu) => {
    if (err) {
      console.error('Error checking old menu:', err);
      return res.status(500).json({ error: 'Lỗi database: ' + err.message });
    }
    
    if (oldMenu) {
      // First, set dish references to NULL in orders to avoid foreign key constraint
      db.run('UPDATE orders SET dish1_id = NULL WHERE dish1_id IN (SELECT id FROM dishes WHERE menu_id = ?)', [oldMenu.id], (err) => {
        if (err) {
          console.error('Error updating orders dish1:', err);
          return res.status(500).json({ error: 'Lỗi database: ' + err.message });
        }
        
        db.run('UPDATE orders SET dish2_id = NULL WHERE dish2_id IN (SELECT id FROM dishes WHERE menu_id = ?)', [oldMenu.id], (err) => {
          if (err) {
            console.error('Error updating orders dish2:', err);
            return res.status(500).json({ error: 'Lỗi database: ' + err.message });
          }
          
          // Now delete the dishes
          db.run('DELETE FROM dishes WHERE menu_id = ?', [oldMenu.id], (err) => {
            if (err) {
              console.error('Error deleting old dishes:', err);
              return res.status(500).json({ error: 'Lỗi database: ' + err.message });
            }
            
            // Finally delete the menu
            db.run('DELETE FROM menus WHERE id = ?', [oldMenu.id], (err) => {
              if (err) {
                console.error('Error deleting old menu:', err);
                return res.status(500).json({ error: 'Lỗi database: ' + err.message });
              }
              createNewMultilingualMenu();
            });
          });
        });
      });
    } else {
      createNewMultilingualMenu();
    }
    
    function createNewMultilingualMenu() {
      db.run('INSERT INTO menus (date, image_url) VALUES (?, ?)', 
        [today, imageUrl || ''], function(err) {
          if (err) {
            console.error('Error creating menu:', err);
            return res.status(500).json({ error: 'Lỗi database: ' + err.message });
          }
          
          const menuId = this.lastID;
          let completed = 0;
          let hasError = false;
          
          console.log('Created menu with ID:', menuId);
          
          // Insert dishes with all languages
          dishes.forEach((dish, index) => {
            const viName = dish.vi || dish.name_vi || dish.name || '';
            const enName = dish.en || dish.name_en || '';
            const jaName = dish.ja || dish.name_ja || '';
            
            console.log(`Inserting dish ${index + 1}:`, { viName, enName, jaName });
            
            db.run(`INSERT INTO dishes (menu_id, name, name_vi, name_en, name_ja, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
              [menuId, viName, viName, enName, jaName, index + 1], 
              function(err) {
                if (err && !hasError) {
                  hasError = true;
                  console.error('Error creating dish:', err);
                  return res.status(500).json({ error: 'Lỗi khi tạo món ăn: ' + err.message });
                }
                
                completed++;
                console.log(`Completed ${completed}/${dishes.length} dishes`);
                
                if (completed === dishes.length && !hasError) {
                  console.log('All dishes created successfully');
                  res.json({ 
                    success: true, 
                    menuId,
                    message: 'Menu đa ngôn ngữ đã được tạo thành công'
                  });
                }
              });
          });
        });
    }
  });
});

app.post('/api/menu', authMiddleware, adminMiddleware, (req, res) => {
  const { dishes, imageUrl } = req.body;
  const today = new Date().toISOString().split('T')[0];
  
  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).json({ error: 'Vui lòng nhập danh sách món ăn' });
  }
  
  // Bước 1: Lấy menu_id cũ nếu có
  db.get('SELECT id FROM menus WHERE date = ?', [today], (err, oldMenu) => {
    if (err) {
      console.error('Error checking old menu:', err);
      return res.status(500).json({ error: 'Lỗi database: ' + err.message });
    }
    
    // Bước 2: Xóa các món ăn cũ trước (tránh foreign key constraint)
    if (oldMenu) {
      db.run('DELETE FROM dishes WHERE menu_id = ?', [oldMenu.id], (err) => {
        if (err) {
          console.error('Error deleting old dishes:', err);
          return res.status(500).json({ error: 'Lỗi database: ' + err.message });
        }
        
        // Bước 3: Xóa menu cũ
        db.run('DELETE FROM menus WHERE id = ?', [oldMenu.id], (err) => {
          if (err) {
            console.error('Error deleting old menu:', err);
            return res.status(500).json({ error: 'Lỗi database: ' + err.message });
          }
          
          createNewMenu();
        });
      });
    } else {
      createNewMenu();
    }
    
    // Hàm tạo menu mới
    function createNewMenu() {
      db.run('INSERT INTO menus (date, image_url) VALUES (?, ?)', [today, imageUrl || ''], function(err) {
        if (err) {
          console.error('Error creating menu:', err);
          return res.status(500).json({ error: 'Lỗi database: ' + err.message });
        }
        
        const menuId = this.lastID;
        
        if (dishes.length === 0) {
          return res.json({ success: true, menuId });
        }
        
        // Thêm các món ăn
        let completed = 0;
        let hasError = false;
        
        dishes.forEach((dish, index) => {
          db.run('INSERT INTO dishes (menu_id, name, order_index) VALUES (?, ?, ?)', 
            [menuId, dish, index + 1], (err) => {
              if (err && !hasError) {
                hasError = true;
                console.error('Error creating dish:', err);
                return res.status(500).json({ error: 'Lỗi database: ' + err.message });
              }
              
              completed++;
              if (completed === dishes.length && !hasError) {
                res.json({ success: true, menuId });
              }
            });
        });
      });
    }
  });
});

// Delete dish endpoint
app.delete('/api/dishes/:id', authMiddleware, adminMiddleware, (req, res) => {
  const dishId = req.params.id;
  
  // First, set dish references to NULL in orders
  db.run('UPDATE orders SET dish1_id = NULL WHERE dish1_id = ?', [dishId], (err) => {
    if (err) {
      console.error('Error updating orders dish1:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    db.run('UPDATE orders SET dish2_id = NULL WHERE dish2_id = ?', [dishId], (err) => {
      if (err) {
        console.error('Error updating orders dish2:', err);
        return res.status(500).json({ error: 'Lỗi database' });
      }
      
      // Now delete the dish
      db.run('DELETE FROM dishes WHERE id = ?', [dishId], function(err) {
        if (err) {
          console.error('Error deleting dish:', err);
          return res.status(500).json({ error: 'Lỗi database' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Không tìm thấy món ăn' });
        }
        
        res.json({ success: true, message: 'Đã xóa món ăn' });
      });
    });
  });
});

// Orders Routes
app.get('/api/orders/today', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const lang = req.query.lang || 'vi';
  
  // Determine which name column to use based on language
  let nameColumn1, nameColumn2;
  switch(lang) {
    case 'en':
      nameColumn1 = 'COALESCE(d1.name_en, d1.name_vi)';
      nameColumn2 = 'COALESCE(d2.name_en, d2.name_vi)';
      break;
    case 'ja':
      nameColumn1 = 'COALESCE(d1.name_ja, d1.name_vi)';
      nameColumn2 = 'COALESCE(d2.name_ja, d2.name_vi)';
      break;
    default: // 'vi'
      nameColumn1 = 'd1.name_vi';
      nameColumn2 = 'd2.name_vi';
  }
  
  let query = `
    SELECT o.*, 
           u.fullname as receiver_fullname,
           ${nameColumn1} as dish1_name,
           ${nameColumn2} as dish2_name,
           d1.order_index as dish1_order,
           d2.order_index as dish2_order
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN dishes d1 ON o.dish1_id = d1.id
    LEFT JOIN dishes d2 ON o.dish2_id = d2.id
    WHERE o.date = ?
  `;
  
  let params = [today];
  
  if (req.user.role !== 'admin') {
    query += ' AND o.user_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY o.created_at DESC';
  
  db.all(query, params, (err, orders) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    
    const formattedOrders = orders.map(order => ({
      id: order.id,
      date: order.date,
      price: order.price,
      notes: order.notes,
      user_id: order.user_id,
      dish1: order.dish1_name ? { 
        name: order.dish1_name, 
        sort_order: order.dish1_order 
      } : null,
      dish2: order.dish2_name ? { 
        name: order.dish2_name, 
        sort_order: order.dish2_order 
      } : null,
      receiver: { fullname: order.receiver_fullname }
    }));
    
    res.json(formattedOrders);
  });
});

app.post('/api/orders', authMiddleware, (req, res) => {
  const { dish1Id, dish2Id, orderedFor, notes, rating } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const userId = orderedFor || req.user.id;
  
  db.run(`INSERT INTO orders (user_id, date, dish1_id, dish2_id, price, notes, rating) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, today, dish1Id, dish2Id || null, 40000, notes || null, rating || null],
    function(err) {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      res.json({
        id: this.lastID,
        success: true,
        message: 'Đặt món thành công'
      });
    });
});

// Update order
app.put('/api/orders/:id', authMiddleware, (req, res) => {
  const orderId = req.params.id;
  const { dish1Id, dish2Id, notes, rating } = req.body;
  
  if (!dish1Id) {
    return res.status(400).json({ error: 'Món chính là bắt buộc' });
  }
  
  // Check if user owns this order (non-admin users can only edit their own orders)
  let checkQuery = 'SELECT * FROM orders WHERE id = ?';
  let checkParams = [orderId];
  
  if (req.user.role !== 'admin') {
    checkQuery += ' AND (user_id = ? OR ordered_by = ?)';
    checkParams.push(req.user.id, req.user.id);
  }
  
  db.get(checkQuery, checkParams, (err, order) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng hoặc bạn không có quyền chỉnh sửa' });
    }
    
    // Update the order
    const updateQuery = `
      UPDATE orders 
      SET dish1_id = ?, dish2_id = ?, notes = ?, rating = ?
      WHERE id = ?
    `;
    
    db.run(updateQuery, [dish1Id, dish2Id || null, notes || null, rating || null, orderId], function(err) {
      if (err) return res.status(500).json({ error: 'Lỗi cập nhật đơn hàng' });
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
      }
      
      // Return updated order with dish names
      const selectQuery = `
        SELECT 
          o.*,
          d1.name as dish1_name,
          d2.name as dish2_name,
          u1.fullname as orderer_name,
          u2.fullname as receiver_name
        FROM orders o
        LEFT JOIN dishes d1 ON o.dish1_id = d1.id
        LEFT JOIN dishes d2 ON o.dish2_id = d2.id
        LEFT JOIN users u1 ON o.ordered_by = u1.id
        LEFT JOIN users u2 ON o.ordered_for = u2.id
        WHERE o.id = ?
      `;
      
      db.get(selectQuery, [orderId], (err, updatedOrder) => {
        if (err) return res.status(500).json({ error: 'Lỗi lấy thông tin đơn hàng' });
        
        res.json({
          success: true,
          message: 'Đã cập nhật đơn hàng thành công',
          order: updatedOrder
        });
      });
    });
  });
});

app.delete('/api/orders/:id', authMiddleware, (req, res) => {
  const orderId = req.params.id;
  
  let query = 'DELETE FROM orders WHERE id = ?';
  let params = [orderId];
  
  if (req.user.role !== 'admin') {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  }
  
  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    res.json({ success: true });
  });
});

// Users Routes
app.get('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  db.all('SELECT id, username, fullname, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    res.json(users);
  });
});

// Get users list for ordering (available to all authenticated users)
app.get('/api/users/list', authMiddleware, (req, res) => {
  db.all('SELECT id, fullname FROM users ORDER BY fullname ASC', (err, users) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    res.json(users);
  });
});

// Payments Routes
app.get('/api/payments', authMiddleware, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  
  if (req.user.role === 'admin') {
    // Admin xem tổng hợp tất cả users
    db.all(`
      SELECT 
        u.id as userId,
        u.fullname,
        COUNT(o.id) as ordersCount,
        COALESCE(SUM(o.price), 0) as ordersTotal,
        COALESCE((SELECT SUM(amount) FROM payments WHERE user_id = u.id AND month = ?), 0) as paidTotal
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND strftime('%Y-%m', o.date) = ?
      GROUP BY u.id
      HAVING ordersCount > 0 OR paidTotal > 0
    `, [month, month], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      const result = rows.map(row => {
        const ordersTotal = row.ordersTotal || 0;
        const paidTotal = row.paidTotal || 0;
        const remainingTotal = ordersTotal - paidTotal;
        
        // Debug log để kiểm tra
        console.log(`💰 Payment calculation for ${row.fullname}:`);
        console.log(`   Orders: ${ordersTotal}đ, Paid: ${paidTotal}đ`);
        console.log(`   Raw remaining: ${remainingTotal}đ`);
        console.log(`   Final remaining: ${Math.max(0, remainingTotal)}đ`);
        
        return {
          userId: row.userId,
          fullname: row.fullname,
          month,
          ordersCount: row.ordersCount || 0,
          ordersTotal: ordersTotal,
          paidCount: paidTotal > 0 ? 1 : 0,
          paidTotal: paidTotal,
          remainingCount: Math.max(0, (row.ordersCount || 0) - (paidTotal > 0 ? 1 : 0)),
          remainingTotal: Math.max(0, remainingTotal), // Không hiển thị số âm
          overpaidTotal: remainingTotal < 0 ? Math.abs(remainingTotal) : 0 // Số tiền thừa
        };
      });
      
      res.json(result);
    });
  } else {
    // User chỉ xem của mình
    db.all(`
      SELECT 
        COUNT(*) as ordersCount,
        SUM(price) as ordersTotal
      FROM orders 
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `, [req.user.id, month], (err, orderStats) => {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      db.all(`
        SELECT 
          COUNT(*) as paidCount,
          SUM(amount) as paidTotal
        FROM payments 
        WHERE user_id = ? AND month = ?
      `, [req.user.id, month], (err, paymentStats) => {
        if (err) return res.status(500).json({ error: 'Lỗi database' });
        
        const orders = orderStats[0] || { ordersCount: 0, ordersTotal: 0 };
        const payments = paymentStats[0] || { paidCount: 0, paidTotal: 0 };
        const remainingTotal = (orders.ordersTotal || 0) - (payments.paidTotal || 0);
        
        res.json([{
          userId: req.user.id,
          month,
          ordersCount: orders.ordersCount || 0,
          ordersTotal: orders.ordersTotal || 0,
          paidCount: payments.paidCount || 0,
          paidTotal: payments.paidTotal || 0,
          remainingCount: Math.max(0, (orders.ordersCount || 0) - (payments.paidCount || 0)),
          remainingTotal: Math.max(0, remainingTotal),
          overpaidTotal: remainingTotal < 0 ? Math.abs(remainingTotal) : 0
        }]);
      });
    });
  }
});

app.get('/api/payments/my', authMiddleware, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  
  if (req.user.role === 'admin') {
    // Admin xem tổng hợp
    db.all(`
      SELECT 
        COUNT(*) as ordersCount,
        SUM(price) as ordersTotal
      FROM orders 
      WHERE strftime('%Y-%m', date) = ?
    `, [month], (err, orderStats) => {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      db.all(`
        SELECT 
          COUNT(*) as paidCount,
          SUM(amount) as paidTotal
        FROM payments 
        WHERE month = ?
      `, [month], (err, paymentStats) => {
        if (err) return res.status(500).json({ error: 'Lỗi database' });
        
        const orders = orderStats[0] || { ordersCount: 0, ordersTotal: 0 };
        const payments = paymentStats[0] || { paidCount: 0, paidTotal: 0 };
        
        res.json({
          month,
          ordersCount: orders.ordersCount || 0,
          ordersTotal: orders.ordersTotal || 0,
          paidCount: payments.paidCount || 0,
          paidTotal: payments.paidTotal || 0,
          remainingCount: (orders.ordersCount || 0) - (payments.paidCount || 0),
          remainingTotal: (orders.ordersTotal || 0) - (payments.paidTotal || 0)
        });
      });
    });
  } else {
    // User xem của mình
    db.all(`
      SELECT 
        COUNT(*) as ordersCount,
        SUM(price) as ordersTotal
      FROM orders 
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `, [req.user.id, month], (err, orderStats) => {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      db.all(`
        SELECT 
          COUNT(*) as paidCount,
          SUM(amount) as paidTotal
        FROM payments 
        WHERE user_id = ? AND month = ?
      `, [req.user.id, month], (err, paymentStats) => {
        if (err) return res.status(500).json({ error: 'Lỗi database' });
        
        const orders = orderStats[0] || { ordersCount: 0, ordersTotal: 0 };
        const payments = paymentStats[0] || { paidCount: 0, paidTotal: 0 };
        
        res.json({
          month,
          ordersCount: orders.ordersCount || 0,
          ordersTotal: orders.ordersTotal || 0,
          paidCount: payments.paidCount || 0,
          paidTotal: payments.paidTotal || 0,
          remainingCount: (orders.ordersCount || 0) - (payments.paidCount || 0),
          remainingTotal: (orders.ordersTotal || 0) - (payments.paidTotal || 0)
        });
      });
    });
  }
});

// Feedback Routes
app.get('/api/feedback', authMiddleware, adminMiddleware, (req, res) => {
  db.all(`
    SELECT 
      f.id,
      f.subject,
      f.message,
      f.status,
      f.created_at,
      u.fullname,
      u.username
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
  `, (err, feedback) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    res.json(feedback);
  });
});

app.post('/api/feedback', authMiddleware, (req, res) => {
  const { subject, message } = req.body;
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Vui lòng nhập nội dung góp ý' });
  }
  
  db.run(`INSERT INTO feedback (user_id, subject, message) VALUES (?, ?, ?)`,
    [req.user.id, subject || null, message.trim()], function(err) {
      if (err) {
        console.error('Error creating feedback:', err);
        return res.status(500).json({ error: 'Lỗi database' });
      }
      
      res.json({ 
        success: true, 
        feedbackId: this.lastID,
        message: 'Góp ý đã được gửi thành công'
      });
    });
});

app.patch('/api/feedback/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  const feedbackId = req.params.id;
  
  if (!['pending', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }
  
  db.run(`UPDATE feedback SET status = ? WHERE id = ?`, [status, feedbackId], function(err) {
    if (err) {
      console.error('Error updating feedback:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Không tìm thấy góp ý' });
    }
    
    res.json({ success: true, message: 'Đã cập nhật trạng thái góp ý' });
  });
});

// Mark payment as paid
app.post('/api/payments/mark-paid', authMiddleware, adminMiddleware, (req, res) => {
  const { userId, month, amount } = req.body;
  
  if (!userId || !month || !amount) {
    return res.status(400).json({ error: 'Thiếu thông tin thanh toán' });
  }
  
  // Thêm bản ghi thanh toán
  db.run(`INSERT INTO payments (user_id, month, amount) VALUES (?, ?, ?)`,
    [userId, month, amount], function(err) {
      if (err) {
        console.error('Error marking payment:', err);
        return res.status(500).json({ error: 'Lỗi database' });
      }
      
      res.json({ 
        success: true, 
        paymentId: this.lastID,
        message: 'Đã đánh dấu thanh toán thành công'
      });
    });
});

// Get payment history
app.get('/api/payments/history', authMiddleware, adminMiddleware, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  
  db.all(`
    SELECT 
      p.id,
      p.amount,
      p.paid_at,
      u.fullname,
      u.username
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.month = ?
    ORDER BY p.paid_at DESC
  `, [month], (err, payments) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    res.json(payments);
  });
});

// Get statistics for admin dashboard
app.get('/api/stats/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  // Get current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Get today's orders count
  db.get(`
    SELECT COUNT(*) as todayCount
    FROM orders 
    WHERE DATE(date) = DATE('now')
  `, (err, todayResult) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    
    // Get this month's total orders and revenue
    db.get(`
      SELECT 
        COUNT(*) as monthOrders,
        SUM(price) as monthRevenue,
        COUNT(DISTINCT ordered_for) as uniqueUsers
      FROM orders 
      WHERE strftime('%Y-%m', date) = ?
    `, [currentMonth], (err, monthResult) => {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      // Get top dishes this month
      db.all(`
        SELECT 
          d.name,
          COUNT(*) as orderCount
        FROM orders o
        LEFT JOIN dishes d1 ON o.dish1_id = d1.id
        LEFT JOIN dishes d2 ON o.dish2_id = d2.id
        LEFT JOIN dishes d ON d.id IN (o.dish1_id, o.dish2_id)
        WHERE strftime('%Y-%m', o.date) = ?
        GROUP BY d.name
        ORDER BY orderCount DESC
        LIMIT 5
      `, [currentMonth], (err, topDishes) => {
        if (err) return res.status(500).json({ error: 'Lỗi database' });
        
        res.json({
          todayOrders: todayResult.todayCount || 0,
          monthOrders: monthResult.monthOrders || 0,
          monthRevenue: monthResult.monthRevenue || 0,
          uniqueUsers: monthResult.uniqueUsers || 0,
          topDishes: topDishes || []
        });
      });
    });
  });
});

// Get weekly order statistics
app.get('/api/orders/weekly-stats', authMiddleware, (req, res) => {
  // Get orders for the last 7 days
  db.all(`
    SELECT 
      DATE(date) as order_date,
      COUNT(*) as order_count
    FROM orders 
    WHERE date >= DATE('now', '-6 days')
    GROUP BY DATE(date)
    ORDER BY order_date
  `, (err, results) => {
    if (err) {
      console.error('Error getting weekly stats:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Create array for last 7 days with Vietnamese day names
    const today = new Date();
    const weeklyData = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];
      
      const dayData = results.find(r => r.order_date === dateStr);
      weeklyData.push({
        name: dayName,
        orders: dayData ? dayData.order_count : 0,
        date: dateStr
      });
    }
    
    res.json(weeklyData);
  });
});

// ─── Dashboard Statistics Endpoint ───────────────────────────
app.get('/api/admin/dashboard-stats', authMiddleware, adminMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's orders count
  db.get(`SELECT COUNT(*) as count FROM orders WHERE date = ?`, [today], (err, todayOrders) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    
    // Get total users count (excluding admin)
    db.get(`SELECT COUNT(*) as count FROM users WHERE role != 'admin'`, (err, totalUsers) => {
      if (err) return res.status(500).json({ error: 'Lỗi database' });
      
      // Get popular dishes (most ordered dishes)
      db.all(`
        SELECT d.name_vi as name, COUNT(*) as orderCount
        FROM orders o
        JOIN dishes d ON (o.dish1_id = d.id OR o.dish2_id = d.id)
        WHERE o.date >= date('now', '-30 days')
        GROUP BY d.id, d.name_vi
        ORDER BY orderCount DESC
        LIMIT 3
      `, (err, popularDishes) => {
        if (err) return res.status(500).json({ error: 'Lỗi database' });
        
        res.json({
          ordersToday: todayOrders.count || 0,
          totalUsers: totalUsers.count || 0,
          popularDishesCount: popularDishes.length || 0,
          popularDishes: popularDishes || []
        });
      });
    });
  });
});

// ─── Simple Cleanup Test ─────────────────────────────────────
app.get('/api/admin/test-cleanup', authMiddleware, adminMiddleware, (req, res) => {
  console.log('🧪 Test cleanup endpoint called');
  res.json({ message: 'Cleanup endpoint is working!' });
});

// ─── Database Cleanup Endpoint ───────────────────────────────
app.post('/api/admin/cleanup-database', authMiddleware, adminMiddleware, (req, res) => {
  console.log('🧹 Starting database cleanup...');
  
  const cleanupQueries = [
    'DELETE FROM feedback',
    'DELETE FROM payments', 
    'DELETE FROM orders',
    'DELETE FROM dishes',
    'DELETE FROM menus',
    'DELETE FROM users WHERE role != "admin"'
  ];
  
  let completed = 0;
  let hasError = false;
  const total = cleanupQueries.length;
  
  cleanupQueries.forEach((query, index) => {
    db.run(query, function(err) {
      if (hasError) return; // Prevent multiple responses
      
      if (err) {
        console.error(`❌ Error in cleanup query ${index + 1}:`, err);
        hasError = true;
        return res.status(500).json({ error: `Lỗi xóa dữ liệu: ${err.message}` });
      }
      
      console.log(`✅ Cleaned table ${index + 1}: ${this.changes} records deleted`);
      completed++;
      
      if (completed === total && !hasError) {
        console.log('🎉 Database cleanup completed successfully!');
        res.json({ 
          success: true, 
          message: 'Đã xóa hết dữ liệu thành công! Chỉ giữ lại admin user.',
          details: {
            feedback: 'Đã xóa',
            payments: 'Đã xóa', 
            orders: 'Đã xóa',
            dishes: 'Đã xóa',
            menus: 'Đã xóa',
            users: 'Chỉ giữ admin'
          }
        });
      }
    });
  });
});

// ─── Clean Markdown Formatting from Dish Names ──────────────
app.post('/api/admin/cleanup-markdown', authMiddleware, adminMiddleware, (req, res) => {
  console.log('🧹 Starting markdown cleanup from dish names...');
  
  // Get all dishes with markdown formatting
  db.all('SELECT id, name_vi, name_en, name_ja FROM dishes', (err, dishes) => {
    if (err) {
      console.error('❌ Error fetching dishes:', err);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách món ăn' });
    }
    
    if (dishes.length === 0) {
      return res.json({ success: true, message: 'Không có món ăn nào cần làm sạch' });
    }
    
    let updated = 0;
    let hasError = false;
    const total = dishes.length;
    
    dishes.forEach(dish => {
      // Clean markdown formatting from all language versions
      const cleanVi = dish.name_vi ? dish.name_vi.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim() : dish.name_vi;
      const cleanEn = dish.name_en ? dish.name_en.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim() : dish.name_en;
      const cleanJa = dish.name_ja ? dish.name_ja.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim() : dish.name_ja;
      
      // Only update if there were changes
      if (cleanVi !== dish.name_vi || cleanEn !== dish.name_en || cleanJa !== dish.name_ja) {
        db.run(
          'UPDATE dishes SET name_vi = ?, name_en = ?, name_ja = ? WHERE id = ?',
          [cleanVi, cleanEn, cleanJa, dish.id],
          function(updateErr) {
            if (hasError) return;
            
            if (updateErr) {
              console.error(`❌ Error updating dish ${dish.id}:`, updateErr);
              hasError = true;
              return res.status(500).json({ error: `Lỗi cập nhật món ăn: ${updateErr.message}` });
            }
            
            console.log(`✅ Cleaned dish ${dish.id}: "${dish.name_vi}" -> "${cleanVi}"`);
            updated++;
            
            if (updated === total && !hasError) {
              console.log('🎉 Markdown cleanup completed successfully!');
              res.json({ 
                success: true, 
                message: `Đã làm sạch ${updated} món ăn, loại bỏ tất cả dấu ** và markdown formatting`,
                updatedCount: updated
              });
            }
          }
        );
      } else {
        updated++;
        if (updated === total && !hasError) {
          console.log('🎉 Markdown cleanup completed successfully!');
          res.json({ 
            success: true, 
            message: 'Tất cả món ăn đã sạch, không cần cập nhật',
            updatedCount: 0
          });
        }
      }
    });
  });
});

// ─── Test Endpoint ────────────────────────────────────────────
app.get('/api/test/payments', authMiddleware, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  
  console.log('🧪 Testing payment calculation...');
  
  db.all(`
    SELECT 
      u.id as userId,
      u.fullname,
      COUNT(o.id) as ordersCount,
      COALESCE(SUM(o.price), 0) as ordersTotal,
      COALESCE((SELECT SUM(amount) FROM payments WHERE user_id = u.id AND month = ?), 0) as paidTotal
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id AND strftime('%Y-%m', o.date) = ?
    GROUP BY u.id
    HAVING ordersCount > 0 OR paidTotal > 0
  `, [month, month], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi database' });
    
    const result = rows.map(row => {
      const ordersTotal = row.ordersTotal || 0;
      const paidTotal = row.paidTotal || 0;
      const remainingTotal = ordersTotal - paidTotal;
      
      console.log(`💰 ${row.fullname}:`);
      console.log(`   Orders: ${ordersTotal}đ, Paid: ${paidTotal}đ`);
      console.log(`   Raw remaining: ${remainingTotal}đ`);
      console.log(`   Final remaining: ${Math.max(0, remainingTotal)}đ`);
      
      return {
        fullname: row.fullname,
        ordersTotal: ordersTotal,
        paidTotal: paidTotal,
        rawRemaining: remainingTotal,
        finalRemaining: Math.max(0, remainingTotal),
        isNegative: remainingTotal < 0
      };
    });
    
    console.log('🧪 Test completed');
    res.json(result);
  });
});

// ─── Debug Endpoints (Development Only) ──────────────────────
if (process.env.NODE_ENV !== 'production') {
  // View all tables data
  app.get('/debug/tables', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const queries = {
      users: 'SELECT id, username, fullname, role, created_at FROM users',
      menus: 'SELECT * FROM menus ORDER BY date DESC LIMIT 10',
      dishes: 'SELECT * FROM dishes ORDER BY id DESC LIMIT 20',
      orders: 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 20',
      payments: 'SELECT * FROM payments ORDER BY created_at DESC LIMIT 20',
      feedback: 'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 10'
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.entries(queries).forEach(([table, query]) => {
      db.all(query, (err, rows) => {
        if (err) {
          results[table] = { error: err.message };
        } else {
          results[table] = rows;
        }
        
        completed++;
        if (completed === total) {
          res.json(results);
        }
      });
    });
  });

  // View specific table
  app.get('/debug/table/:tableName', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { tableName } = req.params;
    const allowedTables = ['users', 'menus', 'dishes', 'orders', 'payments', 'feedback'];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    let query = `SELECT * FROM ${tableName} ORDER BY `;
    query += tableName === 'users' ? 'id DESC' : 'created_at DESC';
    query += ' LIMIT 50';

    db.all(query, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ table: tableName, data: rows, count: rows.length });
      }
    });
  });

  // Database stats
  app.get('/debug/stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const statsQueries = {
      users: 'SELECT COUNT(*) as count FROM users',
      menus: 'SELECT COUNT(*) as count FROM menus',
      dishes: 'SELECT COUNT(*) as count FROM dishes',
      orders: 'SELECT COUNT(*) as count FROM orders',
      payments: 'SELECT COUNT(*) as count FROM payments',
      feedback: 'SELECT COUNT(*) as count FROM feedback'
    };

    const stats = {};
    let completed = 0;
    const total = Object.keys(statsQueries).length;

    Object.entries(statsQueries).forEach(([table, query]) => {
      db.get(query, (err, row) => {
        if (err) {
          stats[table] = { error: err.message };
        } else {
          stats[table] = row.count;
        }
        
        completed++;
        if (completed === total) {
          res.json(stats);
        }
      });
    });
  });
}

// ─── Server Start ────────────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`🔑 Login: admin/password hoặc demo/password`);
  });
  
  // Auto-delete menu at 23:00 every day
  const cron = require('node-cron');
  cron.schedule('0 23 * * *', () => {
    const today = new Date().toISOString().split('T')[0];
    db.run('DELETE FROM menus WHERE date = ?', [today], function(err) {
      if (err) {
        console.error('❌ Lỗi xóa menu tự động:', err);
      } else {
        console.log(`✅ Đã xóa menu ngày ${today} lúc 23:00`);
      }
    });
  });
  console.log('⏰ Đã thiết lập tự động xóa menu lúc 23:00 mỗi ngày');
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('❌ Lỗi đóng database:', err.message);
    } else {
      console.log('✅ Đã đóng database connection');
    }
    process.exit(0);
  });
});

// ─── Backup System ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production' && process.env.BACKUP_ENABLED === 'true') {
  const cron = require('node-cron');
  const fs = require('fs');
  
  // Create backups directory
  const backupDir = './backups';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Daily backup at 2 AM
  cron.schedule('0 2 * * *', () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = `${backupDir}/dining-${timestamp}.db`;
    
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
      
      // Keep only last 7 days of backups
      const files = fs.readdirSync(backupDir);
      const oldBackups = files
        .filter(f => f.startsWith('dining-') && f.endsWith('.db'))
        .sort()
        .slice(0, -7); // Keep last 7
      
      oldBackups.forEach(file => {
        fs.unlinkSync(`${backupDir}/${file}`);
        console.log(`🗑️ Deleted old backup: ${file}`);
      });
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
    }
  });
  
  console.log('📦 Auto backup enabled (daily at 2 AM)');
}

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  db.get('SELECT 1', (err) => {
    if (err) {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    } else {
      res.json({ 
        status: 'ok', 
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
  });
});

// ─── Production Middleware ───────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  
  // Rate limiting
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api/', limiter);
}