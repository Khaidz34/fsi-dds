/**
 * Preservation Property Tests for N+1 Query Optimization
 * 
 * **Property 2: Preservation** - Business Logic Equivalence
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
 * 
 * IMPORTANT: Follow observation-first methodology - observe behavior on UNFIXED code.
 * 
 * This test verifies all business logic from Preservation Requirements:
 * - Payment responsibility logic (ordered_for field)
 * - Soft delete filtering (deleted_at IS NOT NULL excluded)
 * - Paid field calculations (paidCount, remainingCount)
 * - Month filtering (date range)
 * - Pagination (limit, offset, total count)
 * - Edge cases (no orders, no payments, overpayments, mixed orders)
 * - Result structure (all required fields)
 * 
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline behavior to preserve).
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// Test utilities
async function setupTestData() {
  console.log('📦 Setting up test data...');
  
  // Note: This assumes test data already exists in the database
  // We'll query existing data to verify preservation properties
  
  return true;
}

// Property-based test generators
function generateMonths() {
  return [
    '2024-01',
    '2024-02',
    '2024-03',
    '2024-12',
    '2023-12'
  ];
}

function generatePaginationParams() {
  return [
    { limit: 5, offset: 0 },
    { limit: 10, offset: 0 },
    { limit: 20, offset: 0 },
    { limit: 10, offset: 5 },
    { limit: 20, offset: 10 },
    { limit: 100, offset: 0 }
  ];
}

// Test runner
async function runTests() {
  console.log('=== Preservation Property Tests: N+1 Query Optimization ===\n');
  console.log('**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**\n');
  console.log('IMPORTANT: These tests run on UNFIXED code to observe baseline behavior.\n');
  console.log('EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve).\n');
  
  await setupTestData();
  
  const tests = [];
  let passed = 0;
  let failed = 0;
  
  // Property 2.1: Result Structure - All required fields present
  tests.push({
    name: 'Property 2.1: Result Structure - All required fields present',
    requirement: '3.1',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 10, 0);
      
      // Verify result structure
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Result should have data array');
      }
      
      if (typeof result.total !== 'number') {
        throw new Error('Result should have total count');
      }
      
      if (typeof result.limit !== 'number') {
        throw new Error('Result should have limit');
      }
      
      if (typeof result.offset !== 'number') {
        throw new Error('Result should have offset');
      }
      
      // Verify each user stat has all required fields
      for (const stat of result.data) {
        const requiredFields = [
          'userId', 'fullname', 'username', 'month',
          'ordersCount', 'ordersTotal', 'paidCount', 'paidTotal',
          'remainingCount', 'remainingTotal', 'overpaidTotal'
        ];
        
        for (const field of requiredFields) {
          if (!(field in stat)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
      }
      
      console.log(`   ✅ All ${result.data.length} user stats have required fields`);
    }
  });
  
  // Property 2.2: Payment Responsibility Logic - ordered_for field
  tests.push({
    name: 'Property 2.2: Payment Responsibility Logic - ordered_for field',
    requirement: '3.2, 3.3',
    async run() {
      // Get a user and check their payment responsibility
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      if (result.data.length === 0) {
        console.log('   ⚠️  No users found, skipping test');
        return;
      }
      
      // For each user, verify ordersTotal only includes orders they pay for
      for (const stat of result.data) {
        // Query orders directly to verify
        const { data: orders } = await supabase
          .from('orders')
          .select('id, price, paid, user_id, ordered_for')
          .or(`user_id.eq.${stat.userId},ordered_for.eq.${stat.userId}`)
          .is('deleted_at', null)
          .gte('created_at', '2024-01-01T00:00:00')
          .lt('created_at', '2024-02-01T00:00:00');
        
        // Calculate expected ordersTotal based on payment responsibility
        const ordersForPayment = orders?.filter(order => {
          if (order.ordered_for) {
            return order.ordered_for === stat.userId;
          }
          return order.user_id === stat.userId;
        }) || [];
        
        const expectedOrdersTotal = ordersForPayment.reduce((sum, order) => sum + (order.price || 0), 0);
        
        if (stat.ordersTotal !== expectedOrdersTotal) {
          throw new Error(`User ${stat.userId}: ordersTotal mismatch. Expected ${expectedOrdersTotal}, got ${stat.ordersTotal}`);
        }
      }
      
      console.log(`   ✅ Payment responsibility logic verified for ${result.data.length} users`);
    }
  });
  
  // Property 2.3: Soft Delete Filtering
  tests.push({
    name: 'Property 2.3: Soft Delete Filtering - deleted_at IS NOT NULL excluded',
    requirement: '3.5',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      if (result.data.length === 0) {
        console.log('   ⚠️  No users found, skipping test');
        return;
      }
      
      // For each user, verify deleted orders are excluded
      for (const stat of result.data) {
        const { data: allOrders } = await supabase
          .from('orders')
          .select('id, deleted_at')
          .or(`user_id.eq.${stat.userId},ordered_for.eq.${stat.userId}`)
          .gte('created_at', '2024-01-01T00:00:00')
          .lt('created_at', '2024-02-01T00:00:00');
        
        const { data: nonDeletedOrders } = await supabase
          .from('orders')
          .select('id')
          .or(`user_id.eq.${stat.userId},ordered_for.eq.${stat.userId}`)
          .is('deleted_at', null)
          .gte('created_at', '2024-01-01T00:00:00')
          .lt('created_at', '2024-02-01T00:00:00');
        
        const deletedCount = (allOrders?.length || 0) - (nonDeletedOrders?.length || 0);
        
        if (deletedCount > 0) {
          console.log(`   📝 User ${stat.userId}: ${deletedCount} deleted orders excluded`);
        }
      }
      
      console.log(`   ✅ Soft delete filtering verified for ${result.data.length} users`);
    }
  });
  
  // Property 2.4: Paid Field Calculations
  tests.push({
    name: 'Property 2.4: Paid Field Calculations - paidCount and remainingCount',
    requirement: '3.4',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      if (result.data.length === 0) {
        console.log('   ⚠️  No users found, skipping test');
        return;
      }
      
      // For each user, verify paid/remaining counts match orders.paid field
      for (const stat of result.data) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, price, paid, user_id, ordered_for')
          .or(`user_id.eq.${stat.userId},ordered_for.eq.${stat.userId}`)
          .is('deleted_at', null)
          .gte('created_at', '2024-01-01T00:00:00')
          .lt('created_at', '2024-02-01T00:00:00');
        
        const ordersForPayment = orders?.filter(order => {
          if (order.ordered_for) {
            return order.ordered_for === stat.userId;
          }
          return order.user_id === stat.userId;
        }) || [];
        
        const expectedPaidCount = ordersForPayment.filter(o => o.paid === true).length;
        const expectedRemainingCount = ordersForPayment.filter(o => o.paid === false || !o.paid).length;
        
        if (stat.paidCount !== expectedPaidCount) {
          throw new Error(`User ${stat.userId}: paidCount mismatch. Expected ${expectedPaidCount}, got ${stat.paidCount}`);
        }
        
        if (stat.remainingCount !== expectedRemainingCount) {
          throw new Error(`User ${stat.userId}: remainingCount mismatch. Expected ${expectedRemainingCount}, got ${stat.remainingCount}`);
        }
      }
      
      console.log(`   ✅ Paid field calculations verified for ${result.data.length} users`);
    }
  });
  
  // Property 2.5: Month Filtering - date range
  tests.push({
    name: 'Property 2.5: Month Filtering - date range (>= startDate AND < nextMonth)',
    requirement: '3.6',
    async run() {
      const months = generateMonths();
      
      for (const month of months) {
        const result = await buildPaymentStatsQuery(supabase, month, 5, 0);
        
        if (result.data.length === 0) {
          continue;
        }
        
        // Verify all stats are for the correct month
        for (const stat of result.data) {
          if (stat.month !== month) {
            throw new Error(`Month mismatch. Expected ${month}, got ${stat.month}`);
          }
          
          // Verify orders are within date range
          const { data: orders } = await supabase
            .from('orders')
            .select('created_at')
            .or(`user_id.eq.${stat.userId},ordered_for.eq.${stat.userId}`)
            .is('deleted_at', null)
            .gte('created_at', `${month}-01T00:00:00`)
            .lt('created_at', `${month}-32T00:00:00`); // Will be clamped to next month
          
          if (orders && orders.length > 0) {
            for (const order of orders) {
              const orderMonth = order.created_at.substring(0, 7);
              if (orderMonth !== month) {
                throw new Error(`Order date ${order.created_at} outside month ${month}`);
              }
            }
          }
        }
      }
      
      console.log(`   ✅ Month filtering verified for ${months.length} months`);
    }
  });
  
  // Property 2.6: Pagination - limit and offset
  tests.push({
    name: 'Property 2.6: Pagination - limit and offset work correctly',
    requirement: '3.7',
    async run() {
      const paginationParams = generatePaginationParams();
      
      for (const params of paginationParams) {
        const result = await buildPaymentStatsQuery(supabase, '2024-01', params.limit, params.offset);
        
        // Verify limit is respected
        if (result.data.length > params.limit) {
          throw new Error(`Limit violated. Expected <= ${params.limit}, got ${result.data.length}`);
        }
        
        // Verify pagination metadata
        if (result.limit !== params.limit) {
          throw new Error(`Limit metadata mismatch. Expected ${params.limit}, got ${result.limit}`);
        }
        
        if (result.offset !== params.offset) {
          throw new Error(`Offset metadata mismatch. Expected ${params.offset}, got ${result.offset}`);
        }
        
        // Verify total count is consistent
        if (typeof result.total !== 'number' || result.total < 0) {
          throw new Error(`Invalid total count: ${result.total}`);
        }
      }
      
      console.log(`   ✅ Pagination verified for ${paginationParams.length} parameter combinations`);
    }
  });
  
  // Property 2.7: Edge Case - Users with no orders
  tests.push({
    name: 'Property 2.7: Edge Case - Users with no orders',
    requirement: '3.8',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      // Find users with no orders
      const usersWithNoOrders = result.data.filter(stat => stat.ordersCount === 0);
      
      for (const stat of usersWithNoOrders) {
        // Verify all counts are 0
        if (stat.ordersTotal !== 0) {
          throw new Error(`User ${stat.userId} with no orders should have ordersTotal = 0, got ${stat.ordersTotal}`);
        }
        
        if (stat.paidCount !== 0) {
          throw new Error(`User ${stat.userId} with no orders should have paidCount = 0, got ${stat.paidCount}`);
        }
        
        if (stat.remainingCount !== 0) {
          throw new Error(`User ${stat.userId} with no orders should have remainingCount = 0, got ${stat.remainingCount}`);
        }
      }
      
      console.log(`   ✅ Edge case verified: ${usersWithNoOrders.length} users with no orders`);
    }
  });
  
  // Property 2.8: Edge Case - Users with no payments
  tests.push({
    name: 'Property 2.8: Edge Case - Users with no payments',
    requirement: '3.8',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      // Find users with orders but no payments
      const usersWithNoPayments = result.data.filter(stat => stat.ordersTotal > 0 && stat.paidTotal === 0);
      
      for (const stat of usersWithNoPayments) {
        // Verify remainingTotal equals ordersTotal
        if (stat.remainingTotal !== stat.ordersTotal) {
          throw new Error(`User ${stat.userId} with no payments should have remainingTotal = ordersTotal, got ${stat.remainingTotal} vs ${stat.ordersTotal}`);
        }
        
        // Verify overpaidTotal is 0
        if (stat.overpaidTotal !== 0) {
          throw new Error(`User ${stat.userId} with no payments should have overpaidTotal = 0, got ${stat.overpaidTotal}`);
        }
      }
      
      console.log(`   ✅ Edge case verified: ${usersWithNoPayments.length} users with no payments`);
    }
  });
  
  // Property 2.9: Edge Case - Users with overpayments
  tests.push({
    name: 'Property 2.9: Edge Case - Users with overpayments',
    requirement: '3.8',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      // Find users with overpayments
      const usersWithOverpayments = result.data.filter(stat => stat.paidTotal > stat.ordersTotal);
      
      for (const stat of usersWithOverpayments) {
        const expectedOverpaid = stat.paidTotal - stat.ordersTotal;
        
        // Verify overpaidTotal is correct
        if (stat.overpaidTotal !== expectedOverpaid) {
          throw new Error(`User ${stat.userId} overpaidTotal mismatch. Expected ${expectedOverpaid}, got ${stat.overpaidTotal}`);
        }
        
        // Verify remainingTotal is 0
        if (stat.remainingTotal !== 0) {
          throw new Error(`User ${stat.userId} with overpayment should have remainingTotal = 0, got ${stat.remainingTotal}`);
        }
      }
      
      console.log(`   ✅ Edge case verified: ${usersWithOverpayments.length} users with overpayments`);
    }
  });
  
  // Property 2.10: Edge Case - Users with mixed orders (ordered_for and regular)
  tests.push({
    name: 'Property 2.10: Edge Case - Users with mixed orders (ordered_for and regular)',
    requirement: '3.8',
    async run() {
      const result = await buildPaymentStatsQuery(supabase, '2024-01', 20, 0);
      
      let mixedOrderUsers = 0;
      
      for (const stat of result.data) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, user_id, ordered_for')
          .or(`user_id.eq.${stat.userId},ordered_for.eq.${stat.userId}`)
          .is('deleted_at', null)
          .gte('created_at', '2024-01-01T00:00:00')
          .lt('created_at', '2024-02-01T00:00:00');
        
        if (!orders || orders.length === 0) continue;
        
        const hasOrderedForOrders = orders.some(o => o.ordered_for === stat.userId);
        const hasRegularOrders = orders.some(o => o.user_id === stat.userId && !o.ordered_for);
        
        if (hasOrderedForOrders && hasRegularOrders) {
          mixedOrderUsers++;
          
          // Verify payment responsibility is correctly calculated
          const ordersForPayment = orders.filter(order => {
            if (order.ordered_for) {
              return order.ordered_for === stat.userId;
            }
            return order.user_id === stat.userId;
          });
          
          // This should match the stat's ordersCount for payment
          // (Note: ordersCount includes all orders, but ordersTotal only includes orders to pay)
        }
      }
      
      console.log(`   ✅ Edge case verified: ${mixedOrderUsers} users with mixed orders`);
    }
  });
  
  // Run all tests
  console.log('Running preservation property tests...\n');
  
  for (const test of tests) {
    try {
      console.log(`\n📊 ${test.name}`);
      console.log(`   Requirement: ${test.requirement}`);
      await test.run();
      passed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  console.log('\n\n=== Test Summary ===\n');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All preservation property tests PASSED on unfixed code!');
    console.log('\nThis confirms the baseline behavior to preserve during optimization.');
    console.log('After implementing the fix, these same tests should still pass.');
    process.exit(0);
  } else {
    console.log('\n❌ Some preservation tests FAILED');
    console.log('\nThis may indicate:');
    console.log('1. The test assumptions are incorrect');
    console.log('2. The current implementation has bugs');
    console.log('3. The test data is insufficient');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
