# Performance Optimization for 50 Concurrent Users

## Current Status
- Backend: Node.js on Render free tier (512MB RAM, 1 CPU)
- Database: Supabase free tier (PostgreSQL with limits)
- Frontend: React with real-time SSE updates
- Caching: In-memory cache (5-10 min TTL)

## Optimization Strategy

### 1. Backend Optimizations (Immediate)

#### 1.1 Connection Pooling
- Supabase already uses connection pooling
- Limit concurrent connections to 20 (free tier limit)
- Add connection timeout handling

#### 1.2 Request Queuing
- Implement request queue for high-load scenarios
- Prioritize critical endpoints (auth, payments)
- Queue non-critical requests (stats, history)

#### 1.3 Response Compression
- Enable gzip compression for all responses
- Reduce payload size by 60-80%

#### 1.4 Rate Limiting
- Implement per-user rate limiting (100 req/min)
- Implement per-IP rate limiting (500 req/min)
- Prevent abuse and resource exhaustion

#### 1.5 Database Query Optimization
- Already using composite indexes
- Add query result caching (10-15 min TTL)
- Implement query batching for bulk operations

### 2. Frontend Optimizations

#### 2.1 Request Batching
- Batch multiple API calls into single request
- Reduce number of HTTP connections

#### 2.2 Lazy Loading
- Load payment data only when needed
- Defer non-critical data loading

#### 2.3 Client-side Caching
- Increase cache TTL from 3 min to 5 min
- Implement stale-while-revalidate pattern
- Cache user list, menu data

#### 2.4 SSE Connection Pooling
- Limit SSE connections per user
- Reuse connections across components
- Implement connection timeout (5 min idle)

### 3. Database Optimizations

#### 3.1 Query Optimization
- Use EXPLAIN ANALYZE to identify slow queries
- Add missing indexes
- Optimize JOIN operations

#### 3.2 Data Archiving
- Archive old orders (> 3 months)
- Archive old payments (> 6 months)
- Reduces table size and improves query speed

#### 3.3 Materialized Views
- Create materialized view for monthly stats
- Refresh every 1 hour
- Reduces computation on each request

### 4. Infrastructure Optimizations

#### 4.1 Render Configuration
- Use Render's auto-scaling (if available)
- Monitor CPU and memory usage
- Set up alerts for high resource usage

#### 4.2 Supabase Configuration
- Monitor connection count
- Monitor query performance
- Set up alerts for quota limits

#### 4.3 CDN for Static Assets
- Use Render's built-in CDN
- Cache static files (CSS, JS, images)
- Reduce server load

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Response compression (gzip)
2. ✅ Rate limiting
3. ✅ Request queuing
4. ✅ Database query caching

### Phase 2: Important (Do Next)
1. Client-side cache optimization
2. SSE connection pooling
3. Request batching
4. Lazy loading

### Phase 3: Nice to Have
1. Data archiving
2. Materialized views
3. Query optimization
4. Auto-scaling setup

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 500ms | ? |
| Database Query Time (p95) | < 200ms | ? |
| SSE Connection Latency | < 1s | ? |
| Concurrent Users | 50 | ? |
| Cache Hit Rate | > 70% | ? |
| Error Rate | < 1% | ? |

## Load Testing

### Test Scenarios

**Scenario 1: Normal Load (10 users)**
- 10 concurrent users
- Each user places 2 orders
- Expected: All requests succeed within 500ms

**Scenario 2: Medium Load (30 users)**
- 30 concurrent users
- Each user places 1 order
- Expected: 95% of requests succeed within 1s

**Scenario 3: High Load (50 users)**
- 50 concurrent users
- Each user places 1 order
- Expected: 90% of requests succeed within 2s

**Scenario 4: Stress Test (100 users)**
- 100 concurrent users
- Each user places 1 order
- Expected: System remains stable, graceful degradation

### Load Test Commands

```bash
# Normal load
node backend/load-test.js

# Medium load
NUM_USERS=30 node backend/load-test.js

# High load
NUM_USERS=50 node backend/load-test.js

# Stress test
NUM_USERS=100 node backend/load-test.js
```

## Monitoring

### Key Metrics to Monitor

1. **Backend Metrics**
   - CPU usage (target: < 80%)
   - Memory usage (target: < 400MB)
   - Request latency (p50, p95, p99)
   - Error rate (target: < 1%)
   - Cache hit rate (target: > 70%)

2. **Database Metrics**
   - Connection count (target: < 20)
   - Query latency (p95: < 200ms)
   - Slow query count
   - Connection pool utilization

3. **Frontend Metrics**
   - Page load time (target: < 3s)
   - Time to interactive (target: < 5s)
   - API call latency (p95: < 500ms)
   - SSE connection success rate (target: > 95%)

### Monitoring Tools

- Render: Built-in metrics dashboard
- Supabase: Query performance insights
- Browser DevTools: Network tab, Performance tab
- Custom logging: Add performance tracking to API calls

## Rollback Plan

If performance degrades:
1. Increase cache TTL
2. Reduce polling interval
3. Disable real-time updates (use polling only)
4. Reduce concurrent user limit
5. Scale up Render instance (paid tier)
6. Scale up Supabase (paid tier)

## Success Criteria

✅ System handles 50 concurrent users smoothly
✅ API response time < 500ms (p95)
✅ Database query time < 200ms (p95)
✅ Cache hit rate > 70%
✅ Error rate < 1%
✅ No memory leaks
✅ SSE connections stable
✅ User experience smooth (no flickering, no delays)
