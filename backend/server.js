require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('=== FSI-DDS Server Starting ===');
console.log('Process ID:', process.pid);
console.log('Node Version:', process.version);
console.log('Target Port:', PORT);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials');
  console.error('SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Configured' : 'Missing');

// Middleware
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

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
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

// Database initialization
async function initDatabase() {
  console.log('Initializing Supabase tables...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (!error) {
      console.log('Tables already exist');
      console.log('Found', data || 0, 'users');
      return;
    }
    
    console.log('Tables need to be created via Supabase Dashboard');
    console.log('Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);
    console.log('Run the SQL commands from SUPABASE-SETUP.sql');
    
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Health Check
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

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username và password là bắt buộc' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

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

// Basic API routes
app.get('/api/menu/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: menu, error } = await supabase
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

    if (error && error.code !== 'PGRST116') {
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
    
    // Only admin can delete orders
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có thể xóa đơn hàng' });
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

// Get all users (for admin)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, fullname, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    res.json(users || []);
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Payments Routes
app.get('/api/payments/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        user:user_id (id, fullname)
      `)
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    res.json(payments || []);
  } catch (error) {
    console.error('Payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get payments with optional month filter
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    
    if (req.user.role === 'admin') {
      // Admin gets aggregated stats for all users
      const currentMonth = month || new Date().toISOString().slice(0, 7);
      const startDate = `${currentMonth}-01`;
      const endDate = `${currentMonth}-31`;
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, fullname, username');
      
      if (usersError) {
        return res.status(500).json({ error: 'Lỗi lấy danh sách users' });
      }
      
      const userStats = [];
      
      for (const user of users || []) {
        // Get user's orders for the month
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('price')
          .eq('user_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        // Get user's payments for the month
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (!ordersError && !paymentsError) {
          const ordersCount = orders?.length || 0;
          const ordersTotal = orders?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
          const paidTotal = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
          const remainingTotal = Math.max(0, ordersTotal - paidTotal);
          
          userStats.push({
            userId: user.id,
            fullname: user.fullname,
            username: user.username,
            month: currentMonth,
            ordersCount,
            ordersTotal,
            paidCount: payments?.length || 0,
            paidTotal,
            remainingCount: remainingTotal > 0 ? 1 : 0,
            remainingTotal,
            overpaidTotal: paidTotal > ordersTotal ? paidTotal - ordersTotal : 0
          });
        }
      }
      
      res.json(userStats);
    } else {
      // Regular user gets their own payment data
      const data = await paymentsAPI.getMy(month);
      res.json([data]); // Wrap in array for consistency
    }
  } catch (error) {
    console.error('Payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get payment history
app.get('/api/payments/history', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    let query = supabase
      .from('payments')
      .select(`
        *,
        user:user_id (id, fullname)
      `)
      .order('created_at', { ascending: false });

    if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data: payments, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    res.json(payments || []);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get my payments
app.get('/api/payments/my', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    
    // Calculate user's payment stats based on orders and payments
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${currentMonth}-01`;
    const endDate = `${currentMonth}-31`;
    
    // Get user's orders for the month
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('price')
      .eq('user_id', req.user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    // Get user's payments for the month
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('user_id', req.user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (ordersError || paymentsError) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    const ordersCount = orders?.length || 0;
    const ordersTotal = orders?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
    const paidTotal = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const remainingTotal = Math.max(0, ordersTotal - paidTotal);
    
    const stats = {
      month: currentMonth,
      ordersCount,
      ordersTotal,
      paidCount: payments?.length || 0,
      paidTotal,
      remainingCount: remainingTotal > 0 ? 1 : 0,
      remainingTotal,
      overpaidTotal: paidTotal > ordersTotal ? paidTotal - ordersTotal : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('My payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { amount, method, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    }

    const paymentData = {
      user_id: req.user.id,
      amount: amount,
      method: method || 'cash',
      notes: notes || null,
      status: 'completed'
    };

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Lỗi tạo thanh toán' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Mark payment as paid (admin only)
app.post('/api/payments/mark-paid', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { userId, month, amount } = req.body;
    
    if (!userId || !month || !amount) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const paymentData = {
      user_id: userId,
      amount: amount,
      method: 'admin_marked',
      notes: `Marked as paid by admin for ${month}`,
      status: 'completed'
    };

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Lỗi đánh dấu thanh toán' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get today's orders count
    const { count: ordersCount, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59');

    // Get today's revenue
    const { data: orders, error: revenueError } = await supabase
      .from('orders')
      .select('price')
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59');

    // Get today's payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59');

    if (ordersError || revenueError || paymentsError) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    const revenue = orders?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
    const totalPayments = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    res.json({
      ordersCount: ordersCount || 0,
      revenue,
      totalPayments,
      balance: totalPayments - revenue
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Admin dashboard stats
app.get('/api/admin/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get today's orders
    const { count: ordersToday, error: ordersTodayError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59');

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get popular dishes (simplified)
    const { data: popularDishes, error: dishesError } = await supabase
      .from('orders')
      .select(`
        dish1_id,
        dish1:dish1_id (name)
      `)
      .not('dish1_id', 'is', null)
      .limit(5);

    if (ordersTodayError || usersError || dishesError) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    // Count popular dishes
    const dishCounts = {};
    popularDishes?.forEach(order => {
      if (order.dish1?.name) {
        dishCounts[order.dish1.name] = (dishCounts[order.dish1.name] || 0) + 1;
      }
    });

    const popularDishesArray = Object.entries(dishCounts)
      .map(([name, orderCount]) => ({ name, orderCount }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    res.json({
      ordersToday: ordersToday || 0,
      totalUsers: totalUsers || 0,
      popularDishesCount: popularDishesArray.length,
      popularDishes: popularDishesArray
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Feedback Routes
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { subject, message, rating, comment } = req.body;
    
    // Support both old format (rating/comment) and new format (subject/message)
    const feedbackData = {
      user_id: req.user.id,
      subject: subject || null,
      message: message || comment || null,
      rating: rating || null,
      status: 'pending'
    };

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Lỗi gửi phản hồi' });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get all feedback (admin only)
app.get('/api/feedback', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select(`
        *,
        user:user_id (id, fullname, username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    // Format response to match frontend expectations
    const formattedFeedback = feedback?.map(f => ({
      id: f.id,
      subject: f.subject,
      message: f.message || f.comment,
      status: f.status || 'pending',
      created_at: f.created_at,
      fullname: f.user?.fullname || 'Unknown',
      username: f.user?.username || 'unknown'
    })) || [];

    res.json(formattedFeedback);
  } catch (error) {
    console.error('Feedback list error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Update feedback status (admin only)
app.patch('/api/feedback/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const feedbackId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const { error } = await supabase
      .from('feedback')
      .update({ status })
      .eq('id', feedbackId);

    if (error) {
      return res.status(500).json({ error: 'Lỗi cập nhật trạng thái' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Delete dish (admin only)
app.delete('/api/dishes/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const dishId = req.params.id;
    
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dishId);

    if (error) {
      return res.status(500).json({ error: 'Lỗi xóa món ăn' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Admin cleanup markdown
app.post('/api/admin/cleanup-markdown', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    // Get all dishes with markdown formatting
    const { data: dishes, error: fetchError } = await supabase
      .from('dishes')
      .select('id, name, name_vi, name_en, name_ja');

    if (fetchError) {
      return res.status(500).json({ error: 'Lỗi lấy dữ liệu món ăn' });
    }

    let updatedCount = 0;

    // Clean up each dish
    for (const dish of dishes || []) {
      const cleanName = dish.name?.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
      const cleanNameVi = dish.name_vi?.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
      const cleanNameEn = dish.name_en?.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
      const cleanNameJa = dish.name_ja?.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();

      // Only update if there were changes
      if (cleanName !== dish.name || cleanNameVi !== dish.name_vi || 
          cleanNameEn !== dish.name_en || cleanNameJa !== dish.name_ja) {
        
        const { error: updateError } = await supabase
          .from('dishes')
          .update({
            name: cleanName || dish.name,
            name_vi: cleanNameVi || dish.name_vi,
            name_en: cleanNameEn || dish.name_en,
            name_ja: cleanNameJa || dish.name_ja
          })
          .eq('id', dish.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Đã làm sạch ${updatedCount} món ăn`,
      updatedCount
    });
  } catch (error) {
    console.error('Cleanup markdown error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Orders weekly stats
app.get('/api/orders/weekly-stats', authenticateToken, async (req, res) => {
  try {
    // Get last 7 days of orders
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', startDate.toISOString().split('T')[0])
      .lte('created_at', endDate.toISOString().split('T')[0]);

    if (error) {
      return res.status(500).json({ error: 'Lỗi database' });
    }

    // Group by date
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders?.filter(order => 
        order.created_at.startsWith(dateStr)
      ).length || 0;

      stats.push({
        name: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        orders: dayOrders,
        date: dateStr
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Graceful shutdown
let server;

function cleanup() {
  console.log('Cleaning up...');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('Force exit after timeout');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup();
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('=== SERVER STARTED ===');
      console.log('URL: http://localhost:' + PORT);
      console.log('Database: Supabase PostgreSQL');
      console.log('Status: Ready');
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('ERROR: Port', PORT, 'is already in use');
        console.error('This usually means another instance is running');
        console.error('Render will automatically retry...');
        
        setTimeout(() => {
          process.exit(1);
        }, 2000);
      } else {
        console.error('Server error:', err);
        cleanup();
      }
    });
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();