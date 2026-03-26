# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Orders Placed For User Are Visible
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test concrete failing cases - User A orders for User B, User B queries their orders
  - Test that when User A orders for User B (ordered_for = User B's ID), User B's query to `/api/orders/all` returns the order
  - Test that when User A orders for User B, User B's query to `/api/payments/my` includes the order amount
  - The test assertions should match: EXISTS order IN result WHERE order.ordered_for = User B's ID
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: User B's query returns empty or only orders where user_id = User B's ID
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Orders Placed By User Remain Visible
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (User A viewing their own orders, admin viewing all orders)
  - Write property-based tests capturing observed behavior patterns:
    - User A orders for User B, User A queries orders → order appears
    - User A orders for User B, User A queries payments → order counted
    - User A orders for themselves, User A queries orders → order appears
    - Admin queries all orders → all orders appear
    - Soft-deleted orders excluded from all queries
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [-] 3. Fix OR filter for order-for-others visibility

  - [ ] 3.1 Investigate and verify OR filter syntax
    - Add comprehensive logging to `/api/orders/all` endpoint (lines 867-890 in backend/server.js)
    - Log the OR filter string being used: `user_id.eq.${userId},ordered_for.eq.${userId}`
    - Log the query results (count and sample data)
    - Test alternative Supabase OR filter syntaxes if current syntax fails
    - Verify `ordered_for` column exists and has correct data type in database
    - Check RLS status on orders table (should be disabled)
    - _Bug_Condition: isBugCondition(input) where EXISTS order WHERE order.ordered_for = input.userId AND order NOT IN results_
    - _Expected_Behavior: Query SHALL return orders where user_id = userId OR ordered_for = userId_
    - _Preservation: User A continues to see orders they placed, admins see all orders_
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 3.5, 3.6_

  - [x] 3.2 Implement the fix for `/api/orders/all` endpoint
    - Apply correct OR filter syntax based on investigation findings
    - If OR filter syntax is correct but not working, implement alternative approach (two separate queries merged)
    - Ensure query includes both conditions: `user_id.eq.${userId}` OR `ordered_for.eq.${userId}`
    - Maintain existing filters: `.is('deleted_at', null)` and `.order('created_at', { ascending: false })`
    - Test query returns correct results for both conditions
    - _Bug_Condition: isBugCondition(input) where input.viewType = 'orders'_
    - _Expected_Behavior: User B sees orders where ordered_for = User B's ID_
    - _Preservation: User A continues to see orders where user_id = User A's ID_
    - _Requirements: 2.1, 2.3, 3.1, 3.3, 3.7_

  - [x] 3.3 Implement the fix for payment calculation logic
    - Apply same OR filter fix to payment queries (lines 1190-1210 in backend/server.js)
    - Ensure payment calculation includes orders where `user_id = userId` OR `ordered_for = userId`
    - Maintain existing filters: `.is('deleted_at', null)` and `.eq('paid', false)`
    - Test payment totals include orders from both conditions
    - _Bug_Condition: isBugCondition(input) where input.viewType = 'payments'_
    - _Expected_Behavior: User B's payment total includes orders where ordered_for = User B's ID_
    - _Preservation: User A's payment total continues to include orders where user_id = User A's ID_
    - _Requirements: 2.2, 2.4, 3.2, 3.7_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Orders Placed For User Are Visible
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify User B sees orders where ordered_for = User B's ID
    - Verify User B's payment calculation includes orders where ordered_for = User B's ID
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Orders Placed By User Remain Visible
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm User A still sees orders they placed
    - Confirm admin still sees all orders
    - Confirm soft-deleted orders still excluded
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all bug condition tests - should PASS
  - Run all preservation tests - should PASS
  - Verify User B can see orders placed for them by User A
  - Verify User A can still see orders they placed
  - Verify admin can still see all orders
  - Verify payment calculations are correct for both User A and User B
  - If any issues arise, investigate and ask user for guidance
