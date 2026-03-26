# Load Optimization Requirements - 30 Concurrent Users

## Problem Statement
Hệ thống hiện tại chỉ chịu được ~87% thành công với 30 người cùng lúc (12 lỗi 500 trong 90 requests). Cần tối ưu hóa để đạt 95%+ success rate.

## Current Constraints
- **Backend**: Render free tier (512MB RAM, 1 CPU, auto-sleep)
- **Database**: Supabase free tier (PostgreSQL, 2 concurrent connections limit)
- **Frontend**: React polling (3s admin, 10s user)
- **Network**: Limited bandwidth on free tier

## Success Criteria
1. ✅ **Success Rate**: 95%+ (tối đa 5 lỗi trong 100 requests)
2. ✅ **Response Time**: < 2 giây trung bình (từ 2.4s hiện tại)
3. ✅ **P95 Latency**: < 3 giây
4. ✅ **No 500 Errors**: Xử lý gracefully khi overload
5. ✅ **Memory Usage**: < 400MB (từ 512MB available)

## Optimization Areas

### 1. Backend Optimizations
- **Connection Pooling**: Quản lý connection pool tốt hơn
- **Request Queuing**: Queue requests khi overload
- **Response Compression**: Gzip tất cả responses
- **Rate Limiting**: Prevent abuse
- **Error Handling**: Graceful degradation

### 2. Database Optimizations
- **Query Caching**: Cache query results (5-15 min TTL)
- **Index Optimization**: Thêm indexes cho slow queries
- **Query Batching**: Batch multiple queries
- **Connection Reuse**: Reuse connections efficiently

### 3. Frontend Optimizations
- **Request Batching**: Batch API calls
- **Client Caching**: Increase cache TTL
- **Lazy Loading**: Load data on-demand
- **Polling Optimization**: Reduce polling frequency

### 4. Data Optimization
- **Pagination**: Paginate large datasets
- **Selective Fields**: Only fetch needed fields
- **Data Compression**: Compress large payloads

## Implementation Phases

### Phase 1: Critical (Immediate Impact)
1. Implement response compression (gzip)
2. Add rate limiting
3. Improve error handling
4. Add query result caching

### Phase 2: Important (Medium Impact)
1. Optimize database queries
2. Add missing indexes
3. Implement request queuing
4. Client-side cache optimization

### Phase 3: Nice-to-Have (Long-term)
1. Materialized views for stats
2. Data archiving
3. Advanced monitoring

## Metrics to Track
- Request success rate
- Average response time
- P95/P99 latency
- Memory usage
- CPU usage
- Database connection count
- Cache hit rate
