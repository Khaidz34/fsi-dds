# Design Document: Payment System Optimization

## Overview

The payment system optimization feature addresses critical performance bottlenecks in GourmetGrid's admin dashboard and user payment tracking. The current implementation suffers from N+1 query problems, lacks real-time capabilities, and has no pagination for large datasets. This design introduces:

1. **Backend Query Optimization**: Single JOIN queries replacing N+1 patterns
2. **Multi-layer Caching**: Server-side and client-side caching with smart invalidation
3. **Pagination**: Efficient data loading for large user lists
4. **Real-time Updates**: SSE-based notifications with polling fallback
5. **Performance Targets**: 500ms for admin queries, 300ms for stats, 2-second UI updates

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Payment Hooks    │  │ Cache Service    │                 │
│  │ - usePayments    │  │ - 3min TTL       │                 │
│  │ - useRealtime    │  │ - Invalidation   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ SSE Manager      │  │ Polling Fallback │                 │
│  │ - Connection     │  │ - 5sec interval  │                 │
│  │ - Reconnect      │  │ - Exponential BO │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Payment Routes   │  │ Cache Layer      │                 │
│  │ - /payments      │  │ - 5min TTL       │                 │
│  │ - /payments/my   │  │ - Invalidation   │                 │
│  │ - /sse/payments  │  │ - Key strategy   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Query Builder    │  │ SSE Manager      │                 │
│  │ - JOIN queries   │  │ - Connections    │                 │
│  │ - Aggregation    │  │ - Heartbeat      │                 │
│  │ - Pagination     │  │ - Notifications  │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                  Database (Supabase)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ users table      │  │ orders table     │                 │
│  │ - id (PK)        │  │ - id (PK)        │                 │
│  │ - fullname       │  │ - user_id (FK)   │                 │
│  │ - username       │  │ - price          │                 │
│  │ - role           │  │ - created_at     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ payments table   │  │ Indexes          │                 │
│  │ - id (PK)        │  │ - orders(user_id,│                 │
│  │ - user_id (FK)   │  │   created_at)    │                 │
│  │ - amount         │  │ - payments(user_ │                 │
│  │ - created_at     │  │   id, created_at)│                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Admin Dashboard Load**:
1. Frontend requests `/api/payments?month=2024-01&limit=20&offset=0`
2. Backend checks cache (5-min TTL with month-specific key)
3. If cached, return immediately
4. If not cached:
   - Execute single JOIN query combining users, orders, payments
   - Calculate aggregates (SUM, COUNT) in database
   - Apply pagination (LIMIT, OFFSET)
   - Cache result with month-specific key
   - Return to frontend
5. Frontend caches result (3-min TTL)
6. Frontend subscribes to SSE for real-time updates

**Real-time Update Flow**:
1. Admin marks payment as paid via `/api/payments/mark-paid`
2. Backend:
   - Inserts payment record
   - Invalidates cache entries (payment stats, user-specific)
   - Sends SSE notification to affected user
3. Frontend receives SSE notification
4. Frontend invalidates local cache
5. Frontend refetches data or updates UI from notification payload

**Fallback Flow** (when SSE fails):
1. Frontend detects SSE connection failure
2. Switches to polling mode (5-second interval)
3. Polls `/api/payments/my` every 5 seconds
4. When SSE recovers, switches back to real-time mode

## Components and Interfaces

### Backend Components

#### 1. Optimized Payment Query Builder

```javascript
// Query structure for admin payments
SELECT 
  u.id, u.fullname, u.username,
  COUNT(DISTINCT o.id) as ordersCount,
  COALESCE(SUM(o.price), 0) as ordersTotal,
  COUNT(DISTINCT p.id) as paidCount,
  COALESCE(SUM(p.amount), 0) as paidTotal,
  GREATEST(0, COALESCE(SUM(o.price), 0) - COALESCE(SUM(p.amount), 0)) as remainingTotal
FROM users u
LEFT JOIN orders o ON u.id = o.user_id 
  AND o.created_at >= $1 AND o.created_at < $2
LEFT JOIN payments p ON u.id = p.user_id 
  AND p.created_at >= $1 AND p.created_at < $2
WHERE u.role = 'user'
GROUP BY u.id, u.fullname, u.username
ORDER BY u.fullname
LIMIT $3 OFFSET $4
```

#### 2. Cache Layer

```javascript
interface CacheConfig {
  key: string;           // e.g., "payments:2024-01:admin"
  ttl: number;          // milliseconds
  invalidateOn: string[]; // events that invalidate this cache
}

// Cache keys strategy:
// - payments:admin:{month} - admin payments list
// - payments:user:{userId}:{month} - user payment stats
// - stats:dashboard:{month} - dashboard stats
// - stats:user:{userId}:{month} - user stats
```

#### 3. SSE Manager

```javascript
interface SSEConnection {
  userId: number;
  res: Response;
  lastHeartbeat: number;
}

// Maintains active SSE connections
// Sends heartbeat every 30 seconds
// Sends notifications on payment/order changes
```

### Frontend Components

#### 1. Enhanced usePayments Hook

```typescript
interface UsePaymentsOptions {
  month?: string;
  limit?: number;
  offset?: number;
  enableRealtime?: boolean;
}

interface PaymentStats {
  month: string;
  ordersCount: number;
  ordersTotal: number;
  paidCount: number;
  paidTotal: number;
  remainingCount: number;
  remainingTotal: number;
  overpaidTotal?: number;
}

interface PaginatedResponse {
  data: PaymentStats[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
```

#### 2. Real-time Manager

```typescript
interface RealtimeConfig {
  userId: number;
  onUpdate: (data: PaymentUpdate) => void;
  onError: (error: Error) => void;
  fallbackInterval?: number; // 5000ms default
}

interface PaymentUpdate {
  type: 'payment_marked' | 'order_created' | 'order_updated';
  userId: number;
  data: any;
  timestamp: number;
}
```

#### 3. Cache Service

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Client-side cache with 3-minute TTL
// Invalidated on real-time updates
// Supports stale-while-revalidate pattern
```

## Data Models

### Payment Stats Response

```json
{
  "data": [
    {
      "userId": 1,
      "fullname": "Nguyễn Văn A",
      "username": "user1",
      "month": "2024-01",
      "ordersCount": 5,
      "ordersTotal": 200000,
      "paidCount": 3,
      "paidTotal": 120000,
      "remainingCount": 1,
      "remainingTotal": 80000,
      "overpaidTotal": 0
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### SSE Notification Payload

```json
{
  "type": "payment_marked",
  "userId": 1,
  "data": {
    "amount": 120000,
    "month": "2024-01",
    "newRemaining": 80000
  },
  "timestamp": 1704067200000
}
```

### Cache Invalidation Events

```javascript
// Events that trigger cache invalidation:
{
  'payment:marked': ['payments:admin:*', 'payments:user:{userId}:*', 'stats:*'],
  'order:created': ['payments:admin:*', 'payments:user:{userId}:*', 'stats:*'],
  'order:updated': ['payments:admin:*', 'payments:user:{userId}:*', 'stats:*'],
  'user:deleted': ['payments:*', 'stats:*']
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Single Query Optimization

*For any* admin request to `/api/payments`, the backend SHALL execute exactly one database query combining users, orders, and payments tables using JOIN operations, not N+1 separate queries.

**Validates: Requirements 1.1, 1.2, 10.1**

### Property 2: Database Aggregation

*For any* payment stats calculation, the backend SHALL use database aggregation functions (SUM, COUNT) in the query itself, not in application code, ensuring aggregates are computed at the database level.

**Validates: Requirements 1.3, 6.1**

### Property 3: Performance Target - Admin Queries

*For any* admin request to `/api/payments` with up to 100 users, the backend SHALL return results within 500 milliseconds.

**Validates: Requirements 1.4, 10.4**

### Property 4: Performance Target - Stats Queries

*For any* request to `/api/stats/dashboard`, the backend SHALL return results within 300 milliseconds.

**Validates: Requirements 6.2**

### Property 5: Database Indexes Exist

*For any* database schema check, the orders and payments tables SHALL have composite indexes on (user_id, created_at) to optimize JOIN performance.

**Validates: Requirements 1.5**

### Property 6: Server-side Cache TTL

*For any* admin request to `/api/payments`, if the same request is made twice within 5 minutes, the second request SHALL return cached data without executing a new database query.

**Validates: Requirements 2.1**

### Property 7: Cache Invalidation on Payment

*For any* payment marked as paid, all cache entries related to that user's payment stats SHALL be invalidated, causing subsequent requests to fetch fresh data from the database.

**Validates: Requirements 2.2, 7.1**

### Property 8: Cache Invalidation on Order

*For any* order created or updated, the payment stats cache for that user and month SHALL be invalidated.

**Validates: Requirements 2.3, 7.2**

### Property 9: Month-specific Cache Keys

*For any* two requests with different month parameters, the backend SHALL use different cache keys, allowing independent caching of data for different months.

**Validates: Requirements 2.4**

### Property 10: Cache Fallback

*For any* request when the cache is unavailable or disabled, the backend SHALL fall back to querying the database and return correct results without caching.

**Validates: Requirements 2.5**

### Property 11: Pagination Parameters

*For any* request to `/api/payments` with limit and offset parameters, the backend SHALL apply these parameters to the database query and return the correct page of results.

**Validates: Requirements 3.1**

### Property 12: Pagination Metadata

*For any* paginated response, the backend SHALL include pagination metadata containing total count, current page, and page size.

**Validates: Requirements 3.2**

### Property 13: Default Pagination Limit

*For any* request to `/api/payments` without a limit parameter, the backend SHALL default to returning 20 results per page.

**Validates: Requirements 3.3**

### Property 14: Default Pagination Offset

*For any* request to `/api/payments` without an offset parameter, the backend SHALL default to offset 0 (first page).

**Validates: Requirements 3.4**

### Property 15: Pagination Validation

*For any* request with limit > 100 or offset < 0, the backend SHALL either reject the request or clamp the values to valid ranges (limit ≤ 100, offset ≥ 0).

**Validates: Requirements 3.5**

### Property 16: Frontend Real-time Subscription

*For any* user viewing their payment information, the frontend SHALL establish a real-time subscription to payment updates within 1 second of component mount.

**Validates: Requirements 4.1**

### Property 17: Real-time Update Latency - Payments

*For any* payment marked as paid, the frontend SHALL update the user's payment display within 2 seconds of the backend sending the update.

**Validates: Requirements 4.2**

### Property 18: Real-time Update Latency - Orders

*For any* new order created, the frontend SHALL update the user's payment balance within 2 seconds of the backend sending the update.

**Validates: Requirements 4.3**

### Property 19: Real-time Fallback to Polling

*For any* real-time subscription failure, the frontend SHALL automatically switch to polling mode and poll every 5 seconds.

**Validates: Requirements 4.4, 9.1, 9.2**

### Property 20: Real-time Cleanup

*For any* user navigating away from the payment page, the frontend SHALL unsubscribe from real-time updates and clean up resources to prevent memory leaks.

**Validates: Requirements 4.5**

### Property 21: SSE Support

*For any* backend instance, the `/api/sse/payments` endpoint SHALL be available and support Server-Sent Events connections.

**Validates: Requirements 5.1**

### Property 22: SSE Payment Notification

*For any* payment marked as paid, the backend SHALL send an SSE notification to the relevant user within 1 second.

**Validates: Requirements 5.2**

### Property 23: SSE Order Notification

*For any* order created, the backend SHALL send an SSE notification to the user within 1 second.

**Validates: Requirements 5.3**

### Property 24: SSE Heartbeat

*For any* active SSE connection, the backend SHALL send a heartbeat message every 30 seconds to prevent connection timeout.

**Validates: Requirements 5.4**

### Property 25: SSE Reconnection with Exponential Backoff

*For any* closed SSE connection, the frontend SHALL attempt to reconnect with exponential backoff intervals (1s, 2s, 4s, 8s max).

**Validates: Requirements 5.5**

### Property 26: SSE Fallback to Polling

*For any* unavailable SSE connection, the frontend SHALL fall back to polling every 5 seconds.

**Validates: Requirements 5.6**

### Property 27: Client-side Cache TTL

*For any* user request for payment data, the frontend SHALL cache the result with a 3-minute TTL.

**Validates: Requirements 8.1**

### Property 28: Optimistic Cache Update

*For any* user marking a payment as paid, the frontend SHALL immediately update the local cache before the server response is received.

**Validates: Requirements 8.2**

### Property 29: Cache Invalidation on Real-time Update

*For any* real-time update received, the frontend SHALL invalidate the relevant cache entries, causing the next request to fetch fresh data.

**Validates: Requirements 8.3**

### Property 30: Stale-while-revalidate Pattern

*For any* user requesting payment data, the frontend SHALL display cached data while fetching fresh data in the background.

**Validates: Requirements 8.4**

### Property 31: Stale Cache Indicator

*For any* stale cache entry, the frontend SHALL display a loading indicator to inform the user that fresh data is being fetched.

**Validates: Requirements 8.5**

### Property 32: Real-time Recovery

*For any* recovered real-time subscription, the frontend SHALL switch back from polling mode to real-time mode.

**Validates: Requirements 9.3**

### Property 33: Mode Status Indicator

*For any* active payment page, the frontend SHALL display a status indicator showing whether real-time or polling mode is active.

**Validates: Requirements 9.4**

### Property 34: Fallback Event Logging

*For any* fallback event (real-time to polling), the frontend SHALL log the event for monitoring and debugging purposes.

**Validates: Requirements 9.5**

### Property 35: Dashboard Query Optimization

*For any* admin dashboard load, the backend SHALL return all required data (user info, order counts, payment totals, remaining balances) in a single optimized query.

**Validates: Requirements 10.2**

### Property 36: Filter Application

*For any* admin request with filters (month, user), the backend SHALL apply filters in the database query, not in application code.

**Validates: Requirements 10.3**

### Property 37: Sorting Support

*For any* admin request with sort parameters, the backend SHALL support efficient sorting by name, orders total, and remaining balance.

**Validates: Requirements 10.5**

### Property 38: Cache Invalidation on User Deletion

*For any* user deleted from the system, all cache entries related to that user SHALL be invalidated.

**Validates: Requirements 7.3**

### Property 39: Admin Cache Clear Endpoint

*For any* admin user, the backend SHALL provide an endpoint to manually clear cache entries.

**Validates: Requirements 7.4**

### Property 40: Cache Invalidation Logging

*For any* cache invalidation event, the backend SHALL log the event including the cache key and reason for debugging purposes.

**Validates: Requirements 7.5**

## Error Handling

### Backend Error Handling

1. **Database Connection Errors**
   - Fallback to in-memory cache if available
   - Return 503 Service Unavailable if cache also unavailable
   - Log error for monitoring

2. **Query Timeout**
   - Set 10-second timeout on all database queries
   - Return 504 Gateway Timeout if exceeded
   - Suggest pagination to reduce dataset size

3. **Cache Errors**
   - If cache write fails, continue without caching
   - If cache read fails, query database directly
   - Log cache errors for debugging

4. **SSE Connection Errors**
   - Gracefully close connection on error
   - Frontend automatically reconnects with backoff
   - Log connection errors

5. **Validation Errors**
   - Invalid limit/offset: return 400 Bad Request
   - Invalid month format: return 400 Bad Request
   - Missing required fields: return 400 Bad Request

### Frontend Error Handling

1. **Real-time Subscription Failure**
   - Catch subscription error
   - Switch to polling mode
   - Display status indicator
   - Log error

2. **Polling Failure**
   - Retry with exponential backoff
   - Display error message after 3 retries
   - Allow manual retry

3. **Cache Errors**
   - If cache read fails, fetch from server
   - If cache write fails, continue without caching
   - Log cache errors

4. **Network Errors**
   - Retry with exponential backoff
   - Display offline indicator
   - Queue updates for when connection recovers

## Testing Strategy

### Unit Testing

**Backend Unit Tests**:
- Query builder: Verify JOIN query structure and aggregation functions
- Cache layer: Test cache set/get/invalidate operations
- Pagination: Test limit/offset validation and default values
- SSE manager: Test connection management and heartbeat
- Error handling: Test fallback mechanisms

**Frontend Unit Tests**:
- usePayments hook: Test data fetching and caching
- Real-time manager: Test subscription and fallback logic
- Cache service: Test cache operations and TTL
- Error handling: Test error recovery

### Property-Based Testing

**Backend Properties**:
- Property 1: Single query optimization (verify query count)
- Property 3: Performance target (measure response time)
- Property 6: Cache TTL (verify cache hit on second request)
- Property 7: Cache invalidation (verify cache cleared after update)
- Property 11: Pagination (verify correct page returned)
- Property 15: Pagination validation (verify invalid params rejected)

**Frontend Properties**:
- Property 16: Real-time subscription (verify subscription established)
- Property 17: Update latency (measure time to UI update)
- Property 19: Fallback to polling (verify polling starts on failure)
- Property 27: Client-side cache (verify cache TTL)
- Property 30: Stale-while-revalidate (verify cached data displayed)

### Integration Testing

- Admin dashboard load: Verify all data loads within 500ms
- Real-time update flow: Verify payment update reaches UI within 2 seconds
- Fallback flow: Verify polling starts when SSE fails
- Cache invalidation: Verify cache cleared on payment/order changes

### Performance Testing

- Load test with 100-500 users
- Measure query response time
- Measure SSE notification latency
- Measure cache hit rate
- Monitor memory usage with active SSE connections

### Configuration

- Minimum 100 iterations per property test
- Each test tagged with design property reference
- Tag format: `Feature: payment-system-optimization, Property {number}: {property_text}`
