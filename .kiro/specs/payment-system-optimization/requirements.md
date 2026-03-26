# Requirements Document: Payment System Optimization

## Introduction

The GourmetGrid payment system currently suffers from performance bottlenecks and limited real-time capabilities. The admin dashboard experiences slow load times due to N+1 query problems, regular users lack real-time payment updates, and the system has no pagination for large datasets. This feature improves backend query efficiency, adds real-time notifications for all users, implements proper caching strategies, and enhances the admin dashboard with pagination and performance optimizations.

## Glossary

- **Admin Dashboard**: The administrative interface for viewing and managing all user payments and orders
- **N+1 Query Problem**: Performance issue where one query fetches parent records, then N additional queries fetch related child records
- **Real-time Updates**: Live data synchronization without requiring manual page refresh
- **WebSocket**: Bidirectional communication protocol for real-time data transmission
- **Server-Sent Events (SSE)**: Unidirectional server-to-client real-time communication protocol
- **Polling**: Client-initiated periodic requests to check for data updates
- **Fallback**: Alternative mechanism used when primary mechanism fails
- **Pagination**: Dividing large datasets into smaller, manageable pages
- **Caching**: Storing frequently accessed data to reduce database queries
- **Payment Stats**: Aggregated payment information including totals, counts, and balances
- **User Payment Info**: Individual user's payment data including orders total, paid amount, and remaining balance

## Requirements

### Requirement 1: Optimize Admin Payments Endpoint with JOIN Queries

**User Story:** As an admin, I want the payment dashboard to load quickly, so that I can efficiently manage user payments without waiting for slow queries.

#### Acceptance Criteria

1. WHEN the admin requests the payments endpoint, THE Backend SHALL use a single JOIN query combining users, orders, and payments tables instead of N+1 queries
2. WHEN the admin requests payments for a specific month, THE Backend SHALL filter results by month in the JOIN query without separate queries per user
3. THE Backend SHALL calculate aggregated statistics (orders count, orders total, paid total, remaining total) in the database query, not in application code
4. WHEN the admin requests payments, THE Backend SHALL return results within 500ms for up to 100 users
5. THE Backend SHALL include database indexes on (user_id, created_at) for orders and payments tables to optimize JOIN performance

### Requirement 2: Implement Backend Caching for Payment Data

**User Story:** As an admin, I want payment data to be cached, so that repeated requests don't hit the database unnecessarily.

#### Acceptance Criteria

1. WHEN the admin requests the payments endpoint, THE Backend SHALL cache the result with a 5-minute TTL (Time To Live)
2. WHEN a payment is marked as paid, THE Backend SHALL invalidate the relevant cache entries
3. WHEN an order is created or updated, THE Backend SHALL invalidate the payment stats cache
4. THE Backend SHALL use a cache key format that includes the month parameter to support month-specific caching
5. WHERE the cache is unavailable, THE Backend SHALL fall back to querying the database without caching

### Requirement 3: Add Pagination to Admin Dashboard

**User Story:** As an admin managing many users, I want paginated results, so that the dashboard remains responsive with large datasets.

#### Acceptance Criteria

1. WHEN the admin requests the payments endpoint, THE Backend SHALL support limit and offset query parameters
2. THE Backend SHALL return pagination metadata including total count, current page, and page size
3. WHEN limit is not specified, THE Backend SHALL default to 20 results per page
4. WHEN offset is not specified, THE Backend SHALL default to 0 (first page)
5. THE Backend SHALL validate that limit does not exceed 100 and offset is non-negative

### Requirement 4: Implement Real-time Updates for Regular Users

**User Story:** As a regular user, I want to see my payment status update in real-time, so that I don't need to manually refresh the page.

#### Acceptance Criteria

1. WHEN a user views their payment information, THE Frontend SHALL establish a real-time subscription to payment updates
2. WHEN a payment is marked as paid, THE Frontend SHALL update the user's payment display within 2 seconds
3. WHEN a new order is created, THE Frontend SHALL update the user's payment balance within 2 seconds
4. WHERE real-time subscription fails, THE Frontend SHALL fall back to polling every 5 seconds
5. WHEN the user navigates away from the payment page, THE Frontend SHALL unsubscribe from real-time updates to prevent memory leaks

### Requirement 5: Add WebSocket or SSE Support for Real-time Notifications

**User Story:** As a user, I want to receive real-time notifications about payment status changes, so that I'm immediately informed of important updates.

#### Acceptance Criteria

1. THE Backend SHALL support Server-Sent Events (SSE) for real-time payment notifications
2. WHEN a payment is marked as paid, THE Backend SHALL send an SSE notification to the relevant user
3. WHEN an order is created, THE Backend SHALL send an SSE notification to the user
4. THE Backend SHALL maintain SSE connections with a 30-second heartbeat to prevent connection timeout
5. WHEN an SSE connection is closed, THE Frontend SHALL automatically attempt to reconnect with exponential backoff (1s, 2s, 4s, 8s max)
6. WHERE SSE is unavailable, THE Frontend SHALL fall back to polling every 5 seconds

### Requirement 6: Improve Payment Stats Calculation Performance

**User Story:** As an admin, I want payment statistics to be calculated efficiently, so that the dashboard displays stats quickly.

#### Acceptance Criteria

1. WHEN calculating payment stats, THE Backend SHALL use database aggregation functions (SUM, COUNT) instead of calculating in application code
2. WHEN the admin requests dashboard stats, THE Backend SHALL return results within 300ms
3. THE Backend SHALL cache payment stats with a 10-minute TTL
4. WHEN a payment or order is modified, THE Backend SHALL invalidate the stats cache
5. THE Backend SHALL support filtering stats by month without recalculating all historical data

### Requirement 7: Add Cache Invalidation Strategy

**User Story:** As a system, I want cache to be invalidated appropriately, so that users always see current data without stale information.

#### Acceptance Criteria

1. WHEN a payment is marked as paid, THE Backend SHALL invalidate payment-related cache entries
2. WHEN an order is created or updated, THE Backend SHALL invalidate payment stats cache
3. WHEN a user is deleted, THE Backend SHALL invalidate all cache entries related to that user
4. THE Backend SHALL support manual cache clearing via an admin endpoint
5. THE Backend SHALL log all cache invalidation events for debugging purposes

### Requirement 8: Implement Client-side Caching with Smart Invalidation

**User Story:** As a frontend, I want to cache payment data locally, so that the UI remains responsive while data is being fetched.

#### Acceptance Criteria

1. WHEN the user requests payment data, THE Frontend SHALL cache the result with a 3-minute TTL
2. WHEN the user marks a payment as paid, THE Frontend SHALL immediately update the local cache
3. WHEN a real-time update is received, THE Frontend SHALL invalidate the relevant cache entries
4. THE Frontend SHALL display cached data while fetching fresh data in the background
5. WHERE the cache is stale, THE Frontend SHALL show a loading indicator to inform the user

### Requirement 9: Add Realtime Fallback Mechanism for Regular Users

**User Story:** As a regular user, I want payment updates even if real-time fails, so that I always receive notifications.

#### Acceptance Criteria

1. WHEN real-time subscription fails, THE Frontend SHALL automatically switch to polling mode
2. THE Frontend SHALL poll every 5 seconds when in fallback mode
3. WHEN real-time subscription recovers, THE Frontend SHALL switch back to real-time mode
4. THE Frontend SHALL display a status indicator showing whether real-time or polling mode is active
5. THE Frontend SHALL log fallback events for monitoring and debugging

### Requirement 10: Optimize Admin Dashboard Query Performance

**User Story:** As an admin, I want the dashboard to load quickly with all necessary data, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN the admin loads the dashboard, THE Backend SHALL return all required data in a single optimized query
2. THE Backend SHALL include user information, order counts, payment totals, and remaining balances in one response
3. WHEN the admin applies filters (month, user), THE Backend SHALL apply filters in the database query
4. THE Backend SHALL return results within 500ms for typical datasets (100-500 users)
5. THE Backend SHALL support sorting by different columns (name, orders total, remaining balance) efficiently
