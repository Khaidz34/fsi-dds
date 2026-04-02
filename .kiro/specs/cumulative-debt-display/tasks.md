# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Cumulative Debt Not Calculated Across Months
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test concrete scenarios with users having debt from previous months
  - Test Case 1: User with 80,000đ debt from March 2026, no new orders in April 2026 - query April 2026 should show user with 80,000đ debt
  - Test Case 2: User with 80,000đ debt from March 2026 and 40,000đ debt from April 2026 - query April 2026 should show cumulative debt of 120,000đ
  - Test Case 3: User with 100,000đ debt from February 2026, 50,000đ payment in March 2026, no new orders in April 2026 - query April 2026 should show remaining debt of 50,000đ
  - Test Case 4: User with 200,000đ debt from January 2026, 250,000đ payment in February 2026 (overpaid 50,000đ), no new orders in March 2026 - query March 2026 should show overpaidTotal of 50,000đ
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Features Must Continue Working
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Test Case 1: Ordered_For Logic - orders with ordered_for are counted for the person being ordered for (ordered_for), not the person placing the order (user_id)
  - Test Case 2: Soft Delete - orders with deleted_at IS NOT NULL are not counted in debt calculation
  - Test Case 3: Paid Flag - orders with paid = true are not counted in remainingTotal
  - Test Case 4: Cache - payment stats are cached with TTL 10 minutes
  - Test Case 5: Pagination - pagination with limit and offset works correctly
  - Test Case 6: User Permissions - regular users can only view their own payment info, admins can view all
  - Test Case 7: Payment History - all payments from all months are displayed in payment history
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Fix for cumulative debt display

  - [x] 3.1 Update get_payment_stats SQL function to calculate cumulative debt
    - Remove lower bound filter (p_start_date) from orders query - change `orders.created_at >= p_start_date AND orders.created_at < p_next_month` to `orders.created_at < p_next_month`
    - Remove lower bound filter (p_start_date) from payments query - change `payments.created_at >= p_start_date AND payments.created_at < p_next_month` to `payments.created_at < p_next_month`
    - This ensures ALL orders and payments from the beginning of time up to the selected month are included in the calculation
    - File: `DROP-AND-CREATE-PAYMENT-STATS.sql`
    - _Bug_Condition: isBugCondition(input) where input.role == 'admin' AND queryUsesMonthRangeFilter(input.month) AND NOT queryUsesAllTimeRangeUpToMonth(input.month)_
    - _Expected_Behavior: For any admin request to view payment stats for a selected month, the fixed get_payment_stats function SHALL calculate cumulative debt by querying ALL orders and payments from the earliest date in the database up to the end of the selected month_
    - _Preservation: Ordered_for logic, soft delete, paid flag, cache, pagination, user permissions, payment history must continue working as before_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.2 Update getUserPaymentStats function to calculate cumulative debt
    - Remove lower bound filter for orders query - change `.gte('created_at', \`${startDate}T00:00:00Z\`).lt('created_at', \`${nextMonth}T00:00:00Z\`)` to `.lt('created_at', \`${nextMonth}T00:00:00Z\`)`
    - Remove lower bound filter for payments query - change `.gte('created_at', \`${startDate}T00:00:00Z\`).lt('created_at', \`${nextMonth}T00:00:00Z\`)` to `.lt('created_at', \`${nextMonth}T00:00:00Z\`)`
    - This ensures ALL orders and payments from the beginning of time up to the selected month are included in the calculation
    - File: `backend/server.js` (getUserPaymentStats function around line 1350-1450)
    - _Bug_Condition: Same as 3.1_
    - _Expected_Behavior: Same as 3.1_
    - _Preservation: Same as 3.1_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.3 Deploy updated get_payment_stats function to Supabase
    - Run the updated SQL script to deploy the new function to production database
    - Verify function is deployed successfully by checking Supabase dashboard or running a test query
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Cumulative Debt Calculated Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Features Still Working
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
