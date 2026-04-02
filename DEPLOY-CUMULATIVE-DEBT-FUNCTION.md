# Deploy Cumulative Debt Fix - Manual Instructions

## Overview
Task 3.3 requires deploying the updated `get_payment_stats` function to Supabase. The automated deployment script failed because it requires a service role key and custom RPC function that aren't available.

## Manual Deployment Steps

### Step 1: Access Supabase Dashboard
1. Open your browser and navigate to: https://supabase.com/dashboard
2. Log in to your account
3. Select your project

### Step 2: Open SQL Editor
1. In the left sidebar, click on "SQL Editor"
2. Click "New query" to create a new SQL query

### Step 3: Copy and Execute SQL
1. Open the file: `DROP-AND-CREATE-PAYMENT-STATS.sql` (located in the project root)
2. Copy the entire contents of the file
3. Paste it into the SQL Editor in Supabase
4. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)

### Step 4: Verify Deployment
You should see a success message indicating:
- The old function was dropped
- The new function was created successfully

### Step 5: Test the Deployment
Run the following command from the backend directory to verify the fix works:

```bash
cd backend
node test-cumulative-debt-bug.js
```

**Expected Result**: The test should now PASS, confirming that cumulative debt is calculated correctly.

### Step 6: Verify No Regressions
Run the preservation tests to ensure existing functionality still works:

```bash
node test-cumulative-debt-preservation.js
```

**Expected Result**: All preservation tests should PASS.

## What Changed in the SQL Function

The fix removes the lower bound date filter to calculate cumulative debt:

**Before (Bug)**:
```sql
-- Only counted orders in the selected month
orders.created_at >= p_start_date AND orders.created_at < p_next_month
payments.created_at >= p_start_date AND payments.created_at < p_next_month
```

**After (Fixed)**:
```sql
-- Counts ALL orders from beginning of time up to selected month
orders.created_at < p_next_month
payments.created_at < p_next_month
```

This ensures users with debt from previous months are displayed even if they have no new orders in the selected month.

## Troubleshooting

### If deployment fails:
- Verify you have the correct permissions (you need to be a project owner or have database admin rights)
- Check for syntax errors in the SQL (though the file should be correct)
- Try running each statement separately (DROP first, then CREATE)

### If tests still fail after deployment:
- Verify the function was actually created by running this query in SQL Editor:
  ```sql
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_name = 'get_payment_stats';
  ```
- Check that the function signature matches what the backend expects
- Restart your backend server to clear any cached connections

## Next Steps

After successful deployment and testing:
- Proceed to task 3.4: Verify bug condition exploration test now passes
- Proceed to task 3.5: Verify preservation tests still pass
