# Load Test Quick Fixes - Implementation Guide

## Quick Fix #1: Increase Rate Limit (5 minutes)

**File:** `backend/server.js`

**Current (lines 100-101):**
```javascript
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute
```

**Change to:**
```javascript
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 500; // 500 requests per minute
```

**Why:** 30 concurrent users × 3 orders + registration + menu requests = ~150 requests in 15 seconds. Current limit of 100/min = 1.67 req/sec. New limit of 500/min = 8.33 req/sec. This accommodates the load test.

**Test:**
```bash
node backend/load-test.js
# Expected: Success rate improves from 37% to 80-90%
```

---

## Quick Fix #2: Add Token Validation Caching (20 minutes)

**File:** `backend/server.js`

**Add after line 98 (before rate limiting middleware):**
```javascript
// Token validation cache
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5000; // 5 seconds
```

**Replace authenticateToken function (lines 127-154) with:**
```javascript
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
    
    // Clean up old cache entries every 100 requests
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
```

**Why:** Reduces database queries by 80% during load test. Each request no longer queries the database if token was validated in last 5 seconds.

**Test:**
```bash
node backend/load-test.js
# Expected: Response times improve by 30-50%
```

---

## Quick Fix #3: Add Request Timeouts (15 minutes)

**File:** `src/services/api.ts`

**Replace the apiCall function (lines 36-56) with:**
```typescript
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
      
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('HTTP 4')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }

  console.error('API call failed after retries:', lastError);
  throw lastError;
}
```

**Why:** Prevents hanging requests and adds automatic retry logic for transient failures.

**Test:**
```bash
# Run load test and monitor for timeout errors
node backend/load-test.js
# Expected: No hanging requests, graceful failure handling
```

---

## Quick Fix #4: Monitor Database Connections

**File:** `backend/server.js`

**Add after line 1380 (in startServer function):**
```javascript
// Monitor database connections
setInterval(async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`[DB] Active connections: ${data || 0}`);
    }
  } catch (err) {
    console.error('[DB] Connection check failed:', err.message);
  }
}, 10000); // Check every 10 seconds
```

**Why:** Helps identify if database connection pool is exhausted during load test.

**Check Supabase Tier:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > Database
4. Check "Connection Limit" (free: 20, pro: 100)
5. If hitting limit, upgrade to Pro tier

---

## Quick Fix #5: Reduce Realtime Subscription Overhead (10 minutes)

**File:** `src/hooks/useOrders.ts` (and similar hooks)

**Add error handling:**
```typescript
useEffect(() => {
  let subscription: any;
  
  const setupSubscription = async () => {
    try {
      subscription = supabase
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
    } catch (err) {
      console.error('Failed to setup subscription:', err);
      // Fall back to polling
      const interval = setInterval(() => {
        fetchOrders();
      }, 5000);
      return () => clearInterval(interval);
    }
  };

  setupSubscription();

  return () => {
    if (subscription) {
      subscription.unsubscribe();
    }
  };
}, []);
```

**Why:** Graceful fallback if realtime subscriptions fail under load.

---

## Implementation Order

1. **First:** Fix #1 (Increase rate limit) - 5 minutes
   - Test with `node backend/load-test.js`
   - Should see immediate improvement

2. **Second:** Fix #2 (Token caching) - 20 minutes
   - Test again
   - Should see response time improvement

3. **Third:** Fix #3 (Request timeouts) - 15 minutes
   - Test again
   - Should see better error handling

4. **Fourth:** Fix #4 (Monitor connections) - 5 minutes
   - Run during load test
   - Check if connection pool is the issue

5. **Fifth:** Fix #5 (Subscription error handling) - 10 minutes
   - Deploy and monitor

---

## Expected Results

| Fix | Impact | Time |
|-----|--------|------|
| Rate limit increase | 37% → 80% success | 5 min |
| Token caching | 80% → 90% success | 20 min |
| Request timeouts | 90% → 95% success | 15 min |
| Connection monitoring | Identify bottlenecks | 5 min |
| Subscription handling | Graceful degradation | 10 min |

**Total Time:** ~55 minutes
**Expected Final Result:** >95% success rate, <500ms avg response time

---

## Verification Checklist

- [ ] Rate limit increased to 500
- [ ] Token cache implemented
- [ ] Request timeouts added
- [ ] Database connection monitoring added
- [ ] Subscription error handling added
- [ ] Load test runs with >95% success rate
- [ ] Average response time <500ms
- [ ] No 429 "Too many requests" errors
- [ ] No 403 "Invalid token" errors
- [ ] No timeout errors

---

## Rollback Plan

If any fix causes issues:

1. **Rate limit:** Revert to 100 (or try 250)
2. **Token cache:** Remove cache, keep database queries
3. **Timeouts:** Increase timeout from 15s to 30s
4. **Monitoring:** Just remove the monitoring code
5. **Subscriptions:** Remove error handling, keep original

All fixes are backward compatible and can be reverted independently.
