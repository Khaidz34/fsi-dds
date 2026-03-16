require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Supabase Client ─────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey ? '✅ Configured' : '❌ Missing');

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
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
      /^https:\/\/.*\.railway\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
    ];
    
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') return pattern === origin;
      return pattern.test(origin);
    });
    
    callback(null, isAllowed);
  },
  credentials: true
}));

app.use(express.json());

// ─── Authentication Middleware ───────────────────────────────
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ─── Database Schema Setup ───────────────────────────────────
async function initDatabase() {
  console.log('🗄️  Initializing Supabase tables...');
  
  try {
    // Check if tables exist by trying to select from users table
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (!error) {
      console.log('✅ Tables already exist');
      console.log(`👥 Found ${data} users`);
      return;
    }
    
    console.log('📊 Tables need to be created via Supabase Dashboard');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);
    console.log('📝 Run the SQL commands from SUPABASE-SETUP.sql');
    
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}

// ─── Auth Routes ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username và password là bắt buộc' });
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, fullname } = req.body;

    if (!username || !password || !fullname) {
      return res.status(400).json({ error: 'Tất cả các trường là bắt buộc' });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          password: hashedPassword,
          fullname,
          role: 'user'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Lỗi tạo tài khoản' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// ─── Health Check ────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      return res.status(500).json({ 
        status: 'error', 
        database: 'disconnected',
        error: error.message 
      });
    }
    
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      users: data || 0
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'error',
      error: error.message 
    });
  }
});

// ─── Server Start ────────────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`🗄️  Database: Supabase PostgreSQL`);
    console.log(`🔗 Dashboard: https://supabase.com/dashboard`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// ─── Menu Routes ─────────────────────────────────────────────
app.get('/api/menu/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select(`
        id,
        date,
        image_url,
        dishes (
          id,
          name,
          name_vi,
          name_en,
          name_ja,
          sort_order
        )
      `)
      .eq('date', today)
      .single();

    if (menuError && menuError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    if (!menu) {
      return res.json({ dishes: [] });
    }

    // Sort dishes by sort_order
    if (menu.dishes) {
      menu.dishes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    res.json(menu);
  } catch (error) {
    console.error('Menu error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/menu/multilingual', authenticateToken, async (req, res) => {
  try {
    const { dishes, imageUrl } = req.body;
    
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return res.status(400).json({ error: 'Danh sách món ăn là bắt buộc' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Create menu
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert([{ date: today, image_url: imageUrl }])
      .select()
      .single();

    if (menuError) {
      return res.status(500).json({ error: 'Lỗi tạo menu' });
    }

    // Create dishes
    const dishData = dishes.map((dish, index) => ({
      menu_id: menu.id,
      name: dish.vi,
      name_vi: dish.vi,
      name_en: dish.en || dish.vi,
      name_ja: dish.ja || dish.vi,
      sort_order: index
    }));

    const { error: dishError } = await supabase
      .from('dishes')
      .insert(dishData);

    if (dishError) {
      return res.status(500).json({ error: 'Lỗi tạo món ăn' });
    }

    res.json({ success: true, menu });
  } catch (error) {
    console.error('Menu creation error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ─── Orders Routes ───────────────────────────────────────────
app.get('/api/orders/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        dish1:dish1_id (id, name, name_vi, name_en, name_ja),
        dish2:dish2_id (id, name, name_vi, name_en, name_ja),
        orderer:ordered_by (id, fullname),
        receiver:ordered_for (id, fullname)
      `)
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    res.json(orders || []);
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { dish1Id, dish2Id, orderedFor, notes, rating } = req.body;
    
    if (!dish1Id || !orderedFor) {
      return res.status(400).json({ error: 'Món chính và người nhận là bắt buộc' });
    }

    const orderData = {
      user_id: req.user.id,
      ordered_by: req.user.id,
      ordered_for: orderedFor,
      dish1_id: dish1Id,
      dish2_id: dish2Id || null,
      notes: notes || null,
      rating: rating || null,
      price: 40000
    };

    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Lỗi tạo đơn hàng' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { dish1Id, dish2Id, notes, rating } = req.body;
    
    if (!dish1Id) {
      return res.status(400).json({ error: 'Món chính là bắt buộc' });
    }

    // Check if user owns this order
    const { data: order, error: checkError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (checkError || !order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.id && order.ordered_by !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa đơn hàng này' });
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        dish1_id: dish1Id,
        dish2_id: dish2Id || null,
        notes: notes || null,
        rating: rating || null
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Lỗi cập nhật đơn hàng' });
    }

    res.json({
      success: true,
      message: 'Đã cập nhật đơn hàng thành công',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Check if user owns this order (admin can delete any)
    if (req.user.role !== 'admin') {
      const { data: order, error: checkError } = await supabase
        .from('orders')
        .select('user_id, ordered_by')
        .eq('id', orderId)
        .single();

      if (checkError || !order) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
      }

      if (order.user_id !== req.user.id && order.ordered_by !== req.user.id) {
        return res.status(403).json({ error: 'Không có quyền xóa đơn hàng này' });
      }
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      return res.status(500).json({ error: 'Lỗi xóa đơn hàng' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Order deletion error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ─── Users Routes ────────────────────────────────────────────
app.get('/api/users/list', authenticateToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, fullname')
      .order('fullname');

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    res.json(users || []);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ─── Server Start ────────────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`🗄️  Database: Supabase PostgreSQL`);
    console.log(`🔗 Dashboard: https://supabase.com/dashboard`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});