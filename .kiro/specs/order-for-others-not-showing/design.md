# Order-for-Others Not Showing Bugfix Design

## Overview

When User A orders meals for User B using the "Đặt món cho" (Order for) dropdown feature, User B does not see the order in their order history or payment dashboard. The backend code appears correct with proper OR filter syntax (`query.or(\`user_id.eq.${userId},ordered_for.eq.${userId}\`)`), but the filter is not working as expected in production.

The fix strategy involves:
1. Verifying the Supabase OR filter syntax is correct
2. Testing alternative query approaches (separate queries vs OR filter)
3. Checking if RLS policies are interfering with the OR filter
4. Verifying the `ordered_for` field is being stored correctly
5. Adding comprehensive logging to identify the root cause

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when User B views their order history or payment dashboard after User A has ordered for them
- **Property (P)**: The desired behavior - User B should see orders where `ordered_for = User B's ID` in addition to orders where `user_id = User B's ID`
- **Preservation**: Existing functionality that must remain unchanged - User A continues to see orders they placed, admins see all orders, mouse clicks work, etc.
- **OR Filter**: Supabase query filter that should return rows matching either condition: `user_id.eq.X` OR `ordered_for.eq.X`
- **ordered_for**: Database field storing the ID of the user for whom the order was placed (recipient)
- **user_id**: Database field storing the ID of the user who placed the order (orderer)
- **RLS (Row Level Security)**: Supabase security feature that can restrict query results based on policies

## Bug Details

### Bug Condition

The bug manifests when User B (the recipient) views their order history or payment dashboard after User A has ordered meals for them. The backend query uses an OR filter to include both orders placed by the user and orders placed for the user, but only the first condition (`user_id.eq.${userId}`) appears to be working.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { userId: number, viewType: 'orders' | 'payments' }
  OUTPUT: boolean
  
  RETURN EXISTS order IN database WHERE order.ordered_for = input.userId
         AND input.viewType IN ['orders', 'payments']
         AND order NOT IN results_returned_by_query(input.userId)
END FUNCTION
```

### Examples

- **Example 1**: User A (ID: 123) orders meals for User B (ID: 456). User B views `/api/orders/all`. Expected: Order appears in list. Actual: Order does not appear.

- **Example 2**: User A (ID: 123) orders meals for User B (ID: 456). User B views payment dashboard (`/api/payments/my`). Expected: Order amount included in total. Actual: Order amount not included.

- **Example 3**: User A (ID: 123) orders meals for User B (ID: 456). User A views `/api/orders/all`. Expected: Order appears in list. Actual: Order appears (this works correctly).

- **Edge Case**: Admin views all orders. Expected: All orders appear regardless of `user_id` or `ordered_for`. Actual: All orders appear (this works correctly).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- User A (the orderer) must continue to see orders they placed in their order history
- User A's payment dashboard must continue to include orders they placed
- When User A orders for themselves (`orderedFor = User A's ID`), the order must continue to appear in their history
- Admin users must continue to see all orders without filtering
- The frontend must continue to send the `orderedFor` parameter correctly
- The backend must continue to store both `user_id` and `ordered_for` fields correctly
- Soft-deleted orders must continue to be excluded using `deleted_at IS NULL` filter
- Order creation, update, and deletion functionality must remain unchanged

**Scope:**
All inputs that do NOT involve User B viewing their order history or payment dashboard should be completely unaffected by this fix. This includes:
- User A viewing their own orders and payments
- Admin viewing all orders and payments
- Order creation with `orderedFor` parameter
- Order updates and deletions
- Payment marking and calculations for User A

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Supabase OR Filter Syntax Issue**: The OR filter syntax `query.or(\`user_id.eq.${userId},ordered_for.eq.${userId}\`)` might not be the correct format for Supabase PostgREST API. Supabase might require a different syntax or escaping.

2. **RLS Policy Interference**: Although RLS is disabled on the orders table (per `FIX-RLS-POLICIES.sql`), there might be residual policies or the RLS disable didn't take effect properly, causing the OR filter to be ignored or partially applied.

3. **Query Builder Chain Issue**: The Supabase query builder might not be properly chaining the OR filter with other filters (`.is('deleted_at', null)`, `.order()`, etc.), causing the OR condition to be dropped or overridden.

4. **Field Name Mismatch**: The database column might be named differently than `ordered_for` (e.g., `orderedFor`, `ordered_for_id`), causing the OR filter to fail silently on the second condition.

5. **NULL Handling**: If `ordered_for` is NULL for some orders, the OR filter might be failing due to NULL comparison issues in PostgreSQL/Supabase.

## Correctness Properties

Property 1: Bug Condition - Orders Placed For User Are Visible

_For any_ query to `/api/orders/all` or `/api/payments/my` where there exists an order with `ordered_for = current user's ID`, the fixed query SHALL return that order in the results, allowing User B to see orders placed for them by User A.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Orders Placed By User Remain Visible

_For any_ query to `/api/orders/all` or `/api/payments/my` where there exists an order with `user_id = current user's ID`, the fixed query SHALL continue to return that order in the results, preserving the existing behavior where users see orders they placed themselves.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, we need to investigate and fix the OR filter:

**File**: `backend/server.js`

**Function**: `GET /api/orders/all` (lines 867-890) and payment calculation logic (lines 1190-1210)

**Specific Changes**:

1. **Verify OR Filter Syntax**: Test alternative Supabase OR filter syntaxes:
   - Current: `query.or(\`user_id.eq.${userId},ordered_for.eq.${userId}\`)`
   - Alternative 1: `query.or('user_id.eq.' + userId + ',ordered_for.eq.' + userId)`
   - Alternative 2: Split into two separate queries and merge results
   - Alternative 3: Use `.in()` filter if Supabase supports it

2. **Add Comprehensive Logging**: Add logging before and after the OR filter to see what's being queried and returned:
   ```javascript
   console.log('Querying orders with OR filter:', `user_id.eq.${req.user.id},ordered_for.eq.${req.user.id}`);
   const { data: orders, error } = await query;
   console.log('Orders returned:', orders?.length, 'Error:', error);
   ```

3. **Test Alternative Query Approach**: If OR filter continues to fail, use two separate queries:
   ```javascript
   // Query 1: Orders placed by user
   const { data: ordersByUser } = await supabase
     .from('orders')
     .select('*')
     .eq('user_id', req.user.id)
     .is('deleted_at', null);
   
   // Query 2: Orders placed for user
   const { data: ordersForUser } = await supabase
     .from('orders')
     .select('*')
     .eq('ordered_for', req.user.id)
     .is('deleted_at', null);
   
   // Merge and deduplicate
   const allOrders = [...ordersByUser, ...ordersForUser];
   const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
   ```

4. **Verify Database Schema**: Check that `ordered_for` column exists and has correct type:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'orders' AND column_name = 'ordered_for';
   ```

5. **Check RLS Status**: Verify RLS is actually disabled:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'orders';
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that create orders with `ordered_for` set to a different user, then query as that user to verify the order appears. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Basic Order-For-Others Test**: User A orders for User B, User B queries `/api/orders/all` (will fail on unfixed code - order not returned)
2. **Payment Calculation Test**: User A orders for User B, User B queries `/api/payments/my` (will fail on unfixed code - order not counted)
3. **Database Verification Test**: Query database directly to verify `ordered_for` field is stored correctly (should pass - data is stored)
4. **OR Filter Syntax Test**: Test different OR filter syntaxes directly against Supabase to find working syntax (will identify correct syntax)

**Expected Counterexamples**:
- User B's order query returns empty array or only orders where `user_id = User B's ID`
- User B's payment calculation shows 0 orders or only counts orders where `user_id = User B's ID`
- Possible causes: OR filter syntax incorrect, RLS policy blocking, query builder issue, field name mismatch

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := queryOrders_fixed(input.userId)
  ASSERT EXISTS order IN result WHERE order.ordered_for = input.userId
END FOR
```

**Test Cases**:
1. User A orders for User B, User B queries orders → order appears
2. User A orders for User B, User B queries payments → order counted
3. User A orders for User B, User B queries orders → order has correct data (dish names, price, etc.)
4. Multiple users order for User B, User B queries orders → all orders appear

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT queryOrders_original(input) = queryOrders_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for User A's queries and admin queries, then write property-based tests capturing that behavior.

**Test Cases**:
1. **User A Order Visibility Preservation**: User A orders for User B, User A queries orders → order appears (should work on both unfixed and fixed code)
2. **User A Payment Preservation**: User A orders for User B, User A queries payments → order counted (should work on both unfixed and fixed code)
3. **Self-Order Preservation**: User A orders for themselves, User A queries orders → order appears (should work on both unfixed and fixed code)
4. **Admin View Preservation**: Admin queries all orders → all orders appear (should work on both unfixed and fixed code)
5. **Soft Delete Preservation**: Deleted orders are excluded from queries (should work on both unfixed and fixed code)

### Unit Tests

- Test OR filter syntax with different formats
- Test query with `user_id` condition only
- Test query with `ordered_for` condition only
- Test query with both conditions (OR filter)
- Test edge cases (NULL `ordered_for`, same user for both fields)

### Property-Based Tests

- Generate random user pairs (User A, User B) and verify orders placed by A for B appear in B's history
- Generate random order configurations and verify preservation of existing behavior
- Test that all non-buggy queries continue to work across many scenarios

### Integration Tests

- Test full order creation and retrieval flow with `orderedFor` parameter
- Test payment calculation includes orders from both `user_id` and `ordered_for`
- Test admin view shows all orders regardless of fix
