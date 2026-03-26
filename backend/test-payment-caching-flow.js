/**
 * End-to-end test for payment caching flow
 * Simulates real payment operations with cache invalidation
 */

const cache = require('./cache');

console.log('=== Payment Caching Flow Tests ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   Expected: ${expected}, Got: ${actual}`);
    testsFailed++;
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

// Simulate payment stats query result
function createPaymentStats(userId, fullname, ordersTotal, paidTotal) {
  return {
    userId,
    fullname,
    ordersTotal,
    paidTotal,
    remainingTotal: Math.max(0, ordersTotal - paidTotal)
  };
}

// Test 1: Admin loads payments - cache miss, then hit
console.log('Test 1: Admin Loads Payments (Cache Miss → Hit)');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const cacheKey = `payments:admin:${month}`;
  
  // First request - cache miss
  let cached = cache.get(cacheKey);
  assert(cached === null, 'First request: cache miss');
  
  // Simulate DB query and cache result
  const paymentStats = [
    createPaymentStats(1, 'User 1', 100000, 50000),
    createPaymentStats(2, 'User 2', 200000, 150000)
  ];
  
  cache.set(cacheKey, { data: paymentStats, total: 2 }, 5 * 60 * 1000);
  
  // Second request - cache hit
  cached = cache.get(cacheKey);
  assert(cached !== null, 'Second request: cache hit');
  assertEqual(cached.data.length, 2, 'Cached data has 2 users');
  
  const stats = cache.getStats();
  assertEqual(stats.hits, 1, 'Cache stats show 1 hit');
  assertEqual(stats.misses, 1, 'Cache stats show 1 miss');
  
  console.log('✅ Test 1 passed\n');
} catch (e) {
  console.error('❌ Test 1 failed:', e.message, '\n');
}

// Test 2: Admin marks payment - cache invalidation
console.log('Test 2: Admin Marks Payment (Cache Invalidation)');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const userId = 1;
  
  // Set up cache with payment data
  const paymentStats = [
    createPaymentStats(1, 'User 1', 100000, 50000),
    createPaymentStats(2, 'User 2', 200000, 150000)
  ];
  
  cache.set(`payments:admin:${month}`, { data: paymentStats, total: 2 }, 5 * 60 * 1000);
  cache.set(`payments:user:${userId}:${month}`, { data: paymentStats[0] }, 5 * 60 * 1000);
  cache.set(`stats:dashboard:${month}`, { ordersToday: 42 }, 10 * 60 * 1000);
  
  // Verify cache is populated
  assert(cache.get(`payments:admin:${month}`) !== null, 'Admin payments cached');
  assert(cache.get(`payments:user:${userId}:${month}`) !== null, 'User payments cached');
  assert(cache.get(`stats:dashboard:${month}`) !== null, 'Dashboard stats cached');
  
  // Admin marks payment - invalidate cache
  cache.invalidate(`payments:admin:${month}`, `payment_marked:user_${userId}`);
  cache.invalidate(`payments:user:${userId}:${month}`, `payment_marked`);
  cache.invalidate(`stats:dashboard:${month}`, `payment_marked`);
  cache.invalidate(`stats:user:${userId}:${month}`, `payment_marked`);
  
  // Verify cache is cleared
  assert(cache.get(`payments:admin:${month}`) === null, 'Admin payments cache cleared');
  assert(cache.get(`payments:user:${userId}:${month}`) === null, 'User payments cache cleared');
  assert(cache.get(`stats:dashboard:${month}`) === null, 'Dashboard stats cache cleared');
  
  // Next request will query DB and cache fresh data
  const freshStats = [
    createPaymentStats(1, 'User 1', 100000, 100000), // Now fully paid
    createPaymentStats(2, 'User 2', 200000, 150000)
  ];
  
  cache.set(`payments:admin:${month}`, { data: freshStats, total: 2 }, 5 * 60 * 1000);
  
  const cached = cache.get(`payments:admin:${month}`);
  assert(cached !== null, 'Fresh data cached after invalidation');
  assertEqual(cached.data[0].remainingTotal, 0, 'User 1 now has 0 remaining');
  
  console.log('✅ Test 2 passed\n');
} catch (e) {
  console.error('❌ Test 2 failed:', e.message, '\n');
}

// Test 3: User creates order - cache invalidation
console.log('Test 3: User Creates Order (Cache Invalidation)');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const userId = 2;
  
  // Set up cache
  const paymentStats = [
    createPaymentStats(1, 'User 1', 100000, 50000),
    createPaymentStats(2, 'User 2', 200000, 150000)
  ];
  
  cache.set(`payments:admin:${month}`, { data: paymentStats, total: 2 }, 5 * 60 * 1000);
  cache.set(`payments:user:${userId}:${month}`, { data: paymentStats[1] }, 5 * 60 * 1000);
  
  // User creates order - invalidate cache
  cache.invalidate(`payments:admin:${month}`, `order_created:user_${userId}`);
  cache.invalidate(`payments:user:${userId}:${month}`, `order_created`);
  cache.invalidate(`stats:dashboard:${month}`, `order_created`);
  cache.invalidate(`stats:user:${userId}:${month}`, `order_created`);
  
  // Verify cache is cleared
  assert(cache.get(`payments:admin:${month}`) === null, 'Admin payments cache cleared on order');
  assert(cache.get(`payments:user:${userId}:${month}`) === null, 'User payments cache cleared on order');
  
  // Next request gets fresh data with updated order total
  const freshStats = [
    createPaymentStats(1, 'User 1', 100000, 50000),
    createPaymentStats(2, 'User 2', 240000, 150000) // +40000 from new order
  ];
  
  cache.set(`payments:admin:${month}`, { data: freshStats, total: 2 }, 5 * 60 * 1000);
  
  const cached = cache.get(`payments:admin:${month}`);
  assert(cached !== null, 'Fresh data cached after order creation');
  assertEqual(cached.data[1].ordersTotal, 240000, 'User 2 orders total updated');
  
  console.log('✅ Test 3 passed\n');
} catch (e) {
  console.error('❌ Test 3 failed:', e.message, '\n');
}

// Test 4: Multiple months cache isolation
console.log('Test 4: Multiple Months Cache Isolation');
try {
  cache.clear('test_reset');
  
  // Cache data for different months
  const jan = [createPaymentStats(1, 'User 1', 100000, 50000)];
  const feb = [createPaymentStats(1, 'User 1', 150000, 100000)];
  const mar = [createPaymentStats(1, 'User 1', 200000, 150000)];
  
  cache.set('payments:admin:2024-01', { data: jan, total: 1 }, 5 * 60 * 1000);
  cache.set('payments:admin:2024-02', { data: feb, total: 1 }, 5 * 60 * 1000);
  cache.set('payments:admin:2024-03', { data: mar, total: 1 }, 5 * 60 * 1000);
  
  // Invalidate only February
  cache.invalidate('payments:admin:2024-02', 'test');
  
  // Verify isolation
  const cachedJan = cache.get('payments:admin:2024-01');
  const cachedFeb = cache.get('payments:admin:2024-02');
  const cachedMar = cache.get('payments:admin:2024-03');
  
  assert(cachedJan !== null, 'January cache intact');
  assertEqual(cachedJan.data[0].ordersTotal, 100000, 'January data correct');
  
  assert(cachedFeb === null, 'February cache cleared');
  
  assert(cachedMar !== null, 'March cache intact');
  assertEqual(cachedMar.data[0].ordersTotal, 200000, 'March data correct');
  
  console.log('✅ Test 4 passed\n');
} catch (e) {
  console.error('❌ Test 4 failed:', e.message, '\n');
}

// Test 5: Dashboard stats caching
console.log('Test 5: Dashboard Stats Caching');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const cacheKey = `stats:dashboard:${month}`;
  
  // First request - cache miss
  let cached = cache.get(cacheKey);
  assert(cached === null, 'First request: cache miss');
  
  // Simulate DB query and cache result with 10-min TTL
  const dashboardStats = {
    ordersToday: 42,
    totalUsers: 100,
    popularDishes: [
      { name: 'Pho', orderCount: 15 },
      { name: 'Banh Mi', orderCount: 12 }
    ]
  };
  
  cache.set(cacheKey, dashboardStats, 10 * 60 * 1000);
  
  // Second request - cache hit
  cached = cache.get(cacheKey);
  assert(cached !== null, 'Second request: cache hit');
  assertEqual(cached.ordersToday, 42, 'Dashboard stats correct');
  
  // Verify TTL is 10 minutes
  const info = cache.getEntryInfo(cacheKey);
  assertEqual(info.ttl, 10 * 60 * 1000, 'Dashboard stats TTL is 10 minutes');
  
  console.log('✅ Test 5 passed\n');
} catch (e) {
  console.error('❌ Test 5 failed:', e.message, '\n');
}

// Test 6: Pagination with cache
console.log('Test 6: Pagination with Cache');
try {
  cache.clear('test_reset');
  
  const month = '2024-01';
  const cacheKey = `payments:admin:${month}`;
  
  // Cache full result set
  const allUsers = [];
  for (let i = 1; i <= 50; i++) {
    allUsers.push(createPaymentStats(i, `User ${i}`, 100000 * i, 50000 * i));
  }
  
  cache.set(cacheKey, { data: allUsers, total: 50 }, 5 * 60 * 1000);
  
  // Simulate pagination - get page 1 (limit 20, offset 0)
  const cached = cache.get(cacheKey);
  const page1 = cached.data.slice(0, 20);
  
  assertEqual(page1.length, 20, 'Page 1 has 20 items');
  assertEqual(page1[0].userId, 1, 'Page 1 starts with user 1');
  assertEqual(page1[19].userId, 20, 'Page 1 ends with user 20');
  
  // Simulate pagination - get page 2 (limit 20, offset 20)
  const page2 = cached.data.slice(20, 40);
  
  assertEqual(page2.length, 20, 'Page 2 has 20 items');
  assertEqual(page2[0].userId, 21, 'Page 2 starts with user 21');
  assertEqual(page2[19].userId, 40, 'Page 2 ends with user 40');
  
  console.log('✅ Test 6 passed\n');
} catch (e) {
  console.error('❌ Test 6 failed:', e.message, '\n');
}

// Test 7: Cache invalidation logging for audit trail
console.log('Test 7: Cache Invalidation Audit Trail');
try {
  cache.clear('test_reset');
  cache.clearInvalidationLog();
  
  // Simulate payment operations
  cache.set('payments:admin:2024-01', { data: [] }, 5 * 60 * 1000);
  cache.set('payments:user:1:2024-01', { data: {} }, 5 * 60 * 1000);
  
  // Payment marked
  cache.invalidate('payments:admin:2024-01', 'payment_marked:user_1');
  cache.invalidate('payments:user:1:2024-01', 'payment_marked');
  
  // Order created
  cache.invalidate('payments:admin:2024-01', 'order_created:user_2');
  
  const log = cache.getInvalidationLog();
  
  // Should have at least 2 invalidations (the clear operation may also be logged)
  assert(log.length >= 2, `Audit trail records invalidations (got ${log.length})`);
  
  // Find the payment_marked events
  const paymentMarkedEvents = log.filter(e => e.reason.includes('payment_marked'));
  assert(paymentMarkedEvents.length >= 1, 'Audit trail records payment marked events');
  
  console.log('✅ Test 7 passed\n');
} catch (e) {
  console.error('❌ Test 7 failed:', e.message, '\n');
}

// Test 8: Cache performance - multiple operations
console.log('Test 8: Cache Performance');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const startTime = Date.now();
  
  // Simulate 1000 cache operations
  for (let i = 0; i < 100; i++) {
    cache.set(`test:${i}`, { data: `value${i}` }, 5000);
  }
  
  for (let i = 0; i < 100; i++) {
    cache.get(`test:${i}`);
  }
  
  for (let i = 0; i < 50; i++) {
    cache.invalidate(`test:${i}`, 'test');
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const stats = cache.getStats();
  assertEqual(stats.sets, 100, 'All 100 sets recorded');
  assertEqual(stats.hits, 100, 'All 100 hits recorded');
  assertEqual(stats.invalidations, 50, 'All 50 invalidations recorded');
  
  assert(duration < 100, `Cache operations completed in ${duration}ms (< 100ms)`);
  
  console.log('✅ Test 8 passed\n');
} catch (e) {
  console.error('❌ Test 8 failed:', e.message, '\n');
}

// Summary
console.log('=== TEST SUMMARY ===');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All payment caching flow tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed`);
  process.exit(1);
}
