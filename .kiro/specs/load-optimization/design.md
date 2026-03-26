# Load Optimization Design - 30 Concurrent Users

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - Request Batching                                          │
│  - Client-side Caching (5-10 min TTL)                       │
│  - Lazy Loading                                              │
│  - Polling Optimization (3s admin, 10s user)                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────▼────────────────────────────────────────┐
│                  Backend (Node.js)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Request Layer                                        │   │
│  │ - Compression (gzip)                                │   │
│  │ - Rate Limiting (100 req/min per user)              │   │
│  │ - Request Queuing (max 50 pending)                  │   │
│  │ - Error Handling (graceful degradation)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Cache Layer (In-Memory)                              │   │
│  │ - Query Result Cache (5-15 min TTL)                 │   │
│  │ - User Data Cache (10 min TTL)                      │   │
│  │ - Menu Cache (5 min TTL)                            │   │
│  │ - Stats Cache (15 min TTL)                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Routes                                           │   │
│  │ - Optimized queries                                 │   │
│  │ - Batch endpoints                                   │   │
│  │ - Selective field projection                        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Connection Pool (max 20)
┌────────────────────▼────────────────────────────────────────┐
│              Supabase (PostgreSQL)                           │
│  - Optimized Indexes                                         │
│  - Query Optimization                                        │
│  - Connection Pooling                                        │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Implementation

### 1. Backend Request Layer

#### 1.1 Response Compression
```javascript
// Enable gzip compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

#### 1.2 Rate Limiting
```javascript
// Per-user rate limiting: 100 requests/minute
// Per-IP rate limiting: 500 requests/minute
// Burst allowance: 20 requests/second

const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.path === '/health',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
  }
});
```

#### 1.3 Request Queuing
```javascript
// Queue system for high-load scenarios
class RequestQueue {
  constructor(maxConcurrent = 50, maxQueued = 100) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueued = maxQueued;
    this.active = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueued) {
        throw new Error('Queue full - server overloaded');
      }
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}
```

#### 1.4 Error Handling
```javascript
// Graceful error handling
app.use((err, req, res, next) => {
  if (err.code === 'ECONNREFUSED') {
    // Database connection failed
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Database connection failed'
    });
  }

  if (err.message === 'Queue full') {
    // Server overloaded
    return res.status(503).json({
      error: 'Server overloaded',
      message: 'Please retry in a few seconds',
      retryAfter: 5
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error'
  });
});
```

### 2. Cache Layer

#### 2.1 Query Result Caching
```javascript
// Cache strategy for different data types
const CACHE_CONFIG = {
  'payments:admin': { ttl: 5 * 60 * 1000, invalidateOn: ['payment:created', 'payment:updated'] },
  'payments:user': { ttl: 10 * 60 * 1000, invalidateOn: ['payment:created', 'payment:updated'] },
  'orders:user': { ttl: 5 * 60 * 1000, invalidateOn: ['order:created', 'order:deleted'] },
  'menu:current': { ttl: 15 * 60 * 1000, invalidateOn: ['menu:created'] },
  'users:list': { ttl: 30 * 60 * 1000, invalidateOn: ['user:created', 'user:updated'] },
  'stats:dashboard': { ttl: 15 * 60 * 1000, invalidateOn: ['order:created', 'payment:updated'] }
};

// Cache key generation
function getCacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`;
}

// Cached query execution
async function cachedQuery(type, params, queryFn) {
  const key = getCacheKey(type, params);
  const cached = cache.get(key);
  
  if (cached) {
    console.log(`✅ Cache hit: ${key}`);
    return cached;
  }

  const result = await queryFn();
  const config = CACHE_CONFIG[type];
  if (config) {
    cache.set(key, result, config.ttl);
  }
  
  return result;
}
```

#### 2.2 Cache Invalidation
```javascript
// Invalidate cache when data changes
async function createOrder(data) {
  const order = await supabase.from('orders').insert(data);
  
  // Invalidate related caches
  cache.invalidate('orders:user:*', 'order:created');
  cache.invalidate('stats:dashboard:*', 'order:created');
  cache.invalidate('payments:user:*', 'order:created');
  
  return order;
}
```

### 3. Database Optimization

#### 3.1 Query Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_paid ON orders(paid);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_orders_user_paid ON orders(user_id, paid);
CREATE INDEX idx_payments_user_month ON payments(user_id, created_at DESC);
```

#### 3.2 Query Batching
```javascript
// Batch multiple queries into single request
async function batchGetUserData(userId) {
  const [orders, payments, user] = await Promise.all([
    supabase.from('orders').select('*').eq('user_id', userId),
    supabase.from('payments').select('*').eq('user_id', userId),
    supabase.from('users').select('*').eq('id', userId).single()
  ]);

  return { orders, payments, user };
}
```

#### 3.3 Selective Field Projection
```javascript
// Only fetch needed fields
async function getOrdersList(userId) {
  return supabase
    .from('orders')
    .select('id, dish1_id, dish2_id, created_at, paid') // Only needed fields
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
}
```

### 4. Frontend Optimization

#### 4.1 Request Batching
```typescript
// Batch multiple API calls
async function batchFetchUserData() {
  const response = await fetch('/api/batch', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        { endpoint: '/api/orders', params: {} },
        { endpoint: '/api/payments', params: {} },
        { endpoint: '/api/menu', params: {} }
      ]
    })
  });

  const results = await response.json();
  return results;
}
```

#### 4.2 Client-side Caching
```typescript
// Increase cache TTL and implement stale-while-revalidate
const usePayments = () => {
  const [payments, setPayments] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    const fetchPayments = async () => {
      const now = Date.now();
      
      // Return cached data if fresh
      if (cacheRef.current.data && now - cacheRef.current.timestamp < CACHE_TTL) {
        setPayments(cacheRef.current.data);
        return;
      }

      // Fetch new data
      const response = await fetch('/api/payments');
      const data = await response.json();
      
      cacheRef.current = { data, timestamp: now };
      setPayments(data);
    };

    fetchPayments();
  }, []);

  return payments;
};
```

## Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Success Rate | 86.67% | 95%+ | +8.33% |
| Avg Response Time | 2407ms | <2000ms | -17% |
| P95 Latency | 3877ms | <3000ms | -23% |
| Error Rate | 13.33% | <5% | -62% |
| Cache Hit Rate | N/A | 60%+ | New |
| Memory Usage | ~450MB | <400MB | -11% |

## Monitoring & Alerts

```javascript
// Track performance metrics
const metrics = {
  requestCount: 0,
  successCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  cacheHits: 0,
  cacheMisses: 0,
  dbConnections: 0
};

// Alert thresholds
const ALERTS = {
  errorRate: 0.05, // Alert if > 5% errors
  avgResponseTime: 2000, // Alert if > 2 seconds
  memoryUsage: 400, // Alert if > 400MB
  dbConnections: 15 // Alert if > 15 connections
};
```
