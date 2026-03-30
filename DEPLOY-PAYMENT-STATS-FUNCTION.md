# Deploy Payment Stats Function

This guide explains how to deploy the optimized `get_payment_stats` PostgreSQL function to fix the N+1 query problem.

## Problem

The `buildPaymentStatsQuery()` function in `backend/server.js` was executing 1+2N queries (1 user query + 2 queries per user for orders and payments), causing severe performance issues with 100+ users.

## Solution

The optimized implementation uses a single PostgreSQL function with CTEs (Common Table Expressions) and JOINs to reduce query count from 200+ to just 2 queries, regardless of user count.

## Deployment Steps

### 1. Deploy the PostgreSQL Function

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `CREATE-PAYMENT-STATS-FUNCTION.sql` from the project root
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to create the function

### 2. Verify the Function

Run the test script to verify the function was created successfully:

```bash
cd backend
node test-payment-stats-function.js
```

Expected output:
```
✅ RPC call successful!
📈 Results: X users returned
✅ All required fields present
🎉 Function test successful!
```

### 3. Run the Tests

After deploying the function, run the bug condition test to verify the N+1 problem is fixed:

```bash
cd backend
node test-n-plus-one-bug.js
```

Expected outcome: Test should now **PASS** (query count <= 2, response time < 500ms)

Then run the preservation tests to ensure no regressions:

```bash
cd backend
node test-n-plus-one-preservation.js
```

Expected outcome: All tests should still **PASS** (business logic preserved)

## Performance Improvements

**Before (N+1 Pattern):**
- 100 users: 201 queries, ~2-3 seconds
- Query count: O(N) - grows linearly with user count

**After (Optimized):**
- 100 users: 2 queries, <500ms
- Query count: O(1) - constant regardless of user count

## Technical Details

The optimized query uses:
- **CTEs (WITH clauses)**: Separate user_orders and user_payments calculations
- **LEFT JOINs**: Handle users with no orders/payments
- **GROUP BY + Aggregations**: COUNT, SUM for statistics
- **CASE expressions**: Implement ordered_for payment responsibility logic in SQL
- **Filters**: deleted_at IS NULL, date range, role='user'
- **Pagination**: LIMIT and OFFSET preserved

## Rollback

If you need to rollback to the old implementation, you can drop the function:

```sql
DROP FUNCTION IF EXISTS get_payment_stats(TEXT, TIMESTAMP, TIMESTAMP, INTEGER, INTEGER);
```

Then revert the changes in `backend/server.js` using git:

```bash
git checkout HEAD -- backend/server.js
```
