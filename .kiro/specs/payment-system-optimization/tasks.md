# Tasks: Payment System Optimization

## Phase 1: Backend Query Optimization

### 1.1 Create Database Indexes
- [ ] Add composite index on orders(user_id, created_at)
- [ ] Add composite index on payments(user_id, created_at)
- [ ] Verify indexes are created via Supabase dashboard
- [ ] Test query performance before/after indexes

### 1.2 Implement Optimized Payment Query Builder
- [ ] Create query builder module for admin payments endpoint
- [ ] Implement single JOIN query combining users, orders, payments
- [ ] Add database aggregation functions (SUM, COUNT, COALESCE)
- [ ] Test query returns correct aggregated statistics
- [ ] Verify query executes in single database call

### 1.3 Update /api/payments Endpoint
- [ ] Replace N+1 query pattern with optimized JOIN query
- [ ] Add pagination support (limit, offset parameters)
- [ ] Add pagination metadata to response
- [ ] Validate limit (max 100) and offset (non-negative)
- [ ] Set default limit to 20, default offset to 0
- [ ] Test endpoint with various pagination parameters

### 1.4 Update /api/payments/my Endpoint
- [ ] Refactor to use optimized query for single user
- [ ] Ensure response includes all required payment stats
- [ ] Test endpoint returns correct data for user

### 1.5 Performance Testing - Query Optimization
- [ ] Create test dataset with 100-500 users
- [ ] Measure /api/payments response time
- [ ] Verify response time < 500ms
- [ ] Measure /api/stats/dashboard response time
- [ ] Verify response time < 300ms
- [ ] Document performance metrics

## Phase 2: Backend Caching Layer

### 2.1 Implement Cache Layer
- [ ] Create cache module with get/set/invalidate operations
- [ ] Implement cache key strategy (payments:admin:{month}, etc.)
- [ ] Add TTL support (5-min for payments, 10-min for stats)
- [ ] Add cache statistics tracking (hits, misses, invalidations)
- [ ] Test cache operations

### 2.2 Add Caching to /api/payments Endpoint
- [ ] Cache admin payments response with 5-min TTL
- [ ] Use month-specific cache keys
- [ ] Implement cache fallback (query DB if cache unavailable)
- [ ] Test cache hit/miss behavior
- [ ] Verify cache invalidation clears entries

### 2.3 Add Caching to /api/stats/dashboard Endpoint
- [ ] Cache dashboard stats with 10-min TTL
- [ ] Use month-specific cache keys
- [ ] Test cache behavior
- [ ] Verify performance improvement

### 2.4 Implement Cache Invalidation Strategy
- [ ] Create cache invalidation event system
- [ ] Invalidate payment cache when payment marked as paid
- [ ] Invalidate payment cache when order created/updated
- [ ] Invalidate stats cache when payment/order modified
- [ ] Invalidate all user cache when user deleted
- [ ] Test cache invalidation triggers

### 2.5 Add Cache Logging
- [ ] Log all cache invalidation events
- [ ] Include cache key and reason in logs
- [ ] Add cache statistics endpoint for monitoring
- [ ] Test logging functionality

## Phase 3: Real-time Infrastructure

### 3.1 Implement SSE Endpoint
- [ ] Create /api/sse/payments endpoint
- [ ] Implement SSE connection management
- [ ] Add heartbeat mechanism (30-second interval)
- [ ] Handle connection cleanup on disconnect
- [ ] Test SSE connection establishment

### 3.2 Implement SSE Notifications
- [ ] Send SSE notification when payment marked as paid
- [ ] Send SSE notification when order created
- [ ] Include notification payload with update data
- [ ] Test notification delivery
- [ ] Verify notification latency < 1 second

### 3.3 Implement SSE Reconnection Logic
- [ ] Add connection state tracking
- [ ] Implement automatic reconnection on disconnect
- [ ] Test reconnection behavior

### 3.4 Add Admin Cache Clear Endpoint
- [ ] Create /api/admin/cache/clear endpoint (admin only)
- [ ] Support clearing specific cache keys or all cache
- [ ] Add authentication check
- [ ] Test endpoint functionality

## Phase 4: Frontend Real-time Updates

### 4.1 Enhance usePayments Hook
- [ ] Add real-time subscription support
- [ ] Add pagination parameters (limit, offset)
- [ ] Add month parameter support
- [ ] Implement real-time update handling
- [ ] Add fallback to polling on subscription failure
- [ ] Test hook with various parameters

### 4.2 Implement Real-time Manager
- [ ] Create real-time manager module
- [ ] Implement SSE connection management
- [ ] Add exponential backoff reconnection (1s, 2s, 4s, 8s)
- [ ] Add polling fallback (5-second interval)
- [ ] Add connection state tracking
- [ ] Test real-time and fallback modes

### 4.3 Implement Frontend Cache Service
- [ ] Create cache service with 3-minute TTL
- [ ] Implement cache invalidation on real-time updates
- [ ] Add stale-while-revalidate pattern
- [ ] Add cache statistics
- [ ] Test cache operations

### 4.4 Update Payment Components
- [ ] Update PaymentDashboard to use pagination
- [ ] Add pagination controls (prev/next, page size)
- [ ] Display real-time/polling status indicator
- [ ] Show loading indicator for stale cache
- [ ] Test component with real-time updates

### 4.5 Add Error Handling
- [ ] Handle real-time subscription failures
- [ ] Handle polling failures with retry logic
- [ ] Display error messages to user
- [ ] Log errors for debugging
- [ ] Test error scenarios

## Phase 5: Integration and Testing

### 5.1 Integration Testing
- [ ] Test admin dashboard load with real data
- [ ] Verify all data loads within 500ms
- [ ] Test real-time update flow end-to-end
- [ ] Verify payment update reaches UI within 2 seconds
- [ ] Test fallback flow (SSE failure → polling)
- [ ] Test cache invalidation flow

### 5.2 Performance Testing
- [ ] Load test with 100-500 users
- [ ] Measure query response times
- [ ] Measure SSE notification latency
- [ ] Measure cache hit rate
- [ ] Monitor memory usage with active SSE connections
- [ ] Document performance metrics

### 5.3 Property-Based Testing
- [ ] Implement property tests for query optimization
- [ ] Implement property tests for caching behavior
- [ ] Implement property tests for pagination
- [ ] Implement property tests for real-time updates
- [ ] Run tests with minimum 100 iterations each
- [ ] Verify all properties pass

### 5.4 User Acceptance Testing
- [ ] Test admin dashboard with real users
- [ ] Verify dashboard loads quickly
- [ ] Verify real-time updates work as expected
- [ ] Verify fallback to polling works
- [ ] Collect user feedback
- [ ] Document any issues

## Phase 6: Deployment and Monitoring

### 6.1 Deployment Preparation
- [ ] Create database migration for indexes
- [ ] Create deployment checklist
- [ ] Document rollback procedure
- [ ] Prepare monitoring dashboards

### 6.2 Deployment
- [ ] Deploy database indexes
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Verify deployment in staging
- [ ] Monitor for errors

### 6.3 Post-deployment Monitoring
- [ ] Monitor query response times
- [ ] Monitor cache hit rate
- [ ] Monitor SSE connection stability
- [ ] Monitor error rates
- [ ] Collect performance metrics
- [ ] Document results

### 6.4 Documentation
- [ ] Document cache strategy
- [ ] Document real-time architecture
- [ ] Document performance improvements
- [ ] Create troubleshooting guide
- [ ] Update API documentation

## Acceptance Criteria Mapping

| Task | Requirement | Acceptance Criteria |
|------|-------------|-------------------|
| 1.2, 1.3 | 1 | 1.1, 1.2, 1.3 |
| 1.5 | 1 | 1.4 |
| 1.1 | 1 | 1.5 |
| 2.2 | 2 | 2.1, 2.4 |
| 2.4 | 2 | 2.2, 2.3 |
| 2.5 | 2 | 2.5 |
| 1.3 | 3 | 3.1, 3.2, 3.3, 3.4, 3.5 |
| 4.1, 4.2 | 4 | 4.1, 4.2, 4.3, 4.4, 4.5 |
| 3.1, 3.2 | 5 | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 |
| 1.2, 2.3 | 6 | 6.1, 6.2, 6.3, 6.4, 6.5 |
| 2.4, 2.5 | 7 | 7.1, 7.2, 7.3, 7.4, 7.5 |
| 4.3 | 8 | 8.1, 8.2, 8.3, 8.4, 8.5 |
| 4.2 | 9 | 9.1, 9.2, 9.3, 9.4, 9.5 |
| 1.2, 1.3 | 10 | 10.1, 10.2, 10.3, 10.4, 10.5 |

## Implementation Notes

### Database Indexes
- Use Supabase SQL editor to create indexes
- Verify indexes are created before deploying code changes
- Monitor index creation time (should be quick for existing tables)

### Cache Strategy
- Use in-memory cache for now (can migrate to Redis later)
- Cache keys include month parameter for month-specific caching
- Implement cache statistics for monitoring

### Real-time Strategy
- Use SSE for real-time updates (simpler than WebSocket)
- Implement polling fallback for browsers with SSE issues
- Use exponential backoff for reconnection to avoid overwhelming server

### Performance Targets
- Admin queries: < 500ms
- Stats queries: < 300ms
- Real-time updates: < 2 seconds
- SSE notifications: < 1 second

### Testing Approach
- Unit tests for individual components
- Integration tests for end-to-end flows
- Property-based tests for correctness properties
- Performance tests to verify targets
- User acceptance tests with real data
