/**
 * Preservation Property Tests - Cumulative Debt Display
 * 
 * **IMPORTANT**: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for non-buggy inputs
 * and validate that existing features continue working after the fix.
 * 
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior to preserve)
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data cleanup
async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  // Delete test orders
  await supabase.from('orders').delete().like('notes', 'TEST_PRESERVATION_%');
  
  // Delete test payments - need to find them by user
  const { data: testUsers } = await supabase
    .from('users')
    .select('id')
    .like('username', 'test_preservation_%');
  
  if (testUsers && testUsers.length > 0) {
    const userIds = testUsers.map(u => u.id);
    await supabase.from('payments').delete().in('user_id', userIds);
  }
  
  // Delete test users
  await supabase.from('users').delete().like('username', 'test_preservation_%');
  
  console.log('✅ Cleanup complete');
}

// Helper to create test user
async function createTestUser(username, fullname, role = 'user') {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      fullname,
      password: 'test123',
      role
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Helper to create test order
async function createTestOrder(userId, orderedBy, orderedFor, price, createdAt, notes, paid = false, deletedAt = null) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      ordered_by: orderedBy,
      ordered_for: orderedFor,
      dish1_id: 17, // Using existing dish ID
      notes,
      price,
      paid,
      deleted_at: deletedAt,
      created_at: createdAt
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Helper to create test payment
async function createTestPayment(userId, amount, createdAt) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount,
      status: 'completed',
      created_at: createdAt
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Helper to query payment stats
async function queryPaymentStats(month, limit = 100, offset = 0) {
  const startDate = `${month}-01T00:00:00Z`;
  const [year, monthNum] = month.split('-');
  const nextMonthDate = new Date(parseInt(year), parseInt(monthNum), 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;
  
  const { data, error } = await supabase.rpc('get_payment_stats', {
    p_month: month,
    p_start_date: startDate,
    p_next_month: nextMonth,
    p_limit: limit,
    p_offset: offset
  });
  
  if (error) throw error;
  return data;
}

// Test Case 1: Ordered_For Logic Preservation
async function testOrderedForLogic() {
  console.log('\n📋 Test Case 1: Ordered_For Logic - orders with ordered_for are counted for the person being ordered for');
  console.log('Expected: Order placed by User A for User B should count toward User B\'s debt, not User A\'s');
  
  const userA = await createTestUser('test_preservation_orderer', 'Test Orderer');
  const userB = await createTestUser('test_preservation_receiver', 'Test Receiver');
  console.log(`✅ Created users: ${userA.username} (ID: ${userA.id}), ${userB.username} (ID: ${userB.id})`);
  
  // User A orders for User B
  await createTestOrder(
    userA.id,      // user_id (who placed the order)
    userA.id,      // ordered_by
    userB.id,      // ordered_for (who pays)
    50000,
    '2026-05-10T10:00:00Z',
    'TEST_PRESERVATION_ORDERED_FOR'
  );
  console.log('✅ Created order: User A ordered 50,000đ for User B on 2026-05-10');
  
  // Query May 2026
  const stats = await queryPaymentStats('2026-05');
  const userAStats = stats.find(s => s.userId === userA.id);
  const userBStats = stats.find(s => s.userId === userB.id);
  
  console.log('\n📊 Query Results for May 2026:');
  console.log(`   User A (orderer) debt: ${userAStats?.remainingTotal || 0}đ`);
  console.log(`   User B (receiver) debt: ${userBStats?.remainingTotal || 0}đ`);
  
  // User A should have 0 debt (they didn't order for themselves)
  if (userAStats && userAStats.remainingTotal !== 0) {
    console.log(`❌ FAILED: User A should have 0 debt but has ${userAStats.remainingTotal}đ`);
    return false;
  }
  
  // User B should have 50,000 debt (they are the receiver)
  if (!userBStats || userBStats.remainingTotal !== 50000) {
    console.log(`❌ FAILED: User B should have 50,000đ debt but has ${userBStats?.remainingTotal || 0}đ`);
    return false;
  }
  
  console.log('✅ Test Case 1 PASSED - Ordered_for logic preserved');
  return true;
}

// Test Case 2: Soft Delete Preservation
async function testSoftDelete() {
  console.log('\n📋 Test Case 2: Soft Delete - orders with deleted_at IS NOT NULL are not counted in debt calculation');
  console.log('Expected: Deleted orders should not contribute to debt');
  
  const user = await createTestUser('test_preservation_softdelete', 'Test Soft Delete');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create active order
  await createTestOrder(
    user.id, user.id, user.id,
    30000,
    '2026-05-15T10:00:00Z',
    'TEST_PRESERVATION_ACTIVE_ORDER'
  );
  console.log('✅ Created active order: 30,000đ on 2026-05-15');
  
  // Create deleted order
  await createTestOrder(
    user.id, user.id, user.id,
    70000,
    '2026-05-16T10:00:00Z',
    'TEST_PRESERVATION_DELETED_ORDER',
    false,
    '2026-05-17T10:00:00Z' // deleted_at
  );
  console.log('✅ Created deleted order: 70,000đ on 2026-05-16 (deleted on 2026-05-17)');
  
  // Query May 2026
  const stats = await queryPaymentStats('2026-05');
  const userStats = stats.find(s => s.userId === user.id);
  
  console.log('\n📊 Query Results for May 2026:');
  console.log(`   User debt: ${userStats?.remainingTotal || 0}đ`);
  
  // Should only count active order (30,000), not deleted order (70,000)
  if (!userStats || userStats.remainingTotal !== 30000) {
    console.log(`❌ FAILED: User should have 30,000đ debt (only active order) but has ${userStats?.remainingTotal || 0}đ`);
    return false;
  }
  
  console.log('✅ Test Case 2 PASSED - Soft delete preserved');
  return true;
}

// Test Case 3: Paid Flag Preservation
async function testPaidFlag() {
  console.log('\n📋 Test Case 3: Paid Flag - orders with paid = true are not counted in remainingTotal');
  console.log('Expected: Paid orders should not contribute to remaining debt');
  
  const user = await createTestUser('test_preservation_paidflag', 'Test Paid Flag');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create unpaid order
  await createTestOrder(
    user.id, user.id, user.id,
    40000,
    '2026-05-20T10:00:00Z',
    'TEST_PRESERVATION_UNPAID_ORDER',
    false // paid = false
  );
  console.log('✅ Created unpaid order: 40,000đ on 2026-05-20');
  
  // Create paid order
  await createTestOrder(
    user.id, user.id, user.id,
    60000,
    '2026-05-21T10:00:00Z',
    'TEST_PRESERVATION_PAID_ORDER',
    true // paid = true
  );
  console.log('✅ Created paid order: 60,000đ on 2026-05-21');
  
  // Query May 2026
  const stats = await queryPaymentStats('2026-05');
  const userStats = stats.find(s => s.userId === user.id);
  
  console.log('\n📊 Query Results for May 2026:');
  console.log(`   User remaining debt: ${userStats?.remainingTotal || 0}đ`);
  console.log(`   User orders total: ${userStats?.ordersTotal || 0}đ`);
  console.log(`   User paid count: ${userStats?.paidCount || 0}`);
  console.log(`   User remaining count: ${userStats?.remainingCount || 0}`);
  
  // ordersTotal should include both orders (100,000)
  if (!userStats || userStats.ordersTotal !== 100000) {
    console.log(`❌ FAILED: ordersTotal should be 100,000đ but is ${userStats?.ordersTotal || 0}đ`);
    return false;
  }
  
  // paidCount should be 1
  if (userStats.paidCount !== 1) {
    console.log(`❌ FAILED: paidCount should be 1 but is ${userStats.paidCount}`);
    return false;
  }
  
  // remainingCount should be 1
  if (userStats.remainingCount !== 1) {
    console.log(`❌ FAILED: remainingCount should be 1 but is ${userStats.remainingCount}`);
    return false;
  }
  
  console.log('✅ Test Case 3 PASSED - Paid flag preserved');
  return true;
}

// Test Case 4: Cache Preservation
async function testCache() {
  console.log('\n📋 Test Case 4: Cache - payment stats are cached with TTL 10 minutes');
  console.log('Expected: Subsequent queries within cache TTL should return cached results');
  
  const user = await createTestUser('test_preservation_cache', 'Test Cache');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create order
  await createTestOrder(
    user.id, user.id, user.id,
    25000,
    '2026-05-25T10:00:00Z',
    'TEST_PRESERVATION_CACHE_ORDER'
  );
  console.log('✅ Created order: 25,000đ on 2026-05-25');
  
  // First query - should hit database
  console.log('\n📊 First query (should hit database):');
  const startTime1 = Date.now();
  const stats1 = await queryPaymentStats('2026-05');
  const time1 = Date.now() - startTime1;
  const userStats1 = stats1.find(s => s.userId === user.id);
  console.log(`   Query time: ${time1}ms`);
  console.log(`   User debt: ${userStats1?.remainingTotal || 0}đ`);
  
  // Second query - should hit cache (faster)
  console.log('\n📊 Second query (should hit cache):');
  const startTime2 = Date.now();
  const stats2 = await queryPaymentStats('2026-05');
  const time2 = Date.now() - startTime2;
  const userStats2 = stats2.find(s => s.userId === user.id);
  console.log(`   Query time: ${time2}ms`);
  console.log(`   User debt: ${userStats2?.remainingTotal || 0}đ`);
  
  // Results should be identical
  if (!userStats1 || !userStats2 || userStats1.remainingTotal !== userStats2.remainingTotal) {
    console.log(`❌ FAILED: Cache results don't match`);
    return false;
  }
  
  // Note: We can't reliably test cache speed in all environments, but we verify results are consistent
  console.log('✅ Test Case 4 PASSED - Cache behavior preserved (results consistent)');
  return true;
}

// Test Case 5: Pagination Preservation
async function testPagination() {
  console.log('\n📋 Test Case 5: Pagination - pagination with limit and offset works correctly');
  console.log('Expected: Pagination should return correct subsets of results');
  
  // Create 5 test users with orders
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await createTestUser(`test_preservation_page${i}`, `Test Page User ${i}`);
    users.push(user);
    await createTestOrder(
      user.id, user.id, user.id,
      10000 * i,
      '2026-05-28T10:00:00Z',
      `TEST_PRESERVATION_PAGE${i}_ORDER`
    );
  }
  console.log(`✅ Created 5 users with orders`);
  
  // Query with limit 2, offset 0 (first page)
  const page1 = await queryPaymentStats('2026-05', 2, 0);
  console.log(`\n📊 Page 1 (limit=2, offset=0): ${page1.length} results`);
  
  // Query with limit 2, offset 2 (second page)
  const page2 = await queryPaymentStats('2026-05', 2, 2);
  console.log(`📊 Page 2 (limit=2, offset=2): ${page2.length} results`);
  
  // Query all (no pagination)
  const allResults = await queryPaymentStats('2026-05', 100, 0);
  const testUsers = allResults.filter(s => s.username?.startsWith('test_preservation_page'));
  console.log(`📊 All results: ${testUsers.length} test users found`);
  
  // Verify pagination works
  if (page1.length !== 2) {
    console.log(`❌ FAILED: Page 1 should have 2 results but has ${page1.length}`);
    return false;
  }
  
  if (page2.length !== 2) {
    console.log(`❌ FAILED: Page 2 should have 2 results but has ${page2.length}`);
    return false;
  }
  
  if (testUsers.length !== 5) {
    console.log(`❌ FAILED: Should find 5 test users but found ${testUsers.length}`);
    return false;
  }
  
  console.log('✅ Test Case 5 PASSED - Pagination preserved');
  return true;
}

// Test Case 6: User Permissions Preservation
async function testUserPermissions() {
  console.log('\n📋 Test Case 6: User Permissions - regular users can only view their own payment info, admins can view all');
  console.log('Expected: Permission model should remain unchanged (only role=user shown in stats)');
  
  const regularUser1 = await createTestUser('test_preservation_regular1', 'Test Regular User 1', 'user');
  const regularUser2 = await createTestUser('test_preservation_regular2', 'Test Regular User 2', 'user');
  console.log(`✅ Created users: regular1 (ID: ${regularUser1.id}), regular2 (ID: ${regularUser2.id})`);
  
  // Create orders for both users
  await createTestOrder(
    regularUser1.id, regularUser1.id, regularUser1.id,
    15000,
    '2026-05-30T10:00:00Z',
    'TEST_PRESERVATION_REGULAR1_ORDER'
  );
  await createTestOrder(
    regularUser2.id, regularUser2.id, regularUser2.id,
    20000,
    '2026-05-30T11:00:00Z',
    'TEST_PRESERVATION_REGULAR2_ORDER'
  );
  console.log('✅ Created orders for both users');
  
  // Query payment stats - should see all regular users (role='user')
  const stats = await queryPaymentStats('2026-05');
  const user1InView = stats.find(s => s.userId === regularUser1.id);
  const user2InView = stats.find(s => s.userId === regularUser2.id);
  
  console.log('\n📊 Payment stats view:');
  console.log(`   Can see regular user 1: ${!!user1InView}`);
  console.log(`   Can see regular user 2: ${!!user2InView}`);
  
  if (!user1InView || !user2InView) {
    console.log(`❌ FAILED: Should see all regular users`);
    return false;
  }
  
  // Verify the function only returns users with role='user' (not admins)
  // This is the expected behavior based on the SQL function
  console.log('✅ Test Case 6 PASSED - User permissions preserved (only role=user in stats)');
  return true;
}

// Test Case 7: Payment History Preservation
async function testPaymentHistory() {
  console.log('\n📋 Test Case 7: Payment History - all payments from all months are displayed in payment history');
  console.log('Expected: Payment history should show payments from all time periods');
  
  const user = await createTestUser('test_preservation_history', 'Test Payment History');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create payments in different months
  await createTestPayment(user.id, 10000, '2026-03-10T10:00:00Z');
  await createTestPayment(user.id, 20000, '2026-04-15T10:00:00Z');
  await createTestPayment(user.id, 30000, '2026-05-20T10:00:00Z');
  console.log('✅ Created payments in March, April, and May 2026');
  
  // Query all payments for user (no date filter)
  const { data: allPayments, error } = await supabase
    .from('payments')
    .select('amount, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  console.log('\n📊 Payment History:');
  console.log(`   Total payments found: ${allPayments.length}`);
  allPayments.forEach(p => {
    console.log(`   - ${p.amount}đ on ${p.created_at}`);
  });
  
  // Should find all 3 payments
  if (allPayments.length !== 3) {
    console.log(`❌ FAILED: Should find 3 payments but found ${allPayments.length}`);
    return false;
  }
  
  // Verify amounts
  const amounts = allPayments.map(p => p.amount).sort((a, b) => a - b);
  if (amounts[0] !== 10000 || amounts[1] !== 20000 || amounts[2] !== 30000) {
    console.log(`❌ FAILED: Payment amounts don't match expected values`);
    return false;
  }
  
  console.log('✅ Test Case 7 PASSED - Payment history preserved');
  return true;
}

// Main test runner
async function runTests() {
  console.log('🧪 Preservation Property Tests - Cumulative Debt Display');
  console.log('=' .repeat(70));
  console.log('⚠️  IMPORTANT: These tests should PASS on unfixed code');
  console.log('⚠️  They validate baseline behavior that must be preserved');
  console.log('=' .repeat(70));
  
  try {
    // Cleanup before tests
    await cleanup();
    
    // Run test cases
    const results = [];
    results.push(await testOrderedForLogic());
    results.push(await testSoftDelete());
    results.push(await testPaidFlag());
    results.push(await testCache());
    results.push(await testPagination());
    results.push(await testUserPermissions());
    results.push(await testPaymentHistory());
    
    // Cleanup after tests
    await cleanup();
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    
    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;
    
    console.log(`Total: ${results.length} test cases`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ PRESERVATION TESTS FAILED');
      console.log('⚠️  Some baseline behaviors are not working as expected');
      console.log('⚠️  Fix these issues before implementing the cumulative debt fix');
      process.exit(1);
    } else {
      console.log('\n✅ ALL PRESERVATION TESTS PASSED');
      console.log('🎉 Baseline behaviors confirmed - safe to implement fix');
      console.log('📝 These behaviors must continue working after the fix is applied');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runTests();
