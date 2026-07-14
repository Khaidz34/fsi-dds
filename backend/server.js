require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 10000;

// Legacy cache functions for backward compatibility with menu/dishes caching
const legacyCache = {
  menus: { data: null, timestamp: 0, ttl: 5000 }, // 5 seconds
  dishes: { data: null, timestamp: 0, ttl: 5000 },
  users: { data: null, timestamp: 0, ttl: 5000 },
  stats: { data: null, timestamp: 0, ttl: 5000 }
};

const getCache = (key) => {
  const item = legacyCache[key];
  if (!item) return null;
  if (Date.now() - item.timestamp > item.ttl) {
    item.data = null;
    return null;
  }
  return item.data;
};

const setCache = (key, data) => {
  if (legacyCache[key]) {
    legacyCache[key].data = data;
    legacyCache[key].timestamp = Date.now();
  }
};

const clearCache = (key) => {
  if (legacyCache[key]) {
    legacyCache[key].data = null;
    legacyCache[key].timestamp = 0;
  }
};

// =====================================================
// SSE (Server-Sent Events) Manager for Real-time Updates
// =====================================================

const sseConnections = new Map(); // userId -> { res, lastHeartbeat }

const sendSSENotification = (userId, notification) => {
  const connection = sseConnections.get(userId);
  if (connection && connection.res && !connection.res.writableEnded) {
    try {
      connection.res.write(`data: ${JSON.stringify(notification)}\n\n`);
      console.log(`📤 SSE notification sent to user ${userId}:`, notification.type);
    } catch (err) {
      console.error(`❌ Error sending SSE to user ${userId}:`, err.message);
      sseConnections.delete(userId);
    }
  }
};

const sendSSEHeartbeat = (userId) => {
  const connection = sseConnections.get(userId);
  if (connection && connection.res && !connection.res.writableEnded) {
    try {
      connection.res.write(`:heartbeat\n\n`);
      connection.lastHeartbeat = Date.now();
    } catch (err) {
      console.error(`❌ Error sending heartbeat to user ${userId}:`, err.message);
      sseConnections.delete(userId);
    }
  }
};

// Send heartbeat to all connected users every 30 seconds
setInterval(() => {
  sseConnections.forEach((connection, userId) => {
    sendSSEHeartbeat(userId);
  });
}, 30000);

console.log('=== FSI-DDS Server Starting ===');
console.log('Process ID:', process.pid);
console.log('Node Version:', process.version);
console.log('Target Port:', PORT);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let supabaseConfigured = false;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  WARNING: Missing Supabase credentials');
  console.warn('SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.warn('SUPABASE_ANON_KEY:', supabaseKey ? 'OK' : 'MISSING');
  console.warn('Server will run in degraded mode - API calls will return empty data');
  console.warn('Please configure environment variables on Render Dashboard');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  supabaseConfigured = true;
  console.log('✅ Supabase URL:', supabaseUrl);
  console.log('✅ Supabase Key: Configured');
}

// #region agent log - Supabase config debug (H1)
try {
  fetch('http://127.0.0.1:7544/ingest/5638254c-5d2a-45e0-9641-548cdef6fb1b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'e63c99'
    },
    body: JSON.stringify({
      sessionId: 'e63c99',
      runId: 'initial',
      hypothesisId: 'H1',
      location: 'backend/server.js:SupabaseConfig',
      message: 'Supabase configuration status at startup',
      data: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        supabaseConfigured
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
} catch {}
// #endregion

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
      'https://fsi-dds-fontend.onrender.com',
      'https://fsi-dds.onrender.com',
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

// Enable gzip compression for responses
app.use(compression({
  level: 6, // Balance between compression ratio and CPU usage
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress SSE streams
    if (req.path.includes('/sse/')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json());

// Serve static files from public directory (frontend build)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting middleware - Per-user and per-IP limits
const rateLimitStore = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_PER_IP = 500; // 500 requests per minute per IP
const RATE_LIMIT_MAX_PER_USER = 100; // 100 requests per minute per user

const rateLimitMiddleware = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user?.id || 'anonymous';
  
  // Initialize rate limit tracking
  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  // Reset if window expired
  if (now > rateLimitStore[ip].resetTime) {
    rateLimitStore[ip] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  rateLimitStore[ip].count++;
  
  // Check IP-based rate limit
  if (rateLimitStore[ip].count > RATE_LIMIT_MAX_PER_IP) {
    console.warn(`⚠️  Rate limit exceeded for IP ${ip}`);
    return res.status(429).json({ error: 'Too many requests from this IP' });
  }
  
  // Check user-based rate limit (if authenticated)
  if (req.user?.id) {
    const userKey = `user_${userId}`;
    if (!rateLimitStore[userKey]) {
      rateLimitStore[userKey] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    }
    
    if (now > rateLimitStore[userKey].resetTime) {
      rateLimitStore[userKey] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    }
    
    rateLimitStore[userKey].count++;
    
    if (rateLimitStore[userKey].count > RATE_LIMIT_MAX_PER_USER) {
      console.warn(`⚠️  Rate limit exceeded for user ${userId}`);
      return res.status(429).json({ error: 'Too many requests' });
    }
  }
  
  next();
};

app.use(rateLimitMiddleware);

// Token validation cache
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5000; // 5 seconds

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Check cache first
    const cacheKey = `user_${decoded.userId}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TOKEN_CACHE_TTL) {
      req.user = cached.user;
      return next();
    }
    
    // Query database if not cached
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Cache the result
    tokenCache.set(cacheKey, { user, timestamp: Date.now() });
    
    // Clean up old cache entries
    if (tokenCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of tokenCache.entries()) {
        if (now - value.timestamp > TOKEN_CACHE_TTL * 2) {
          tokenCache.delete(key);
        }
      }
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
  
  // Skip if Supabase not configured
  if (!supabaseConfigured || !supabase) {
    console.warn('⚠️  Supabase not configured, skipping database initialization');
    return;
  }
  
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database initialization timeout')), 5000);
    });
    
    const dbPromise = supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    const { data, error } = await Promise.race([dbPromise, timeoutPromise]);
    
    if (!error) {
      console.log('✅ Tables already exist');
      console.log('Found', data || 0, 'users');
      return;
    }
    
    console.log('Tables need to be created via Supabase Dashboard');
    console.log('Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0]);
    console.log('Run the SQL commands from SUPABASE-SETUP.sql');
    
  } catch (err) {
    console.error('Database initialization error:', err.message);
    // Don't exit - continue with server startup
    console.log('Continuing server startup despite database error...');
  }
}

// Health Check
app.get('/health', async (req, res) => {
  // Simple health check without database dependency
  res.json({ 
    status: 'ok', 
    server: 'running',
    timestamp: new Date().toISOString(),
    message: 'Server is healthy'
  });
});

// Database health check (separate endpoint)
app.get('/health/db', async (req, res) => {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database health check timeout')), 5000);
    });
    
    const dbPromise = supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    const { data, error } = await Promise.race([dbPromise, timeoutPromise]);
    
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

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username và mật khẩu mới là bắt buộc' });
    }

    // Check if user exists
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    if (updateError) {
      console.error('Reset password error:', updateError);
      return res.status(500).json({ error: 'Lỗi cập nhật mật khẩu' });
    }

    res.json({ message: 'Mật khẩu đã được cập nhật thành công' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Test endpoint without database
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API routes
app.get('/api/menu/today', async (req, res) => {
  try {
    // #region agent log - Menu today entry (H1,H3)
    try {
      fetch('http://127.0.0.1:7544/ingest/5638254c-5d2a-45e0-9641-548cdef6fb1b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'e63c99'
        },
        body: JSON.stringify({
          sessionId: 'e63c99',
          runId: 'initial',
          hypothesisId: 'H3',
          location: 'backend/server.js:/api/menu/today',
          message: 'Entered /api/menu/today handler',
          data: {},
          timestamp: Date.now()
        })
      }).catch(() => {});
    } catch {}
    // #endregion

    // Check if Supabase is configured
    if (!supabaseConfigured || !supabase) {
      console.warn('⚠️  Supabase not configured, returning empty menu');
      return res.json({ 
        message: 'Database not configured. Please set SUPABASE_ANON_KEY on Render Dashboard.',
        dishes: [],
        date: new Date().toISOString().split('T')[0]
      });
    }

    // Check cache first
    const cachedMenu = getCache('menus');
    if (cachedMenu) {
      console.log('✅ Returning cached menu');
      return res.json(cachedMenu);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 8000);
    });
    
    const dbPromise = supabase
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

    const { data: menu, error } = await Promise.race([dbPromise, timeoutPromise]);

    // #region agent log - Menu today DB result (H3)
    try {
      fetch('http://127.0.0.1:7544/ingest/5638254c-5d2a-45e0-9641-548cdef6fb1b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'e63c99'
        },
        body: JSON.stringify({
          sessionId: 'e63c99',
          runId: 'initial',
          hypothesisId: 'H3',
          location: 'backend/server.js:/api/menu/today',
          message: 'Result from Supabase menus query',
          data: {
            hasError: !!error,
            errorMessage: error ? error.message : null,
            hasMenu: !!menu
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
    } catch {}
    // #endregion

    if (error && error.code !== 'PGRST116') {
      console.error('Menu database error:', error.message);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: 'Please try again later',
        dishes: [] 
      });
    }

    if (!menu) {
      return res.json({ 
        message: 'No menu for today',
        dishes: [] 
      });
    }

    // Sort dishes by sort_order
    if (menu.dishes) {
      menu.dishes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    // Cache the result
    setCache('menus', menu);

    res.json(menu);
  } catch (error) {
    console.error('Menu error:', error.message);
    // #region agent log - Menu today catch (H3)
    try {
      fetch('http://127.0.0.1:7544/ingest/5638254c-5d2a-45e0-9641-548cdef6fb1b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'e63c99'
        },
        body: JSON.stringify({
          sessionId: 'e63c99',
          runId: 'initial',
          hypothesisId: 'H3',
          location: 'backend/server.js:/api/menu/today',
          message: 'Caught error in /api/menu/today',
          data: {
            errorMessage: error instanceof Error ? error.message : String(error)
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
    } catch {}
    // #endregion
    res.status(500).json({ 
      error: 'Menu service temporarily unavailable',
      message: error.message,
      dishes: [] 
    });
  }
});

// Create simple menu (single language)
app.post('/api/menu', authenticateToken, async (req, res) => {
  try {
    console.log('=== CREATE MENU REQUEST ===');
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    console.log('Request body:', req.body);
    
    const { dishes, imageUrl } = req.body;
    
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      console.log('❌ Invalid dishes array');
      return res.status(400).json({ error: 'Danh sách món ăn là bắt buộc' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Delete existing menu for today
    const { error: deleteError } = await supabase
      .from('menus')
      .delete()
      .eq('date', today);

    if (deleteError) {
      console.error('❌ Error deleting old menu:', deleteError);
    }

    // Create new menu
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert([{ date: today, image_url: imageUrl || null }])
      .select()
      .single();

    if (menuError) {
      console.error('❌ Error creating menu:', menuError);
      return res.status(500).json({ error: 'Lỗi tạo menu: ' + menuError.message });
    }

    // Create dishes
    const dishData = dishes.map((dishName, index) => ({
      menu_id: menu.id,
      name: dishName.trim(),
      name_vi: dishName.trim(),
      name_en: dishName.trim(),
      name_ja: dishName.trim(),
      sort_order: index
    }));

    console.log('Dish data to insert:', dishData);

    const { error: dishError } = await supabase
      .from('dishes')
      .insert(dishData);

    if (dishError) {
      console.error('❌ Error creating dishes:', dishError);
      return res.status(500).json({ error: 'Lỗi tạo món ăn: ' + dishError.message });
    }

    console.log('✅ Menu created successfully:', menu);
    res.json({ success: true, menu });
  } catch (error) {
    console.error('❌ Menu creation error:', error);
    res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
});

app.post('/api/menu/multilingual', authenticateToken, async (req, res) => {
  try {
    console.log('=== CREATE MULTILINGUAL MENU REQUEST ===');
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    console.log('Request body:', req.body);
    
    const { dishes, imageUrl } = req.body;
    
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      console.log('❌ Invalid dishes array');
      return res.status(400).json({ error: 'Danh sách món ăn là bắt buộc' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Delete existing menu for today
    const { error: deleteError } = await supabase
      .from('menus')
      .delete()
      .eq('date', today);

    if (deleteError) {
      console.error('❌ Error deleting old menu:', deleteError);
    }

    // Create menu
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert([{ date: today, image_url: imageUrl || null }])
      .select()
      .single();

    if (menuError) {
      console.error('❌ Error creating multilingual menu:', menuError);
      return res.status(500).json({ error: 'Lỗi tạo menu: ' + menuError.message });
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

    console.log('Multilingual dish data to insert:', dishData);

    const { error: dishError } = await supabase
      .from('dishes')
      .insert(dishData);

    if (dishError) {
      console.error('❌ Error creating multilingual dishes:', dishError);
      return res.status(500).json({ error: 'Lỗi tạo món ăn: ' + dishError.message });
    }

    console.log('✅ Multilingual menu created successfully:', menu);
    
    // Clear cache when menu is created
    clearCache('menus');
    clearCache('dishes');
    
    res.json({ success: true, menu });
  } catch (error) {
    console.error('❌ Multilingual menu creation error:', error);
    res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
});

app.get('/api/orders/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        dish1:dish1_id (id, name, name_vi, name_en, name_ja, sort_order),
        dish2:dish2_id (id, name, name_vi, name_en, name_ja, sort_order),
        orderer:ordered_by (id, fullname),
        receiver:ordered_for (id, fullname)
      `)
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders query error:', error);
      return res.status(500).json({ error: 'Lỗi database' });
    }

    // Debug log - detailed
    console.log('📋 Orders fetched:', orders?.length || 0);
    if (orders && orders.length > 0) {
      orders.forEach((order, idx) => {
        console.log(`Order ${idx + 1}:`, {
          id: order.id,
          receiver: order.receiver?.fullname,
          dish1: order.dish1 ? { name: order.dish1.name, sort_order: order.dish1.sort_order } : null,
          dish2: order.dish2 ? { name: order.dish2.name, sort_order: order.dish2.sort_order } : null,
          notes: order.notes
        });
      });
    }

    res.json(orders || []);
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get user's own orders
app.get('/api/orders/my', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        dish1:dish1_id (id, name, name_vi, name_en, name_ja, sort_order),
        dish2:dish2_id (id, name, name_vi, name_en, name_ja, sort_order),
        orderer:ordered_by (id, fullname),
        receiver:ordered_for (id, fullname)
      `)
      .eq('user_id', req.user.id)
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('User orders query error:', error);
      return res.status(500).json({ error: 'Lỗi database' });
    }

    res.json(orders || []);
  } catch (error) {
    console.error('User orders error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get all orders (order history) - admin sees all, users see their own
app.get('/api/orders/all', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        dish1:dish1_id (id, name, name_vi, name_en, name_ja, sort_order),
        dish2:dish2_id (id, name, name_vi, name_en, name_ja, sort_order),
        orderer:user_id (id, fullname),
        receiver:ordered_for (id, fullname)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Admin sees all orders, regular users see their own orders + orders placed for them
    if (req.user.role !== 'admin') {
      // Use OR filter: show orders where user_id = current user OR ordered_for = current user
      console.log(`🔍 Applying OR filter for user ${req.user.id}: user_id.eq.${req.user.id},ordered_for.eq.${req.user.id}`);
      query = query.or(`user_id.eq.${req.user.id},ordered_for.eq.${req.user.id}`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('All orders query error:', error);
      return res.status(500).json({ error: 'Lỗi database' });
    }

    console.log('📋 All orders fetched:', orders?.length || 0);
    if (req.user.role !== 'admin') {
      const byUser = orders?.filter(o => o.user_id === req.user.id).length || 0;
      const forUser = orders?.filter(o => o.ordered_for === req.user.id).length || 0;
      console.log(`   - Orders placed by user: ${byUser}`);
      console.log(`   - Orders placed for user: ${forUser}`);
    }
    res.json(orders || []);
  } catch (error) {
    console.error('All orders error:', error);
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
      price: 40000,
      paid: false  // Explicitly set paid to false for new orders
    };

    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      console.error('Order creation error:', error);
      return res.status(500).json({ error: 'Lỗi tạo đơn hàng' });
    }

    // Fetch dish details for notifications
    const { data: dish1 } = await supabase
      .from('dishes')
      .select('name_vi, name_en, name_ja')
      .eq('id', dish1Id)
      .single();

    let dish2 = null;
    if (dish2Id) {
      const { data: dish2Data } = await supabase
        .from('dishes')
        .select('name_vi, name_en, name_ja')
        .eq('id', dish2Id)
        .single();
      dish2 = dish2Data;
    }

    // Fetch customer details
    const { data: customer } = await supabase
      .from('users')
      .select('fullname')
      .eq('id', orderedFor)
      .single();

    // Send SSE notification to the user whose payment is affected
    const currentMonth = new Date().toISOString().slice(0, 7);
    sendSSENotification(orderedFor, {
      type: 'order_created',
      userId: orderedFor,
      data: {
        orderId: order.id,
        price: order.price,
        month: currentMonth,
        timestamp: Date.now(),
        dish1Name: dish1?.name_vi,
        dish1NameEn: dish1?.name_en,
        dish1NameJa: dish1?.name_ja,
        dish2Name: dish2?.name_vi,
        dish2NameEn: dish2?.name_en,
        dish2NameJa: dish2?.name_ja,
        customerName: customer?.fullname,
        orderedFor: orderedFor
      }
    });

    // Also send notification to the person who placed the order (if different)
    if (req.user.id !== orderedFor) {
      sendSSENotification(req.user.id, {
        type: 'order_created',
        userId: req.user.id,
        data: {
          orderId: order.id,
          price: order.price,
          month: currentMonth,
          orderedFor: orderedFor,
          timestamp: Date.now(),
          dish1Name: dish1?.name_vi,
          dish1NameEn: dish1?.name_en,
          dish1NameJa: dish1?.name_ja,
          dish2Name: dish2?.name_vi,
          dish2NameEn: dish2?.name_en,
          dish2NameJa: dish2?.name_ja,
          customerName: customer?.fullname
        }
      });
    }

    // Broadcast notification to all admin and staff users
    const { data: adminStaffUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'staff']);

    if (adminStaffUsers && adminStaffUsers.length > 0) {
      console.log(`📢 Broadcasting order notification to ${adminStaffUsers.length} admin/staff users`);
      adminStaffUsers.forEach(user => {
        // Skip if already notified above
        if (user.id !== orderedFor && user.id !== req.user.id) {
          sendSSENotification(user.id, {
            type: 'order_created',
            userId: user.id,
            data: {
              orderId: order.id,
              price: order.price,
              month: currentMonth,
              orderedFor: orderedFor,
              timestamp: Date.now(),
              dish1Name: dish1?.name_vi,
              dish1NameEn: dish1?.name_en,
              dish1NameJa: dish1?.name_ja,
              dish2Name: dish2?.name_vi,
              dish2NameEn: dish2?.name_en,
              dish2NameJa: dish2?.name_ja,
              customerName: customer?.fullname
            }
          });
        }
      });
    }

    // Invalidate cache when order is created
    // Invalidate admin payments cache
    cache.invalidate(`payments:admin:${currentMonth}`, `order_created:user_${orderedFor}`);
    
    // Invalidate user-specific payment cache
    cache.invalidate(`payments:user:${orderedFor}:${currentMonth}`, `order_created`);
    
    // Invalidate stats caches
    cache.invalidate(`stats:dashboard:${currentMonth}`, `order_created`);
    cache.invalidate(`stats:user:${orderedFor}:${currentMonth}`, `order_created`);

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

    // Invalidate cache when order is updated
    const currentMonth = new Date().toISOString().slice(0, 7);
    const affectedUserId = order.ordered_for || order.user_id;
    
    // Invalidate admin payments cache
    cache.invalidate(`payments:admin:${currentMonth}`, `order_updated:user_${affectedUserId}`);
    
    // Invalidate user-specific payment cache
    cache.invalidate(`payments:user:${affectedUserId}:${currentMonth}`, `order_updated`);
    
    // Invalidate stats caches
    cache.invalidate(`stats:dashboard:${currentMonth}`, `order_updated`);
    cache.invalidate(`stats:user:${affectedUserId}:${currentMonth}`, `order_updated`);

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

    // Get order details before deletion to know which user to notify
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('user_id, price, ordered_for')
      .eq('id', orderId)
      .single();

    if (fetchError || !orderData) {
      return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
    }

    // Soft delete: mark as deleted instead of removing
    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      return res.status(500).json({ error: 'Lỗi xóa đơn hàng' });
    }

    // Determine who pays for this order
    const payingUserId = orderData.ordered_for || orderData.user_id;

    // Invalidate cache for the paying user's payment stats
    const month = new Date().toISOString().slice(0, 7);
    console.log(`🗑️  Invalidating cache for month ${month}, paying user: ${payingUserId}`);
    const invalidated1 = cache.invalidate(`payments:user:${payingUserId}:${month}`);
    const invalidated2 = cache.invalidate(`payments:admin:${month}`);
    const invalidated3 = cache.invalidate(`stats:dashboard:${month}`);
    const invalidated4 = cache.invalidate(`stats:user:${payingUserId}:${month}`);
    console.log(`🗑️  Cache invalidated: ${invalidated1 + invalidated2 + invalidated3 + invalidated4} entries`);

    console.log(`🗑️  Order ${orderId} deleted by admin ${req.user.id}, notifying paying user ${payingUserId}`);

    // Send SSE notification to the paying user
    sendSSENotification(payingUserId, {
      type: 'order_deleted',
      userId: payingUserId,
      data: {
        orderId,
        price: orderData.price,
        month
      },
      timestamp: Date.now()
    });

    // Also send notification to admin to update their dashboard
    console.log(`📢 Sending order_deleted notification to admin ${req.user.id}`);
    sendSSENotification(req.user.id, {
      type: 'order_deleted',
      userId: payingUserId,
      data: {
        orderId,
        price: orderData.price,
        month,
        affectedUserId: payingUserId
      },
      timestamp: Date.now()
    });

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

// =====================================================
// Payment Query Builder - Optimized JOIN queries
// =====================================================

/**
 * Build optimized payment stats query using single JOIN
 * Replaces N+1 query pattern with database aggregation
 */
const buildPaymentStatsQuery = async (supabase, month, limit = 20, offset = 0) => {
  // Validate pagination parameters
  const validLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const validOffset = Math.max(parseInt(offset) || 0, 0);

  const startDate = `${month}-01`;
  // Get next month for proper date range - JavaScript months are 0-indexed
  const [year, monthNum] = month.split('-');
  const monthIndex = parseInt(monthNum) - 1; // Convert 1-indexed to 0-indexed
  const nextMonthDate = new Date(parseInt(year), monthIndex + 1, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  try {
    // Try optimized SQL query - DEBT ONLY version
    const { data: userStats, error: statsError } = await supabase.rpc('get_payment_stats_debt_only', {
      p_month: month,
      p_start_date: `${startDate}T00:00:00Z`,
      p_next_month: `${nextMonth}T00:00:00Z`,
      p_limit: validLimit,
      p_offset: validOffset
    });

    if (!statsError && userStats) {
      console.log('✅ Using optimized get_payment_stats_debt_only function');
      
      // Get total count of users with debt
      const { data: totalCount, error: countError } = await supabase.rpc('get_debt_users_count', {
        p_month: month,
        p_start_date: `${startDate}T00:00:00Z`,
        p_next_month: `${nextMonth}T00:00:00Z`
      });

      return {
        data: userStats || [],
        total: totalCount || 0,
        limit: validLimit,
        offset: validOffset
      };
    }

    console.log('⚠️  Debt-only function not available, trying original function');
    
    // Fallback to original function
    const { data: allUserStats, error: allStatsError } = await supabase.rpc('get_payment_stats', {
      p_month: month,
      p_start_date: `${startDate}T00:00:00Z`,
      p_next_month: `${nextMonth}T00:00:00Z`,
      p_limit: 1000, // Get all users first
      p_offset: 0
    });

    if (!allStatsError && allUserStats) {
      console.log('✅ Using original get_payment_stats function with client-side filtering');
      
      // Filter users with debt
      const usersWithDebt = allUserStats.filter(user => user.remainingTotal > 0);
      
      // Sort by debt amount (highest first)
      usersWithDebt.sort((a, b) => b.remainingTotal - a.remainingTotal);
      
      // Apply pagination
      const paginatedData = usersWithDebt.slice(validOffset, validOffset + validLimit);
      
      return {
        data: paginatedData,
        total: usersWithDebt.length,
        limit: validLimit,
        offset: validOffset
      };
    }

    console.log('⚠️  Function not available, using simple query');
  } catch (err) {
    console.error('❌ Error with optimized query:', err.message);
  }

  // Fallback: Simple query without complex aggregation
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, fullname, username')
      .eq('role', 'user')
      .order('fullname')
      .range(validOffset, validOffset + validLimit - 1);

    if (usersError) throw usersError;

    // Simple calculation without async loops
    const userStats = users.map(user => ({
      userId: user.id,
      fullname: user.fullname,
      username: user.username,
      month,
      ordersCount: 0,
      ordersTotal: 0,
      paidCount: 0,
      paidTotal: 0,
      remainingCount: 0,
      remainingTotal: 0,
      overpaidTotal: 0
    }));

    const { count: totalCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    return {
      data: userStats,
      total: totalCount || 0,
      limit: validLimit,
      offset: validOffset
    };
  } catch (err) {
    console.error('❌ Fallback query failed:', err.message);
    // Return empty data instead of throwing error
    return {
      data: [],
      total: 0,
      limit: validLimit,
      offset: validOffset
    };
  }
};

/**
 * Get single user payment stats
 */
const getUserPaymentStats = async (supabase, userId, month) => {
  // Check cache first
  const cacheKey = `payments:user:${userId}:${month}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for ${cacheKey}`);
    return cached;
  }

  // Calculate next month for upper bound filter
  const [year, monthNum] = month.split('-');
  const monthIndex = parseInt(monthNum) - 1; // Convert 1-indexed to 0-indexed
  const nextMonthDate = new Date(parseInt(year), monthIndex + 1, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  
  console.log(`💰 User payment stats: userId=${userId}, month=${month}, calculating cumulative debt up to ${nextMonth}`);
  
  // Get user's cumulative orders (from all time up to selected month)
  // FIX: Use OR filter to include orders placed BY user AND orders placed FOR user
  console.log(`🔍 Querying orders with OR filter: user_id.eq.${userId},ordered_for.eq.${userId}`);
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, price, paid, user_id, ordered_for')
    .or(`user_id.eq.${userId},ordered_for.eq.${userId}`)
    .is('deleted_at', null)
    .lt('created_at', `${nextMonth}T00:00:00Z`);
  
  // Get user's cumulative payments (from all time up to selected month)
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('user_id', userId)
    .lt('created_at', `${nextMonth}T00:00:00Z`);
  
  if (ordersError) {
    console.error(`❌ Orders error for user ${userId}:`, ordersError);
    throw ordersError;
  }
  if (paymentsError) {
    console.error(`❌ Payments error for user ${userId}:`, paymentsError);
    throw paymentsError;
  }
  
  const ordersCount = orders?.length || 0;
  
  // FIX: Only count orders where user is the one who PAYS
  // If ordered_for is set, that person pays. Otherwise, user_id pays.
  const ordersForPayment = orders?.filter(order => {
    // If ordered_for is set, only count if user is the one paying (ordered_for = userId)
    if (order.ordered_for) {
      return order.ordered_for === userId;
    }
    // If ordered_for is not set, user_id is the one paying
    return order.user_id === userId;
  }) || [];
  
  const ordersTotal = ordersForPayment.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
  const paidTotal = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const remainingTotal = Math.max(0, ordersTotal - paidTotal);
  
  // Count paid and unpaid orders based on 'paid' field
  const paidOrders = ordersForPayment?.filter(order => order.paid === true) || [];
  const unpaidOrders = ordersForPayment?.filter(order => order.paid === false || !order.paid) || [];
  const paidCount = paidOrders.length;
  const remainingCount = unpaidOrders.length;
  
  console.log(`  📊 ${ordersCount} total orders, ${ordersForPayment.length} orders to pay (${ordersTotal}đ), paid: ${paidCount} orders, unpaid: ${remainingCount} orders, money remaining: ${remainingTotal}đ`);
  if (ordersCount > 0) {
    const byUser = orders?.filter(o => o.user_id === userId).length || 0;
    const forUser = orders?.filter(o => o.ordered_for === userId).length || 0;
    console.log(`     - Orders placed by user: ${byUser}`);
    console.log(`     - Orders placed for user: ${forUser}`);
    console.log(`     - Orders user must pay for: ${ordersForPayment.length}`);
  }
  
  const result = {
    month,
    ordersCount,
    ordersTotal,
    paidCount,
    paidTotal,
    remainingCount,
    remainingTotal,
    overpaidTotal: paidTotal > ordersTotal ? paidTotal - ordersTotal : 0
  };

  // Cache for 10 minutes
  cache.set(cacheKey, result, 10 * 60 * 1000);
  
  return result;
};

// =====================================================
// Automatic bank-transfer payment helpers
// =====================================================

const PAYMENT_MEAL_PRICE = Number(process.env.PAYMENT_MEAL_PRICE || 40000);
const AUTO_PAYMENT_MONTHLY_LIMIT = (() => {
  const configuredLimit = Number(process.env.AUTO_PAYMENT_MONTHLY_LIMIT || 50);
  return Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.floor(configuredLimit)
    : null;
})();
const getAutoPaymentUsedOffset = (month) => {
  const monthKey = String(month || '').replace(/[^0-9]/g, '');
  const monthSpecificOffset = monthKey ? process.env[`AUTO_PAYMENT_USED_OFFSET_${monthKey}`] : undefined;
  const configuredOffset = Number(monthSpecificOffset ?? process.env.AUTO_PAYMENT_USED_OFFSET ?? 0);

  return Number.isFinite(configuredOffset) && configuredOffset > 0
    ? Math.floor(configuredOffset)
    : 0;
};
const SEPAY_API_BASE_URL = (process.env.SEPAY_API_BASE_URL || 'https://userapi.sepay.vn/v2')
  .toString()
  .replace(/\/+$/, '');

const getSePayApiToken = () => (
  process.env.SEPAY_API_TOKEN ||
  process.env.SEPAY_ACCESS_TOKEN ||
  ''
).toString().trim();

const getSePayUsageAccountNo = () => (
  process.env.SEPAY_USAGE_ACCOUNT_NO ||
  process.env.AUTO_PAYMENT_ACCOUNT_NO ||
  ''
).toString().replace(/\s+/g, '');

const getPreviousDate = (dateString) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const fetchSePayTransactionUsage = async ({ startDate, nextMonthDate }) => {
  const apiToken = getSePayApiToken();
  if (!apiToken || typeof fetch !== 'function') return null;

  const buildParams = () => new URLSearchParams({
    transaction_date_from: startDate,
    transaction_date_to: getPreviousDate(nextMonthDate),
    amount_in_min: '1',
    per_page: '1',
    page: '1'
  });

  const accountNo = getSePayUsageAccountNo();
  const params = buildParams();
  if (accountNo) {
    params.set('account_number', accountNo);
  }

  const requestUsageTotal = async (queryParams) => {
    const response = await fetch(`${SEPAY_API_BASE_URL}/transactions?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('SePay usage sync failed:', response.status, body.slice(0, 300));
      return null;
    }

    const payload = await response.json();
    const total = Number(
      payload?.meta?.pagination?.total ??
      payload?.pagination?.total ??
      payload?.meta?.total
    );

    return Number.isFinite(total) && total >= 0 ? Math.floor(total) : null;
  };

  try {
    const scopedTotal = await requestUsageTotal(params);
    if (scopedTotal !== null || !accountNo) return scopedTotal;

    return requestUsageTotal(buildParams());
  } catch (error) {
    console.warn('SePay usage sync error:', error.message);
    return null;
  }
};
const AUTO_PAYMENT_PREFIX = (process.env.AUTO_PAYMENT_PREFIX || 'FSI')
  .toString()
  .replace(/[^a-zA-Z0-9]/g, '')
  .toUpperCase() || 'FSI';

const isValidPaymentMonth = (month) => {
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) return false;
  const monthNumber = Number(month.slice(5, 7));
  return monthNumber >= 1 && monthNumber <= 12;
};

const normalizePaymentMonth = (month) => {
  const candidate = typeof month === 'string' ? month.trim() : '';
  return isValidPaymentMonth(candidate) ? candidate : new Date().toISOString().slice(0, 7);
};

const getPaymentMonthBounds = (month) => {
  const safeMonth = normalizePaymentMonth(month);
  const [year, monthNum] = safeMonth.split('-').map(Number);
  const nextMonthDate = new Date(year, monthNum, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    month: safeMonth,
    startDate: `${safeMonth}-01`,
    nextMonthDate: `${nextMonth}-01`
  };
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildAutoPaymentCode = (userId, month) => {
  const safeMonth = normalizePaymentMonth(month).replace('-', '');
  return `${AUTO_PAYMENT_PREFIX}${Number(userId)}M${safeMonth}`;
};

const parseAutoPaymentCode = (content = '') => {
  const compactContent = String(content).replace(/\s+/g, '').toUpperCase();
  const match = compactContent.match(new RegExp(`${escapeRegExp(AUTO_PAYMENT_PREFIX)}(\\d+)M(\\d{6})`, 'i'));

  if (!match) return null;

  const userId = Number(match[1]);
  const monthDigits = match[2];
  const month = `${monthDigits.slice(0, 4)}-${monthDigits.slice(4, 6)}`;

  if (!Number.isInteger(userId) || userId <= 0 || !isValidPaymentMonth(month)) {
    return null;
  }

  return {
    userId,
    month,
    code: `${AUTO_PAYMENT_PREFIX}${userId}M${monthDigits}`
  };
};

const parsePaymentNotes = (notes = '') => {
  return String(notes || '').split('|').reduce((metadata, part) => {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex <= 0) return metadata;

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key && value) metadata[key] = value;
    return metadata;
  }, {});
};

const normalizeVietnameseName = (value = '') => {
  const cleaned = String(value)
    .normalize('NFC')
    .replace(/[_*#~`"'()[\]{}<>|\\/]+/g, ' ')
    .replace(/\b(bankapinotify|tpbank|vietqr|napas|sepay|webhook|notify|notification)\b/gi, ' ')
    .replace(/\b(chuyen|chuyển|ck|ct|transfer|payment|pay|thanh\s*toan|thanh\s*toán|naptien|nap\s*tien)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 3) return '';
  if (new RegExp(`${escapeRegExp(AUTO_PAYMENT_PREFIX)}\\d+M\\d{6}`, 'i').test(cleaned)) return '';
  if (/^[\d\s.,+-]+$/.test(cleaned)) return '';

  return cleaned.slice(0, 120);
};

const extractPayerNameFromDescription = (description = '') => {
  let value = String(description || '');
  if (!value) return '';

  value = value
    .replace(new RegExp(`${escapeRegExp(AUTO_PAYMENT_PREFIX)}\\d+M\\d{6}`, 'ig'), ' ')
    .replace(/\b[A-Z]{1,4}\d{8,}\b/gi, ' ')
    .replace(/\b(SO\s*GD|REF|REFERENCE|MA\s*GD|MÃ\s*GD|MAGD)\s*[:#-]?\s*[\w-]+/gi, ' ')
    .replace(/\b\d{6,}\b/g, ' ');

  return normalizeVietnameseName(value);
};

const extractPayerNameFromPayload = (body = {}, description = '') => {
  const directPayer = findValueDeep(body, [
    'senderName',
    'senderAccountName',
    'fromAccountName',
    'debitAccountName',
    'counterAccountName',
    'counterPartyName',
    'payerName',
    'payer',
    'remitterName',
    'benefactorName',
    'customerName'
  ]);

  return normalizeVietnameseName(directPayer || '') || extractPayerNameFromDescription(description);
};

const enrichPaymentHistoryRow = (payment) => {
  if (!payment) return payment;

  const metadata = parsePaymentNotes(payment.notes);
  const payerName = payment.payer_name || metadata.payer || metadata.sender || '';

  return {
    ...payment,
    payer_name: payerName || null,
    payerName: payerName || null,
    payment_code: payment.payment_code || metadata.code || null,
    transaction_id: payment.transaction_id || metadata.transaction || null,
    transfer_description: payment.transfer_description || metadata.description || null
  };
};

const parseMoneyAmount = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  let normalized = value.replace(/[^\d.,-]/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (hasComma) {
    const parts = normalized.split(',');
    normalized = parts.length > 1 && parts[parts.length - 1].length === 3
      ? normalized.replace(/,/g, '')
      : normalized.replace(',', '.');
  } else if (hasDot) {
    const parts = normalized.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      normalized = normalized.replace(/\./g, '');
    }
  }

  return Number(normalized);
};

const normalizeObjectKey = (key) => String(key).toLowerCase().replace(/[\s_-]/g, '');

const findValueDeep = (value, candidateKeys, depth = 0) => {
  if (!value || depth > 5) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValueDeep(item, candidateKeys, depth + 1);
      if (found !== undefined && found !== null && found !== '') return found;
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  const normalizedCandidates = candidateKeys.map(normalizeObjectKey);
  for (const [key, childValue] of Object.entries(value)) {
    if (normalizedCandidates.includes(normalizeObjectKey(key)) && childValue !== undefined && childValue !== null && childValue !== '') {
      return childValue;
    }
  }

  for (const childValue of Object.values(value)) {
    if (childValue && typeof childValue === 'object') {
      const found = findValueDeep(childValue, candidateKeys, depth + 1);
      if (found !== undefined && found !== null && found !== '') return found;
    }
  }

  return undefined;
};

const extractAutoPaymentTransaction = (body = {}) => {
  const amount = parseMoneyAmount(findValueDeep(body, [
    'transferAmount',
    'amount',
    'creditAmount',
    'inAmount',
    'transactionAmount',
    'money'
  ]));

  const description = findValueDeep(body, [
    'transferContent',
    'transactionContent',
    'bankTransactionContent',
    'description',
    'content',
    'memo',
    'remark'
  ]);

  const transactionId = findValueDeep(body, [
    'transactionId',
    'referenceCode',
    'referenceId',
    'refNo',
    'tid',
    'id',
    'code'
  ]);

  const direction = String(findValueDeep(body, [
    'transferType',
    'transactionType',
    'direction',
    'type'
  ]) || '').toLowerCase();

  const status = String(findValueDeep(body, [
    'status',
    'transactionStatus'
  ]) || '').toLowerCase();

  return {
    amount,
    description: description ? String(description) : '',
    transactionId: transactionId ? String(transactionId) : '',
    payerName: extractPayerNameFromPayload(body, description ? String(description) : ''),
    direction,
    status
  };
};

const isOutgoingAutoPayment = (transaction) => {
  const direction = transaction.direction || '';
  return ['out', 'debit', 'withdraw', 'withdrawal', 'moneyout'].some((keyword) => direction.includes(keyword));
};

const isFailedAutoPayment = (transaction) => {
  const status = transaction.status || '';
  return ['fail', 'failed', 'cancel', 'cancelled', 'error', 'reject'].some((keyword) => status.includes(keyword));
};

const buildVietQrUrl = ({ amount, code }) => {
  const bankId = process.env.AUTO_PAYMENT_BANK_ID;
  const accountNo = process.env.AUTO_PAYMENT_ACCOUNT_NO;

  if (!bankId || !accountNo || !amount || amount <= 0) {
    return null;
  }

  const template = process.env.AUTO_PAYMENT_QR_TEMPLATE || 'compact2';
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: code
  });

  if (process.env.AUTO_PAYMENT_ACCOUNT_NAME) {
    params.set('accountName', process.env.AUTO_PAYMENT_ACCOUNT_NAME);
  }

  return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(template)}.png?${params.toString()}`;
};

const getAutoPaymentBankInfo = () => {
  const bankId = process.env.AUTO_PAYMENT_BANK_ID || '';
  const accountNo = process.env.AUTO_PAYMENT_ACCOUNT_NO || '';
  const accountName = process.env.AUTO_PAYMENT_ACCOUNT_NAME || '';

  if (!bankId || !accountNo) {
    return null;
  }

  return { bankId, accountNo, accountName };
};

const isMissingOptionalPaymentSchema = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('column') || message.includes('schema cache') || message.includes('relation') || message.includes('auto_payment_transactions');
};

const isAutoPaymentStatusConstraintError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === '23514' && message.includes('status');
};

const insertPaymentRecord = async ({ userId, amount, source, notes, payerName }) => {
  const basePaymentData = {
    user_id: userId,
    amount,
    status: 'completed'
  };

  const paymentDataWithMetadata = {
    ...basePaymentData,
    method: source === 'manual' ? 'cash' : 'transfer',
    notes,
    ...(payerName ? { payer_name: payerName } : {})
  };

  let insertResult = await supabase
    .from('payments')
    .insert([paymentDataWithMetadata])
    .select()
    .single();

  if (insertResult.error && isMissingOptionalPaymentSchema(insertResult.error) && payerName) {
    const { payer_name, ...metadataWithoutPayerName } = paymentDataWithMetadata;
    insertResult = await supabase
      .from('payments')
      .insert([metadataWithoutPayerName])
      .select()
      .single();
  }

  if (insertResult.error && isMissingOptionalPaymentSchema(insertResult.error)) {
    console.warn('Auto payment metadata columns are not available, inserting minimal payment row');
    insertResult = await supabase
      .from('payments')
      .insert([basePaymentData])
      .select()
      .single();
  }

  if (insertResult.error) {
    throw insertResult.error;
  }

  return insertResult.data;
};

const reserveAutoPaymentEvent = async ({ source, transactionId, paymentCode, userId, month, amount, description, payerName, rawPayload, status = 'processing', errorMessage }) => {
  if (!transactionId) {
    return { supported: false, duplicate: false, event: null };
  }

  const safeAmount = Number(amount);
  const baseEventData = {
    provider: source,
    transaction_id: transactionId.slice(0, 180),
    payment_code: paymentCode || 'UNMATCHED',
    user_id: Number.isInteger(Number(userId)) && Number(userId) > 0 ? Number(userId) : null,
    month: normalizePaymentMonth(month),
    amount: Number.isFinite(safeAmount) && safeAmount > 0 ? safeAmount : 0,
    description: description ? description.slice(0, 1000) : null,
    raw_payload: rawPayload,
    status,
    ...(errorMessage ? { error_message: String(errorMessage).slice(0, 500) } : {})
  };

  const eventData = {
    ...baseEventData,
    ...(payerName ? { payer_name: payerName.slice(0, 120) } : {})
  };

  let { data, error } = await supabase
    .from('auto_payment_transactions')
    .insert([eventData])
    .select()
    .single();

  if (error && isMissingOptionalPaymentSchema(error) && payerName) {
    const fallbackResult = await supabase
      .from('auto_payment_transactions')
      .insert([baseEventData])
      .select()
      .single();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error && status === 'ignored' && isAutoPaymentStatusConstraintError(error)) {
    const fallbackResult = await supabase
      .from('auto_payment_transactions')
      .insert([{
        ...eventData,
        status: 'failed',
        error_message: errorMessage ? `ignored:${String(errorMessage).slice(0, 450)}` : 'ignored'
      }])
      .select()
      .single();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (!error) {
    return { supported: true, duplicate: false, event: data };
  }

  if (error.code === '23505') {
    const { data: existingEvent } = await supabase
      .from('auto_payment_transactions')
      .select('id, payment_id, status')
      .eq('provider', eventData.provider)
      .eq('transaction_id', eventData.transaction_id)
      .limit(1)
      .single();

    if (existingEvent?.payment_id) {
      return { supported: true, duplicate: true, event: existingEvent };
    }

    return { supported: true, duplicate: false, event: existingEvent || null };
  }

  if (isMissingOptionalPaymentSchema(error)) {
    console.warn('auto_payment_transactions table is not available; webhook duplicate protection is limited');
    return { supported: false, duplicate: false, event: null };
  }

  throw error;
};

const updateAutoPaymentEvent = async (eventId, values) => {
  if (!eventId) return;

  let { error } = await supabase
    .from('auto_payment_transactions')
    .update(values)
    .eq('id', eventId);

  if (error && values?.status === 'ignored' && isAutoPaymentStatusConstraintError(error)) {
    const fallbackValues = {
      ...values,
      status: 'failed',
      error_message: values.error_message ? `ignored:${String(values.error_message).slice(0, 450)}` : 'ignored'
    };
    const fallbackResult = await supabase
      .from('auto_payment_transactions')
      .update(fallbackValues)
      .eq('id', eventId);
    error = fallbackResult.error;
  }

  if (error && !isMissingOptionalPaymentSchema(error)) {
    console.warn('Could not update auto payment event:', error.message);
  }
};

const markOrdersPaidForPayment = async ({ userId, month, amount }) => {
  const { startDate, nextMonthDate } = getPaymentMonthBounds(month);
  const remainingAmount = Number(amount);

  if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
    return { markedCount: 0, markedTotal: 0, orderIds: [] };
  }

  const { data: unpaidOrders, error } = await supabase
    .from('orders')
    .select('id, price, created_at, user_id, ordered_for')
    .or(`ordered_for.eq.${userId},user_id.eq.${userId}`)
    .eq('paid', false)
    .is('deleted_at', null)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lt('created_at', `${nextMonthDate}T00:00:00Z`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching unpaid orders for payment:', error);
    throw error;
  }

  const payableOrders = (unpaidOrders || []).filter((order) => {
    if (order.ordered_for) {
      return order.ordered_for === userId;
    }
    return order.user_id === userId;
  });

  let availableAmount = remainingAmount;
  const ordersToMarkPaid = [];
  let markedTotal = 0;

  for (const order of payableOrders) {
    const orderPrice = Number(order.price || PAYMENT_MEAL_PRICE);
    if (!Number.isFinite(orderPrice) || orderPrice <= 0) continue;
    if (availableAmount + 0.001 < orderPrice) break;

    ordersToMarkPaid.push(order);
    availableAmount -= orderPrice;
    markedTotal += orderPrice;
  }

  const orderIds = ordersToMarkPaid.map((order) => order.id);

  if (orderIds.length === 0) {
    return { markedCount: 0, markedTotal: 0, orderIds: [] };
  }

  const { data: updatedOrders, error: updateError } = await supabase
    .from('orders')
    .update({ paid: true })
    .in('id', orderIds)
    .select('id');

  if (updateError) {
    console.error('Error marking orders as paid:', updateError);
    throw updateError;
  }

  return {
    markedCount: updatedOrders?.length || 0,
    markedTotal,
    orderIds
  };
};

const invalidatePaymentCaches = (userId, month, reason = 'payment_updated') => {
  cache.invalidate(`payments:admin:${month}`, `${reason}:user_${userId}`);
  cache.invalidate(`payments:user:${userId}:${month}`, reason);
  cache.invalidate(`stats:dashboard:${month}`, reason);
  cache.invalidate(`stats:user:${userId}:${month}`, reason);
};

const recordCompletedPayment = async ({ userId, month, amount, source = 'manual', paymentCode, transactionId, description, payerName, rawPayload, actorUserId }) => {
  const safeMonth = normalizePaymentMonth(month);
  const numericAmount = Number(amount);

  if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
    const error = new Error('Invalid payment user');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error('Invalid payment amount');
    error.statusCode = 400;
    throw error;
  }

  const code = paymentCode || buildAutoPaymentCode(userId, safeMonth);
  const notes = [
    `source:${source}`,
    `code:${code}`,
    transactionId ? `transaction:${String(transactionId).slice(0, 180)}` : null,
    payerName ? `payer:${String(payerName).slice(0, 120)}` : null,
    description ? `description:${String(description).slice(0, 500)}` : null
  ].filter(Boolean).join(' | ');

  const payment = await insertPaymentRecord({
    userId,
    amount: numericAmount,
    source,
    notes,
    payerName
  });

  const paidOrders = await markOrdersPaidForPayment({
    userId: Number(userId),
    month: safeMonth,
    amount: numericAmount
  });

  const notificationType = source === 'manual' ? 'payment_marked' : 'payment_auto_completed';
  sendSSENotification(Number(userId), {
    type: notificationType,
    userId: Number(userId),
    data: {
      amount: numericAmount,
      month: safeMonth,
      paymentCode: code,
      markedCount: paidOrders.markedCount,
      timestamp: Date.now()
    }
  });

  if (actorUserId && Number(actorUserId) !== Number(userId)) {
    sendSSENotification(Number(actorUserId), {
      type: notificationType,
      userId: Number(userId),
      data: {
        amount: numericAmount,
        month: safeMonth,
        paymentCode: code,
        markedCount: paidOrders.markedCount,
        timestamp: Date.now()
      }
    });
  }

  invalidatePaymentCaches(Number(userId), safeMonth, source === 'manual' ? 'payment_marked' : 'payment_auto_completed');

  return {
    payment,
    paidOrders,
    rawPayload
  };
};

const hasValidAutoPaymentSecret = (req) => {
  const configuredSecret = process.env.AUTO_PAYMENT_WEBHOOK_SECRET;
  if (!configuredSecret) return false;

  const headerSecret = req.get('X-Auto-Payment-Secret');
  const authHeader = req.get('Authorization') || '';
  const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeySecret = authHeader.startsWith('Apikey ') ? authHeader.slice(7) : '';

  return headerSecret === configuredSecret || bearerSecret === configuredSecret || apiKeySecret === configuredSecret;
};

// Debug endpoint to check payment data
app.get('/api/debug/payments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Check users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, fullname, username, role');
    
    // Check orders
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, price, created_at')
      .is('deleted_at', null);
    
    // Check payments
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, user_id, amount, created_at');

    res.json({
      users: {
        count: allUsers?.length || 0,
        data: allUsers || [],
        error: usersError
      },
      orders: {
        count: allOrders?.length || 0,
        data: allOrders?.slice(0, 5) || [],
        error: ordersError
      },
      payments: {
        count: allPayments?.length || 0,
        data: allPayments?.slice(0, 5) || [],
        error: paymentsError
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
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

    res.json((payments || []).map(enrichPaymentHistoryRow));
  } catch (error) {
    console.error('Payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get payments with optional month filter and pagination
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { month, limit, offset } = req.query;
    
    if (req.user.role === 'admin') {
      // Admin gets aggregated stats for all users with pagination
      const currentMonth = month || new Date().toISOString().slice(0, 7);
      
      // Validate pagination parameters
      const validLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const validOffset = Math.max(parseInt(offset) || 0, 0);
      
      // Check cache first (5-minute TTL for admin payments)
      const cacheKey = `payments:admin:${currentMonth}`;
      const cachedResult = cache.get(cacheKey);
      
      if (cachedResult) {
        // Apply pagination to cached data
        const paginatedData = cachedResult.data.slice(validOffset, validOffset + validLimit);
        const totalPages = Math.ceil(cachedResult.total / validLimit);
        const currentPage = Math.floor(validOffset / validLimit) + 1;
        
        return res.json({
          data: paginatedData,
          pagination: {
            total: cachedResult.total,
            page: currentPage,
            pageSize: validLimit,
            hasMore: validOffset + validLimit < cachedResult.total,
            totalPages
          },
          cached: true
        });
      }
      
      try {
        const result = await buildPaymentStatsQuery(supabase, currentMonth, validLimit, validOffset);
        
        // Cache the full result (without pagination applied)
        cache.set(cacheKey, {
          data: result.data,
          total: result.total
        }, 10 * 60 * 1000); // 10-minute TTL (increased from 5 for better performance)
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(result.total / validLimit);
        const currentPage = Math.floor(validOffset / validLimit) + 1;
        
        res.json({
          data: result.data,
          pagination: {
            total: result.total,
            page: currentPage,
            pageSize: validLimit,
            hasMore: validOffset + validLimit < result.total,
            totalPages
          },
          cached: false
        });
      } catch (error) {
        console.error('Payment stats query error:', error);
        res.status(500).json({ error: 'Lỗi truy vấn thanh toán: ' + error.message });
      }
    } else {
      // Regular user gets their own payment data
      const currentMonth = month || new Date().toISOString().slice(0, 7);
      const stats = await getUserPaymentStats(supabase, req.user.id, currentMonth);
      res.json({
        data: [stats],
        pagination: {
          total: 1,
          page: 1,
          pageSize: 1,
          hasMore: false,
          totalPages: 1
        }
      });
    }
  } catch (error) {
    console.error('Payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get payment history
app.get('/api/payments/history', authenticateToken, async (req, res) => {
  try {
    // Only admin can view all payment history
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    
    // Always return ALL payments, ignore month parameter to avoid date parsing issues
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        user:user_id (id, fullname)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payment history query error:', error);
      return res.status(500).json({ error: 'Lỗi database' });
    }

    console.log(`✅ Returned ${payments?.length || 0} payments`);
    res.json((payments || []).map(enrichPaymentHistoryRow));
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get current user's payment history
app.get('/api/payments/my-history', authenticateToken, async (req, res) => {
  try {
    const { month, startDate, nextMonthDate } = getPaymentMonthBounds(req.query.month);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);

    const buildPaymentHistoryQuery = (columns) => supabase
      .from('payments')
      .select(columns)
      .eq('user_id', req.user.id)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lt('created_at', `${nextMonthDate}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(limit);

    let { data: payments, error } = await buildPaymentHistoryQuery('id, amount, status, method, notes, payer_name, created_at');

    if (error && isMissingOptionalPaymentSchema(error)) {
      const fallbackResult = await buildPaymentHistoryQuery('id, amount, status, created_at');

      payments = (fallbackResult.data || []).map((payment) => ({
        ...payment,
        method: null,
        notes: null
      }));
      error = fallbackResult.error;

      if (error && isMissingOptionalPaymentSchema(error)) {
        const minimalResult = await buildPaymentHistoryQuery('id, amount, created_at');

        payments = (minimalResult.data || []).map((payment) => ({
          ...payment,
          status: 'completed',
          method: null,
          notes: null
        }));
        error = minimalResult.error;
      }
    }

    if (error) {
      console.error('My payment history query error:', error);
      return res.status(500).json({ error: 'Loi lay lich su thanh toan' });
    }

    res.json({
      month,
      data: (payments || []).map(enrichPaymentHistoryRow)
    });
  } catch (error) {
    console.error('My payment history error:', error);
    res.status(500).json({ error: 'Loi server' });
  }
});

// Get my payments
app.get('/api/payments/my', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    
    // Calculate user's payment stats based on orders and payments
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    
    const stats = await getUserPaymentStats(supabase, req.user.id, currentMonth);
    res.json(stats);
  } catch (error) {
    console.error('My payments error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get automatic payment webhook usage for the selected month
app.get('/api/payments/auto-usage', authenticateToken, async (req, res) => {
  try {
    const { month, startDate, nextMonthDate } = getPaymentMonthBounds(req.query.month);
    const providerUsed = await fetchSePayTransactionUsage({ startDate, nextMonthDate });
    const providerSynced = Number.isFinite(providerUsed);

    const buildUsageResponse = ({ supported = true, recordedUsed = 0, completed = 0, failed = 0, ignored = 0, processing = 0 }) => {
      const limit = AUTO_PAYMENT_MONTHLY_LIMIT;
      const providerOffset = getAutoPaymentUsedOffset(month);
      const localUsed = recordedUsed + providerOffset;
      const used = providerSynced ? Math.max(localUsed, providerUsed) : localUsed;
      const remaining = limit ? Math.max(0, limit - used) : null;
      const usagePercent = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;

      return {
        supported,
        month,
        used,
        recordedUsed,
        providerOffset,
        providerUsed: providerSynced ? providerUsed : null,
        providerSynced,
        usageSource: providerSynced
          ? 'sepay-api'
          : providerOffset > 0
            ? 'local-plus-offset'
            : 'local',
        limit,
        remaining,
        usagePercent,
        completed,
        failed,
        ignored,
        processing
      };
    };

    const { data, error } = await supabase
      .from('auto_payment_transactions')
      .select('status')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lt('created_at', `${nextMonthDate}T00:00:00Z`);

    if (error) {
      if (isMissingOptionalPaymentSchema(error)) {
        return res.json(buildUsageResponse({ supported: providerSynced }));
      }

      console.error('Auto payment usage query error:', error);
      return res.status(500).json({ error: 'Loi lay thong tin luot giao dich tu dong' });
    }

    const statusCounts = (data || []).reduce((counts, row) => {
      const status = row.status || 'processing';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    res.json(buildUsageResponse({
      recordedUsed: data?.length || 0,
      completed: statusCounts.completed || 0,
      failed: statusCounts.failed || 0,
      ignored: statusCounts.ignored || 0,
      processing: statusCounts.processing || 0
    }));
  } catch (error) {
    console.error('Auto payment usage error:', error);
    res.status(500).json({ error: 'Loi server' });
  }
});

// Get automatic bank-transfer info for the selected month
app.get('/api/payments/auto-info', authenticateToken, async (req, res) => {
  try {
    const month = normalizePaymentMonth(req.query.month);
    const requestedUserId = req.user.role === 'admin' && req.query.userId
      ? Number(req.query.userId)
      : Number(req.user.id);

    if (!Number.isInteger(requestedUserId) || requestedUserId <= 0) {
      return res.status(400).json({ error: 'User khong hop le' });
    }

    const stats = await getUserPaymentStats(supabase, requestedUserId, month);
    const amount = Math.max(0, Number(stats.remainingTotal || 0));
    const code = buildAutoPaymentCode(requestedUserId, month);
    const bank = getAutoPaymentBankInfo();

    res.json({
      userId: requestedUserId,
      month,
      code,
      amount,
      remainingTotal: amount,
      isPaid: amount <= 0,
      bankConfigured: !!bank,
      bank,
      qrUrl: bank ? buildVietQrUrl({ amount, code }) : null
    });
  } catch (error) {
    console.error('Auto payment info error:', error);
    res.status(500).json({ error: 'Loi lay thong tin thanh toan tu dong' });
  }
});

// Webhook endpoint for bank/API providers (SePay, Casso, Bank Hub, etc.)
app.post('/api/payments/auto-webhook', async (req, res) => {
  let reservedEvent = null;

  try {
    if (!process.env.AUTO_PAYMENT_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Auto payment webhook is not configured' });
    }

    if (!hasValidAutoPaymentSecret(req)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const transaction = extractAutoPaymentTransaction(req.body);
    const paymentCode = parseAutoPaymentCode(transaction.description);

    const eventReservation = await reserveAutoPaymentEvent({
      source: 'bank-webhook',
      transactionId: transaction.transactionId,
      paymentCode: paymentCode?.code || 'UNMATCHED',
      userId: paymentCode?.userId || null,
      month: paymentCode?.month || normalizePaymentMonth(),
      amount: transaction.amount,
      description: transaction.description,
      payerName: transaction.payerName,
      rawPayload: req.body
    });

    reservedEvent = eventReservation.event;

    if (eventReservation.duplicate) {
      return res.json({
        success: true,
        duplicate: true,
        paymentCode: paymentCode?.code || null
      });
    }

    if (isOutgoingAutoPayment(transaction)) {
      await updateAutoPaymentEvent(reservedEvent?.id, {
        status: 'ignored',
        error_message: 'outgoing_transaction'
      });
      return res.json({ success: true, ignored: true, reason: 'outgoing_transaction' });
    }

    if (isFailedAutoPayment(transaction)) {
      await updateAutoPaymentEvent(reservedEvent?.id, {
        status: 'ignored',
        error_message: 'failed_transaction'
      });
      return res.json({ success: true, ignored: true, reason: 'failed_transaction' });
    }

    if (!paymentCode) {
      await updateAutoPaymentEvent(reservedEvent?.id, {
        status: 'ignored',
        error_message: 'payment_code_not_found'
      });
      return res.json({ success: true, ignored: true, reason: 'payment_code_not_found' });
    }

    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
      await updateAutoPaymentEvent(reservedEvent?.id, {
        status: 'ignored',
        error_message: 'invalid_transaction_amount'
      });
      return res.json({ success: true, ignored: true, reason: 'invalid_transaction_amount' });
    }

    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, fullname')
      .eq('id', paymentCode.userId)
      .limit(1)
      .single();

    if (userError || !targetUser) {
      console.warn('Auto payment ignored because payment user was not found:', paymentCode);
      await updateAutoPaymentEvent(reservedEvent?.id, {
        status: 'ignored',
        error_message: 'payment_user_not_found'
      });
      return res.json({
        success: true,
        ignored: true,
        reason: 'payment_user_not_found',
        paymentCode: paymentCode.code,
        userId: paymentCode.userId
      });
    }

    const result = await recordCompletedPayment({
      userId: paymentCode.userId,
      month: paymentCode.month,
      amount: transaction.amount,
      source: 'bank-webhook',
      paymentCode: paymentCode.code,
      transactionId: transaction.transactionId,
      description: transaction.description,
      payerName: transaction.payerName || targetUser.fullname,
      rawPayload: req.body
    });

    await updateAutoPaymentEvent(reservedEvent?.id, {
      payment_id: result.payment.id,
      status: 'completed'
    });

    res.json({
      success: true,
      paymentCode: paymentCode.code,
      payment: result.payment,
      markedOrders: result.paidOrders.markedCount
    });
  } catch (error) {
    console.error('Auto payment webhook error:', error);
    await updateAutoPaymentEvent(reservedEvent?.id, {
      status: 'failed',
      error_message: error.message
    });
    res.status(error.statusCode || 500).json({ error: 'Loi xu ly webhook thanh toan' });
  }
});

// SSE endpoint for real-time payment updates
app.get('/api/sse/payments', (req, res) => {
  try {
    // Get token from query parameter (EventSource doesn't support custom headers)
    let token = req.query.token;
    
    // If no token in query, try Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
    
    if (!token) {
      console.log('❌ SSE: No token provided');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Access token required' })}\n\n`);
      res.end();
      return;
    }

    // Verify token
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      userId = decoded.userId;
      
      if (!userId) {
        throw new Error('No userId in token');
      }
    } catch (err) {
      console.log('❌ SSE: Invalid token:', err.message);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Invalid token' })}\n\n`);
      res.end();
      return;
    }

    console.log(`🔌 SSE connection established for user ${userId}`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for real-time
    
    // Store connection
    sseConnections.set(userId, {
      res,
      lastHeartbeat: Date.now()
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', userId, timestamp: Date.now() })}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
      console.log(`🔌 SSE connection closed for user ${userId}`);
      sseConnections.delete(userId);
    });
    
    req.on('error', (err) => {
      console.error(`❌ SSE error for user ${userId}:`, err.message);
      sseConnections.delete(userId);
    });
  } catch (err) {
    console.error('❌ SSE endpoint error:', err);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
    res.end();
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
    console.log('=== MARK PAID REQUEST ===');
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    console.log('Request body:', req.body);
    
    if (req.user.role !== 'admin') {
      console.log('❌ Not admin');
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { userId, month, amount } = req.body;
    
    if (!userId || !month || !amount) {
      console.log('❌ Missing required fields:', { userId, month, amount });
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const paymentData = {
      user_id: userId,
      amount: amount,
      status: 'completed'
    };

    console.log('Payment data to insert:', paymentData);

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Lỗi đánh dấu thanh toán: ' + error.message });
    }

    console.log('✅ Payment marked successfully:', payment);

    // Calculate how many orders should be marked as paid based on payment amount
    // Each order costs 40,000đ
    const mealsCount = Math.floor(amount / 40000);
    console.log(`💰 Payment amount: ${amount}đ = ${mealsCount} meals`);
    
    // Get unpaid orders for this user in this month (ordered by created_at)
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-');
    const monthIndex = parseInt(monthNum) - 1;
    const nextMonthDate = new Date(parseInt(year), monthIndex + 1, 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    
    const { data: unpaidOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('ordered_for', userId)  // ✅ ĐÚNG - Tìm orders mà user là người nhận
      .eq('paid', false)
      .is('deleted_at', null)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lt('created_at', `${nextMonth}T00:00:00Z`)
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('⚠️  Error fetching unpaid orders:', fetchError);
    } else {
      console.log(`📋 Found ${unpaidOrders?.length || 0} unpaid orders`);
      
      // Only mark the first N orders as paid (where N = mealsCount)
      const ordersToMarkPaid = unpaidOrders?.slice(0, mealsCount) || [];
      const orderIds = ordersToMarkPaid.map(o => o.id);
      
      if (orderIds.length > 0) {
        const { data: updatedOrders, error: updateError } = await supabase
          .from('orders')
          .update({ paid: true })
          .in('id', orderIds)
          .select();
        
        if (updateError) {
          console.error('⚠️  Error updating orders paid status:', updateError);
        } else {
          console.log(`✅ Marked ${updatedOrders?.length || 0} orders as paid (oldest first)`);
        }
      } else {
        console.log('ℹ️  No orders to mark as paid');
      }
    }

    // Send SSE notification to the user whose payment was marked
    sendSSENotification(userId, {
      type: 'payment_marked',
      userId,
      data: {
        amount,
        month,
        timestamp: Date.now()
      }
    });

    // Also send notification to admin (current user) to update their dashboard
    sendSSENotification(req.user.id, {
      type: 'payment_marked',
      userId,
      data: {
        amount,
        month,
        timestamp: Date.now()
      }
    });

    // Invalidate cache entries related to this payment
    // Invalidate admin payments cache for this month
    cache.invalidate(`payments:admin:${month}`, `payment_marked:user_${userId}`);
    
    // Invalidate user-specific payment cache
    cache.invalidate(`payments:user:${userId}:${month}`, `payment_marked`);
    
    // Invalidate all stats caches for this month
    cache.invalidate(`stats:dashboard:${month}`, `payment_marked`);
    cache.invalidate(`stats:user:${userId}:${month}`, `payment_marked`);

    res.json({ success: true, payment });
  } catch (error) {
    console.error('❌ Mark paid error:', error);
    res.status(500).json({ error: 'Lỗi server: ' + error.message });
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
      .is('deleted_at', null)
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59');

    // Get today's revenue
    const { data: orders, error: revenueError } = await supabase
      .from('orders')
      .select('price')
      .is('deleted_at', null)
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

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Check cache first (10-minute TTL for stats)
    const cacheKey = `stats:dashboard:${currentMonth}`;
    const cachedStats = cache.get(cacheKey);
    
    if (cachedStats) {
      return res.json({
        ...cachedStats,
        cached: true
      });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get today's orders
    const { count: ordersToday, error: ordersTodayError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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

    const stats = {
      ordersToday: ordersToday || 0,
      totalUsers: totalUsers || 0,
      popularDishesCount: popularDishesArray.length,
      popularDishes: popularDishesArray
    };

    // Cache the stats (10-minute TTL)
    cache.set(cacheKey, stats, 10 * 60 * 1000);

    res.json({
      ...stats,
      cached: false
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Feedback Routes
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    console.log('=== FEEDBACK POST REQUEST ===');
    console.log('User:', req.user ? { id: req.user.id, username: req.user.username } : 'No user');
    console.log('Request body:', req.body);
    
    const { subject, message } = req.body;
    
    // Validate required fields
    if (!message || !message.trim()) {
      console.log('❌ Missing message');
      return res.status(400).json({ error: 'Nội dung góp ý là bắt buộc' });
    }
    
    // Simple feedback data - NO RATING COLUMN
    const feedbackData = {
      user_id: req.user.id,
      subject: subject?.trim() || null,
      message: message.trim(),
      status: 'pending'
    };

    console.log('Feedback data to insert:', feedbackData);

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Lỗi gửi phản hồi: ' + error.message });
    }

    console.log('✅ Feedback created successfully:', feedback);
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('❌ Feedback error:', error);
    res.status(500).json({ error: 'Lỗi server: ' + error.message });
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

// =====================================================
// Banner Management Routes
// =====================================================

// Banner settings cache
const bannerCache = {
  data: null,
  timestamp: 0,
  ttl: 60000 // 60 seconds
};

// GET /api/banner/settings - Get current banner configuration (public endpoint)
app.get('/api/banner/settings', async (req, res) => {
  try {
    // Check cache first
    if (bannerCache.data && Date.now() - bannerCache.timestamp < bannerCache.ttl) {
      console.log('📦 Returning cached banner settings');
      return res.json(bannerCache.data);
    }

    // Query database
    const { data: settings, error } = await supabase
      .from('banner_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Database error fetching banner settings:', error);
      // Fallback to default game banner
      const fallback = {
        bannerType: 'game',
        updatedAt: new Date().toISOString(),
        updatedBy: null
      };
      return res.json(fallback);
    }

    // Format response - create new object to avoid frozen object issues
    const response = {
      bannerType: settings.banner_type || 'game',
      updatedAt: settings.updated_at || new Date().toISOString(),
      updatedBy: settings.updated_by || null
    };

    // Update cache with new object
    bannerCache.data = { ...response };
    bannerCache.timestamp = Date.now();

    res.json(response);
  } catch (error) {
    console.error('Error fetching banner settings:', error);
    // Fallback to default game banner
    res.json({
      bannerType: 'game',
      updatedAt: new Date().toISOString(),
      updatedBy: null
    });
  }
});

// POST /api/banner/settings - Update banner configuration (admin only)
app.post('/api/banner/settings', authenticateToken, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { bannerType } = req.body;

    // Validate banner type
    if (!bannerType || !['game', 'anniversary'].includes(bannerType)) {
      return res.status(400).json({
        error: 'Invalid banner type',
        message: 'Banner type must be "game" or "anniversary"'
      });
    }

    // Try to update first
    console.log(`Attempting to update banner_settings to "${bannerType}"...`);
    
    // Direct update without RLS
    let { data: updated, error } = await supabase
      .from('banner_settings')
      .update({
        banner_type: bannerType,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select();

    console.log('Update response:', { updated, error });

    // If update failed, log error and return
    if (error) {
      console.error('Database error updating banner settings:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      });
    }

    // Get the first record if it's an array
    const record = Array.isArray(updated) ? updated[0] : updated;

    if (!record) {
      console.error('No record returned after update');
      return res.status(500).json({ 
        error: 'Database error', 
        details: 'No record returned after update'
      });
    }

    // Invalidate cache immediately
    bannerCache.data = null;
    bannerCache.timestamp = 0;

    // Log the change
    console.log(`✅ Banner updated to "${bannerType}"`);

    // Format response - create new object
    const responseData = {
      success: true,
      bannerType: record.banner_type || bannerType,
      updatedAt: record.updated_at || new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error updating banner settings:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
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
      .is('deleted_at', null)
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

// =====================================================
// Cache Management Endpoints (Task 2.5)
// =====================================================

// Get cache statistics (admin only)
app.get('/api/admin/cache/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const stats = cache.getStats();
    const invalidationLog = cache.getInvalidationLog();

    res.json({
      stats,
      invalidationLog: invalidationLog.slice(-50), // Last 50 events
      cacheKeys: cache.getAllKeys()
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Clear cache (admin only)
app.post('/api/admin/cache/clear', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { key } = req.body;

    if (key) {
      // Clear specific cache key
      const count = cache.invalidate(key, 'admin_manual_clear');
      res.json({
        success: true,
        message: `Đã xóa ${count} mục cache`,
        cleared: count
      });
    } else {
      // Clear all cache
      const beforeSize = cache.getAllKeys().length;
      cache.clear('admin_manual_clear_all');
      res.json({
        success: true,
        message: `Đã xóa toàn bộ cache (${beforeSize} mục)`,
        cleared: beforeSize
      });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get cache entry info (admin only, for debugging)
app.get('/api/admin/cache/entry/:key', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { key } = req.params;
    const info = cache.getEntryInfo(key);

    if (!info) {
      return res.status(404).json({ error: 'Cache entry not found' });
    }

    res.json(info);
  } catch (error) {
    console.error('Cache entry info error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Catch-all route to serve index.html for React Router (must be last)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log('Serving index.html from:', indexPath);
  
  // Check if file exists before sending
  if (!require('fs').existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(404).json({ error: 'Frontend not found' });
  }
  
  res.sendFile(indexPath);
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

    // Monitor database connections every 10 seconds
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
