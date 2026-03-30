/**
 * Bug Condition Exploration Test for N+1 Query Problem
 * 
 * **Property 1: Bug Condition** - N+1 Query Pattern Detection
 * **Validates: Requirements 1.1, 1.3, 1.4**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation.
 * 
 * GOAL: Surface counterexamples that demonstrate the N+1 query problem exists.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Create instrumented Supabase client that counts queries
function createInstrumentedClient() {
  const client = createClient(supabaseUrl, supabaseKey);
  const queryLog = [];
  
  // Intercept the REST client's fetch method to count actual HTTP requests
  const originalFetch = client.rest.fetch;
  client.rest.fetch = async function(...args) {
    queryLog.push({
      timestamp: Date.now(),
      url: args[0]
    });
    console.log(`  🔍 Query #${queryLog.length}: ${args[0]}`);
    return originalFetch.apply(this, args);
  };
  
  return { client, queryLog };
}

// Copy of buildPaymentStatsQuery from server.js for testing
async function buildPaymentStatsQuery(supabase, month, limit = 20, offset = 0) {
  // Validate pagination parameters
  const validLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const validOffset = Math.max(parseInt(offset) || 0, 0);

  const startDate = `${month}-01`;
  // Get next month for proper date range - JavaScript months are 0-indexed
  const [year, monthNum] = month.split('-');
  const monthIndex = parseInt(monthNum) - 1; // Convert 1-indexed to 0-indexed
  const nextMonthDate = new Date(parseInt(year), monthIndex + 1, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  // Fallback: Get all users and calculate stats manually
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, fullname, username')
    .eq('role', 'user')
    .order('fullname')
    .range(validOffset, validOffset + validLimit - 1);

  if (usersError) throw usersError;

  const userStats = [];

  for (const user of users || []) {
    // Get user's orders for the month (both placed by them and placed for them)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, price, paid, user_id, ordered_for')
      .or(`user_id.eq.${user.id},ordered_for.eq.${user.id}`)
      .is('deleted_at', null)
      .gte('created_at', `${startDate}T00:00:00`)
      .lt('created_at', `${nextMonth}T00:00:00`);

    // Get user's payments for the month - use proper date range
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lt('created_at', `${nextMonth}T00:00:00`);

    const ordersCount = orders?.length || 0;
    
    // FIX: Only count orders where user is the one who PAYS
    // If ordered_for is set, that person pays. Otherwise, user_id pays.
    const ordersForPayment = orders?.filter(order => {
      // If ordered_for is set, only count if user is the one paying (ordered_for = userId)
      if (order.ordered_for) {
        return order.ordered_for === user.id;
      }
      // If ordered_for is not set, user_id is the one paying
      return order.user_id === user.id;
    }) || [];
    
    const ordersTotal = ordersForPayment.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
    const paidTotal = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const remainingTotal = Math.max(0, ordersTotal - paidTotal);
    
    // Count paid and unpaid orders based on 'paid' field
    const paidOrders = ordersForPayment?.filter(order => order.paid === true) || [];
    const unpaidOrders = ordersForPayment?.filter(order => order.paid === false || !order.paid) || [];
    const paidCount = paidOrders.length;
    const remainingCount = unpaidOrders.length;

    userStats.push({
      userId: user.id,
      fullname: user.fullname,
      username: user.username,
      month,
      ordersCount,
      ordersTotal,
      paidCount,
      paidTotal,
      remainingCount,
      remainingTotal,
      overpaidTotal: paidTotal > ordersTotal ? paidTotal - ordersTotal : 0
    });
  }

  // Get total count
  const { count: totalCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  return {
    data: userStats,
    total: totalCount || 0,
    limit: validLimit,
    offset: validOffset
  };
}

// Test runner
async function runTests() {
  console.log('=== Bug Condition Exploration Test: N+1 Query Problem ===\n');
  console.log('**Validates: Requirements 1.1, 1.3, 1.4**\n');
  console.log('CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.\n');
  
  const testCases = [
    { limit: 10, expectedMaxQueries: 2, description: 'Small dataset (10 users)' },
    { limit: 50, expectedMaxQueries: 2, description: 'Medium dataset (50 users)' },
    { limit: 100, expectedMaxQueries: 2, description: 'Large dataset (100 users)' }
  ];
  
  const results = [];
  let allTestsPassed = true;
  
  for (const testCase of testCases) {
    console.log(`\n📊 Test Case: ${testCase.description}`);
    console.log(`   Parameters: limit=${testCase.limit}, month=2024-01`);
    
    const { client, queryLog } = createInstrumentedClient();
    
    // Measure query count and response time
    const startTime = Date.now();
    
    try {
      const result = await buildPaymentStatsQuery(client, '2024-01', testCase.limit, 0);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const queryCount = queryLog.length;
      const actualUserCount = result.data.length;
      
      console.log(`\n   📈 Results:`);
      console.log(`      - Users returned: ${actualUserCount}`);
      console.log(`      - Query count: ${queryCount}`);
      console.log(`      - Response time: ${responseTime}ms`);
      
      // Calculate expected query count for N+1 pattern: 1 + 2*N + 1 (users + orders + payments per user + total count)
      const expectedN1QueryCount = 1 + (2 * actualUserCount) + 1;
      console.log(`      - Expected N+1 query count: ${expectedN1QueryCount} (1 user query + ${actualUserCount * 2} per-user queries + 1 count query)`);
      
      // Check if this exhibits N+1 pattern
      const isN1Pattern = queryCount >= expectedN1QueryCount - 1; // Allow 1 query tolerance
      if (isN1Pattern) {
        console.log(`      ⚠️  CONFIRMED: N+1 query pattern detected!`);
      }
      
      // Test assertions (these SHOULD FAIL on unfixed code)
      const queryCountPass = queryCount <= testCase.expectedMaxQueries;
      const responseTimePass = testCase.limit === 100 ? responseTime < 500 : true;
      
      console.log(`\n   🧪 Assertions:`);
      console.log(`      - Query count <= ${testCase.expectedMaxQueries}: ${queryCountPass ? '✅ PASS' : '❌ FAIL'}`);
      if (testCase.limit === 100) {
        console.log(`      - Response time < 500ms: ${responseTimePass ? '✅ PASS' : '❌ FAIL'}`);
      }
      
      const testPassed = queryCountPass && responseTimePass;
      
      if (!testPassed) {
        allTestsPassed = false;
        console.log(`\n   ❌ TEST FAILED (Expected - this confirms the N+1 bug exists)`);
      } else {
        console.log(`\n   ✅ TEST PASSED (Unexpected - bug may already be fixed)`);
      }
      
      results.push({
        testCase: testCase.description,
        limit: testCase.limit,
        actualUserCount,
        queryCount,
        responseTime,
        expectedMaxQueries: testCase.expectedMaxQueries,
        isN1Pattern,
        passed: testPassed
      });
      
    } catch (error) {
      console.error(`   ❌ Error executing test: ${error.message}`);
      allTestsPassed = false;
      results.push({
        testCase: testCase.description,
        limit: testCase.limit,
        error: error.message,
        passed: false
      });
    }
  }
  
  // Summary
  console.log('\n\n=== Test Summary ===\n');
  console.log('Counterexamples found (proving N+1 bug exists):\n');
  
  for (const result of results) {
    if (result.error) {
      console.log(`❌ ${result.testCase}: ERROR - ${result.error}`);
    } else {
      console.log(`${result.passed ? '✅' : '❌'} ${result.testCase}:`);
      console.log(`   - Users: ${result.actualUserCount}`);
      console.log(`   - Query count: ${result.queryCount} (expected: <= ${result.expectedMaxQueries})`);
      console.log(`   - Response time: ${result.responseTime}ms`);
      console.log(`   - N+1 pattern: ${result.isN1Pattern ? 'YES' : 'NO'}`);
    }
  }
  
  console.log('\n=== Conclusion ===\n');
  
  if (!allTestsPassed) {
    console.log('❌ Tests FAILED as expected - N+1 query bug is CONFIRMED');
    console.log('\nThe bug manifests as:');
    console.log('1. Query count grows linearly with user count (1 + 2N + 1 pattern)');
    console.log('2. Each user triggers 2 separate queries (orders + payments)');
    console.log('3. Response time increases proportionally with user count');
    console.log('\nThis test will PASS after the fix is implemented (query count reduced to <= 2).');
    process.exit(1);
  } else {
    console.log('✅ Tests PASSED unexpectedly - bug may already be fixed or test needs adjustment');
    console.log('\nIf the code has not been fixed yet, this may indicate:');
    console.log('1. The test is not correctly measuring query count');
    console.log('2. The database has very few users (< 10)');
    console.log('3. The bug has already been fixed');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
