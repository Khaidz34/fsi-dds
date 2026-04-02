/**
 * Bug Condition Exploration Test - Cumulative Debt Display
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bug exists
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
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
  await supabase.from('orders').delete().like('notes', 'TEST_CUMULATIVE_%');
  
  // Delete test payments - need to find them by user
  const { data: testUsers } = await supabase
    .from('users')
    .select('id')
    .like('username', 'test_cumulative_%');
  
  if (testUsers && testUsers.length > 0) {
    const userIds = testUsers.map(u => u.id);
    await supabase.from('payments').delete().in('user_id', userIds);
  }
  
  // Delete test users
  await supabase.from('users').delete().like('username', 'test_cumulative_%');
  
  console.log('✅ Cleanup complete');
}

// Helper to create test user
async function createTestUser(username, fullname) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      fullname,
      password: 'test123',
      role: 'user'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Helper to create test order
async function createTestOrder(userId, price, createdAt, notes) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      ordered_by: userId,
      ordered_for: userId,
      dish1_id: 17, // Using existing dish ID
      notes,
      price,
      paid: false,
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
async function queryPaymentStats(month) {
  const startDate = `${month}-01T00:00:00Z`;
  const [year, monthNum] = month.split('-');
  const nextMonthDate = new Date(parseInt(year), parseInt(monthNum), 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;
  
  const { data, error } = await supabase.rpc('get_payment_stats', {
    p_month: month,
    p_start_date: startDate,
    p_next_month: nextMonth,
    p_limit: 100,
    p_offset: 0
  });
  
  if (error) throw error;
  return data;
}

// Test Case 1: User with debt from previous month only
async function testCase1() {
  console.log('\n📋 Test Case 1: User with 80,000đ debt from March 2026, no new orders in April 2026');
  console.log('Expected: Query April 2026 should show user with 80,000đ debt');
  
  const user = await createTestUser('test_cumulative_case1', 'Test User Case 1');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create order in March 2026
  await createTestOrder(user.id, 80000, '2026-03-15T10:00:00Z', 'TEST_CUMULATIVE_CASE1_ORDER');
  console.log('✅ Created order: 80,000đ on 2026-03-15');
  
  // Query April 2026
  const stats = await queryPaymentStats('2026-04');
  const userStats = stats.find(s => s.userId === user.id);
  
  console.log('\n📊 Query Results for April 2026:');
  if (!userStats) {
    console.log('❌ COUNTEREXAMPLE FOUND: User not found in April 2026 stats');
    console.log('   Expected: User should appear with 80,000đ debt');
    console.log('   Actual: User does not appear in the list');
    return false;
  }
  
  console.log(`   User found: ${userStats.fullname}`);
  console.log(`   Remaining debt: ${userStats.remainingTotal}đ`);
  
  if (userStats.remainingTotal !== 80000) {
    console.log(`❌ COUNTEREXAMPLE FOUND: Incorrect debt amount`);
    console.log(`   Expected: 80,000đ`);
    console.log(`   Actual: ${userStats.remainingTotal}đ`);
    return false;
  }
  
  console.log('✅ Test Case 1 PASSED');
  return true;
}

// Test Case 2: User with debt from multiple months
async function testCase2() {
  console.log('\n📋 Test Case 2: User with 80,000đ debt from March 2026 and 40,000đ debt from April 2026');
  console.log('Expected: Query April 2026 should show cumulative debt of 120,000đ');
  
  const user = await createTestUser('test_cumulative_case2', 'Test User Case 2');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create order in March 2026
  await createTestOrder(user.id, 80000, '2026-03-15T10:00:00Z', 'TEST_CUMULATIVE_CASE2_ORDER1');
  console.log('✅ Created order: 80,000đ on 2026-03-15');
  
  // Create order in April 2026
  await createTestOrder(user.id, 40000, '2026-04-10T10:00:00Z', 'TEST_CUMULATIVE_CASE2_ORDER2');
  console.log('✅ Created order: 40,000đ on 2026-04-10');
  
  // Query April 2026
  const stats = await queryPaymentStats('2026-04');
  const userStats = stats.find(s => s.userId === user.id);
  
  console.log('\n📊 Query Results for April 2026:');
  if (!userStats) {
    console.log('❌ COUNTEREXAMPLE FOUND: User not found in April 2026 stats');
    console.log('   Expected: User should appear with 120,000đ cumulative debt');
    console.log('   Actual: User does not appear in the list');
    return false;
  }
  
  console.log(`   User found: ${userStats.fullname}`);
  console.log(`   Remaining debt: ${userStats.remainingTotal}đ`);
  
  if (userStats.remainingTotal !== 120000) {
    console.log(`❌ COUNTEREXAMPLE FOUND: Incorrect cumulative debt`);
    console.log(`   Expected: 120,000đ (80,000 + 40,000)`);
    console.log(`   Actual: ${userStats.remainingTotal}đ`);
    return false;
  }
  
  console.log('✅ Test Case 2 PASSED');
  return true;
}

// Test Case 3: User with partial payment
async function testCase3() {
  console.log('\n📋 Test Case 3: User with 100,000đ debt from February 2026, 50,000đ payment in March 2026, no new orders in April 2026');
  console.log('Expected: Query April 2026 should show remaining debt of 50,000đ');
  
  const user = await createTestUser('test_cumulative_case3', 'Test User Case 3');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create order in February 2026
  await createTestOrder(user.id, 100000, '2026-02-15T10:00:00Z', 'TEST_CUMULATIVE_CASE3_ORDER');
  console.log('✅ Created order: 100,000đ on 2026-02-15');
  
  // Create payment in March 2026
  await createTestPayment(user.id, 50000, '2026-03-20T10:00:00Z');
  console.log('✅ Created payment: 50,000đ on 2026-03-20');
  
  // Query April 2026
  const stats = await queryPaymentStats('2026-04');
  const userStats = stats.find(s => s.userId === user.id);
  
  console.log('\n📊 Query Results for April 2026:');
  if (!userStats) {
    console.log('❌ COUNTEREXAMPLE FOUND: User not found in April 2026 stats');
    console.log('   Expected: User should appear with 50,000đ remaining debt');
    console.log('   Actual: User does not appear in the list');
    return false;
  }
  
  console.log(`   User found: ${userStats.fullname}`);
  console.log(`   Remaining debt: ${userStats.remainingTotal}đ`);
  
  if (userStats.remainingTotal !== 50000) {
    console.log(`❌ COUNTEREXAMPLE FOUND: Incorrect remaining debt`);
    console.log(`   Expected: 50,000đ (100,000 - 50,000)`);
    console.log(`   Actual: ${userStats.remainingTotal}đ`);
    return false;
  }
  
  console.log('✅ Test Case 3 PASSED');
  return true;
}

// Test Case 4: User with overpayment
async function testCase4() {
  console.log('\n📋 Test Case 4: User with 200,000đ debt from January 2026, 250,000đ payment in February 2026 (overpaid 50,000đ), no new orders in March 2026');
  console.log('Expected: Query March 2026 should show overpaidTotal of 50,000đ');
  
  const user = await createTestUser('test_cumulative_case4', 'Test User Case 4');
  console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
  
  // Create order in January 2026
  await createTestOrder(user.id, 200000, '2026-01-15T10:00:00Z', 'TEST_CUMULATIVE_CASE4_ORDER');
  console.log('✅ Created order: 200,000đ on 2026-01-15');
  
  // Create payment in February 2026
  await createTestPayment(user.id, 250000, '2026-02-20T10:00:00Z');
  console.log('✅ Created payment: 250,000đ on 2026-02-20');
  
  // Query March 2026
  const stats = await queryPaymentStats('2026-03');
  const userStats = stats.find(s => s.userId === user.id);
  
  console.log('\n📊 Query Results for March 2026:');
  if (!userStats) {
    console.log('❌ COUNTEREXAMPLE FOUND: User not found in March 2026 stats');
    console.log('   Expected: User should appear with 50,000đ overpaid');
    console.log('   Actual: User does not appear in the list');
    return false;
  }
  
  console.log(`   User found: ${userStats.fullname}`);
  console.log(`   Overpaid amount: ${userStats.overpaidTotal}đ`);
  console.log(`   Remaining debt: ${userStats.remainingTotal}đ`);
  
  if (userStats.overpaidTotal !== 50000) {
    console.log(`❌ COUNTEREXAMPLE FOUND: Incorrect overpaid amount`);
    console.log(`   Expected: 50,000đ (250,000 - 200,000)`);
    console.log(`   Actual: ${userStats.overpaidTotal}đ`);
    return false;
  }
  
  if (userStats.remainingTotal !== 0) {
    console.log(`❌ COUNTEREXAMPLE FOUND: Remaining debt should be 0`);
    console.log(`   Expected: 0đ`);
    console.log(`   Actual: ${userStats.remainingTotal}đ`);
    return false;
  }
  
  console.log('✅ Test Case 4 PASSED');
  return true;
}

// Main test runner
async function runTests() {
  console.log('🧪 Bug Condition Exploration Test - Cumulative Debt Display');
  console.log('=' .repeat(70));
  console.log('⚠️  CRITICAL: This test MUST FAIL on unfixed code');
  console.log('⚠️  Failure confirms the bug exists - this is EXPECTED');
  console.log('=' .repeat(70));
  
  try {
    // Cleanup before tests
    await cleanup();
    
    // Run test cases
    const results = [];
    results.push(await testCase1());
    results.push(await testCase2());
    results.push(await testCase3());
    results.push(await testCase4());
    
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
      console.log('\n❌ TEST SUITE FAILED (EXPECTED ON UNFIXED CODE)');
      console.log('✅ Counterexamples found - bug condition confirmed');
      console.log('📝 Root cause: Month range filter prevents cumulative debt calculation');
      console.log('🔧 Fix required: Remove lower bound filter from get_payment_stats and getUserPaymentStats');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED');
      console.log('🎉 Cumulative debt is calculated correctly!');
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
