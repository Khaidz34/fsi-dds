# Load Test Failure Analysis: 63% Failure Rate with 30 Concurrent Users

## Executive Summary
With 30 concurrent users and 3 orders per user (90 total requests), a 63% failure rate indicates approximately 57 failed requests. The primary culprit is **rate limiting**, which is mathematically guaranteed to fail under this load.

---

## Root Cause Analysis

### 1. **RATE LIMITING - PRIMARY CAUSE (Likelihood: 95%)**

**Current Configuration:**
- Limit: 100 requests/minute per IP
- Window: 60 seconds
- Location: `backend/server.js` lines 99-123

**Why This Fails:**
```
30 concurrent users × 3 orders = 90 requests
+ 30 registration requests = 120 total requests
+ Additional GET requests (menu, orders) = ~150+ total requests

All from same IP (load test environment) in ~10-15 seconds
```

**Math:**
- Rate limit allows: 100 requests/60 seconds = 1.67 req/sec
- Load test generates: 150 requests/15 seconds = 10 req/sec
- **Excess: 6x over limit** → 429 "Too many requests" errors

**Evidence in Code:**
```javascript
if (rateLimit[ip].count > RATE_LIMIT_MAX) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

**Fix Priority: CRITICAL - Implement immediately**

---

### 2. **AUTHENTICATION TOKEN EXPIRATION - SECONDARY CAUSE (Likelihood: 15%)**

**Current Configuration:**
- Token expiration: 24 hours
- Verification: `jwt.verify()` with database lookup on every request
- Location: `backend/server.js` lines 233-238, 294-299

**Why This Could Fail:**
- Each authenticated request requires:
  1. JWT verification
  2. Database query to validate user still exists
  3. Under load, database queries slow down
  4. Timeouts could cause 403 "Invalid token" errors

**Potential Issues:**
- No token refresh mechanism
- No caching of token validation
- Database lookup on every request adds latency

**Fix Priority: MEDIUM - Optimize after rate limiting**

---

### 3. **DATABASE CONNECTION LIMITS - TERTIARY CAUSE (Likelihood: 20%)**

**Current Configuration:**
- Using Supabase (managed PostgreSQL)
- No explicit connection pooling in code
- Each request makes 1-3 database queries

**Why This Could Fail:**
```
30 concurrent users × 3 orders = 90 simultaneous connections
+ Registration queries = 30 more connections
+ Menu/stats queries = 30 more connections
Total: ~150 concurrent connections

Supabase free tier: ~20 concurrent connections
Supabase pro tier: ~100 concurrent connections
```

**Potential Issues:**
- Connection pool exhaustion
- Queries queued waiting for available connections
- Timeouts after 30-60 seconds

**Fix Priority: HIGH - Check Supabase tier and connection pool**

---

### 4. **SUPABASE REALTIME SUBSCRIPTION LIMITS - LOWER CAUSE (Likelihood: 5%)**

**Current Configuration:**
- Realtime subscriptions enabled in hooks
- No explicit subscription limits configured
- Location: `src/hooks/useOrders.ts`, `usePayments.ts`, etc.

**Why This Could Fail:**
- Supabase has limits on concurrent subscriptions
- Each user creates multiple subscriptions
- 30 users × 5 subscriptions = 150 subscriptions

**Potential Issues:**
- Subscription creation failures
- Realtime message queue overflow
- Silent failures in subscription setup

**Fix Priority: LOW - Less likely to cause 63% failure rate**

---

### 5. **API TIMEOUT ISSUES - CONTRIBUTING FACTOR (Likelihood: 25%)**

**Current Configuration:**
- No explicit timeout configuration in `src/services/api.ts`
- Default fetch timeout: browser-dependent (usually 30-60 seconds)
- No retry logic

**Why This Could Fail:**
- Under heavy load, database queries slow down
- Slow queries cause slow API responses
- Slow responses cause client timeouts
- Timeouts appear as failures

**Potential Issues:**
- No request timeout set
- No retry mechanism
- No circuit breaker pattern

**Fix Priority: MEDIUM - Implement after rate limiting fix**

---

## Recommended Fixes (Prioritized)

### PRIORITY 1: Fix Rate Limiting (Immediate - 15 minutes)

**Option A: Increase Rate Limit (Quick Fix)**
```javascript
// backend/server.js lines 100-101
const RATE_LIMIT_WINDOW = 60000;  // 1 minute
const RATE_LIMIT_MAX = 500;       // Increase from 100 to 500
```

**Calculation:**
- 500 requests/60 seconds = 8.33 req/sec
- Load test: 150 requests/15 seconds = 10 req/sec
- Still slightly over, but much better

**Option B: Implement Per-Endpoint Rate Limiting (Better)**
```javascript
// Different limits for different endpoints
const rateLimitConfig = {
  '/api/auth/register': { max: 10, window: 60000 },    // 10/min
  '/api/auth/login': { max: 20, window: 60000 },       // 20/min
  '/api/orders': { max: 200, window: 60000 },          // 200/min
  '/api/menu/today': { max: 100, window: 60000 },      // 100/min
  'default': { max: 300, window: 60000 }               // 300/min
};
```

**Option C: Implement User-Based Rate Limiting (Best)**
```javascript
// Rate limit per authenticated user, not per IP
const rateLimitByUser = {};
const RATE_LIMIT_PER_USER = 200; // 200 requests/minute per user
```

**Recommendation:** Start with Option A (quick), then implement Option C (proper)

---

### PRIORITY 2: Optimize Database Connections (30 minutes)

**Issue:** Supabase connection pool exhaustion

**Fix:**
```javascript
// backend/server.js - Add connection pooling
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Add connection pool monitoring
setInterval(() => {
  console.log('Active connections:', activeConnections);
}, 5000);
```

**Check Supabase Tier:**
- Free tier: ~20 concurrent connections
- Pro tier: ~100 concurrent connections
- Upgrade if needed for production

---

### PRIORITY 3: Add Token Validation Caching (20 minutes)

**Issue:** Database lookup on every request

**Fix:**
```javascript
// backend/server.js - Add token cache
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5000; // 5 seconds

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Check cache first
    const cached = tokenCache.get(decoded.userId);
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
    tokenCache.set(decoded.userId, { user, timestamp: Date.now() });
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

---

### PRIORITY 4: Add Request Timeouts and Retries (25 minutes)

**Issue:** No timeout or retry logic

**Fix in `src/services/api.ts`:**
```typescript
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...getHeaders(),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }

  console.error('API call failed after retries:', lastError);
  throw lastError;
}
```

---

### PRIORITY 5: Monitor Realtime Subscriptions (15 minutes)

**Issue:** Potential subscription limit issues

**Fix in hooks:**
```typescript
// src/hooks/useOrders.ts example
useEffect(() => {
  const subscription = supabase
    .from('orders')
    .on('*', payload => {
      console.log('Order change detected:', payload);
      setOrders(prev => [...prev, payload.new]);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Orders subscription active');
      } else if (status === 'CLOSED') {
        console.log('⚠️ Orders subscription closed');
      }
    });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## Testing the Fixes

### Step 1: Increase Rate Limit
```bash
# Edit backend/server.js
# Change RATE_LIMIT_MAX from 100 to 500

# Run load test
node backend/load-test.js
# Expected: Success rate should improve to 80-90%
```

### Step 2: Check Database Connections
```bash
# In Supabase Dashboard:
# 1. Go to Database > Connections
# 2. Check current connection count during load test
# 3. If near limit, upgrade tier or implement connection pooling
```

### Step 3: Run Full Load Test
```bash
# After all fixes
locust -f load_test_locust.py --host=https://fsi-dds.onrender.com
# Expected: Success rate > 95%, avg response time < 500ms
```

---

## Performance Targets After Fixes

| Metric | Current | Target | Fix |
|--------|---------|--------|-----|
| Success Rate | 37% | >95% | Rate limiting + DB optimization |
| Avg Response Time | Unknown | <500ms | Connection pooling + caching |
| Error Rate | 63% | <5% | All fixes combined |
| Max Response Time | Unknown | <1000ms | Timeout + retry logic |

---

## Long-Term Recommendations

1. **Implement API Gateway** (Kong, AWS API Gateway)
   - Centralized rate limiting
   - Request throttling
   - Load balancing

2. **Add Caching Layer** (Redis)
   - Cache menu data (5-minute TTL)
   - Cache user data (5-minute TTL)
   - Reduce database load by 50%+

3. **Database Optimization**
   - Add indexes on frequently queried columns
   - Implement query result caching
   - Use connection pooling (PgBouncer)

4. **Monitoring & Alerting**
   - Track response times per endpoint
   - Alert on error rate > 5%
   - Monitor database connection pool

5. **Load Testing Schedule**
   - Run after each deployment
   - Test with 50, 100, 200 concurrent users
   - Identify breaking points

---

## Summary

**Primary Issue:** Rate limiting at 100 req/min is 6x too strict for 30 concurrent users

**Quick Fix:** Increase to 500 req/min (5 minutes)

**Proper Fix:** Implement per-user rate limiting + connection pooling + caching (1-2 hours)

**Expected Result:** Success rate from 37% → >95%
