/**
 * Integration tests for cache endpoints
 * Tests cache behavior with payment endpoints and invalidation
 */

const cache = require('./cache');

console.log('=== Cache Endpoint Integration Tests ===\n');

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

// Test 1: Cache payment stats with 5-minute TTL
console.log('Test 1: Cache Payment Stats (5-min TTL)');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const paymentData = {
    data: [
      { userId: 1, fullname: 'User 1', ordersTotal: 100000, paidTotal: 50000 }
    ],
    total: 1
  };
  
  const cacheKey = 'payments:admin:2024-01';
  cache.set(cacheKey, paymentData, 5 * 60 * 1000); // 5 minutes
  
  const cached = cache.get(cacheKey);
  assert(cached !== null, 'Payment stats cached');
  assertEqual(cached.data[0].userId, 1, 'Cached data is correct');
  
  const stats = cache.getStats();
  assertEqual(stats.hits, 1, 'Cache hit recorded');
  console.log('✅ Test 1 passed\n');
} catch (e) {
  console.error('❌ Test 1 failed:', e.message, '\n');
}

// Test 2: Cache invalidation on payment marked
console.log('Test 2: Cache Invalidation on Payment Marked');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const userId = 1;
  
  // Set up cache entries
  cache.set(`payments:admin:${month}`, { data: [] }, 5 * 60 * 1000);
  cache.set(`payments:user:${userId}:${month}`, { data: [] }, 5 * 60 * 1000);
  cache.set(`stats:dashboard:${month}`, { data: [] }, 10 * 60 * 1000);
  cache.set(`stats:user:${userId}:${month}`, { data: [] }, 10 * 60 * 1000);
  
  // Simulate payment marked - invalidate cache
  cache.invalidate(`payments:admin:${month}`, `payment_marked:user_${userId}`);
  cache.invalidate(`payments:user:${userId}:${month}`, `payment_marked`);
  cache.invalidate(`stats:dashboard:${month}`, `payment_marked`);
  cache.invalidate(`stats:user:${userId}:${month}`, `payment_marked`);
  
  // Verify all are cleared
  assert(cache.get(`payments:admin:${month}`) === null, 'Admin payments cache cleared');
  assert(cache.get(`payments:user:${userId}:${month}`) === null, 'User payments cache cleared');
  assert(cache.get(`stats:dashboard:${month}`) === null, 'Dashboard stats cache cleared');
  assert(cache.get(`stats:user:${userId}:${month}`) === null, 'User stats cache cleared');
  
  const stats = cache.getStats();
  assertEqual(stats.invalidations, 4, 'All 4 cache entries invalidated');
  console.log('✅ Test 2 passed\n');
} catch (e) {
  console.error('❌ Test 2 failed:', e.message, '\n');
}

// Test 3: Cache invalidation on order created
console.log('Test 3: Cache Invalidation on Order Created');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const userId = 2;
  
  // Set up cache entries
  cache.set(`payments:admin:${month}`, { data: [] }, 5 * 60 * 1000);
  cache.set(`payments:user:${userId}:${month}`, { data: [] }, 5 * 60 * 1000);
  cache.set(`stats:dashboard:${month}`, { data: [] }, 10 * 60 * 1000);
  
  // Simulate order created - invalidate cache
  cache.invalidate(`payments:admin:${month}`, `order_created:user_${userId}`);
  cache.invalidate(`payments:user:${userId}:${month}`, `order_created`);
  cache.invalidate(`stats:dashboard:${month}`, `order_created`);
  cache.invalidate(`stats:user:${userId}:${month}`, `order_created`);
  
  // Verify all are cleared
  assert(cache.get(`payments:admin:${month}`) === null, 'Admin payments cache cleared on order');
  assert(cache.get(`payments:user:${userId}:${month}`) === null, 'User payments cache cleared on order');
  assert(cache.get(`stats:dashboard:${month}`) === null, 'Dashboard stats cache cleared on order');
  
  console.log('✅ Test 3 passed\n');
} catch (e) {
  console.error('❌ Test 3 failed:', e.message, '\n');
}

// Test 4: Cache invalidation on order updated
console.log('Test 4: Cache Invalidation on Order Updated');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const month = '2024-01';
  const userId = 3;
  
  // Set up cache entries
  cache.set(`payments:admin:${month}`, { data: [] }, 5 * 60 * 1000);
  cache.set(`payments:user:${userId}:${month}`, { data: [] }, 5 * 60 * 1000);
  
  // Simulate order updated - invalidate cache
  cache.invalidate(`payments:admin:${month}`, `order_updated:user_${userId}`);
  cache.invalidate(`payments:user:${userId}:${month}`, `order_updated`);
  cache.invalidate(`stats:dashboard:${month}`, `order_updated`);
  cache.invalidate(`stats:user:${userId}:${month}`, `order_updated`);
  
  // Verify cleared
  assert(cache.get(`payments:admin:${month}`) === null, 'Admin payments cache cleared on update');
  assert(cache.get(`payments:user:${userId}:${month}`) === null, 'User payments cache cleared on update');
  
  console.log('✅ Test 4 passed\n');
} catch (e) {
  console.error('❌ Test 4 failed:', e.message, '\n');
}

// Test 5: Dashboard stats cache with 10-minute TTL
console.log('Test 5: Dashboard Stats Cache (10-min TTL)');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  const statsData = {
    ordersToday: 42,
    totalUsers: 100,
    popularDishes: []
  };
  
  const cacheKey = 'stats:dashboard:2024-01';
  cache.set(cacheKey, statsData, 10 * 60 * 1000); // 10 minutes
  
  const cached = cache.get(cacheKey);
  assert(cached !== null, 'Dashboard stats cached');
  assertEqual(cached.ordersToday, 42, 'Cached stats data is correct');
  
  const info = cache.getEntryInfo(cacheKey);
  assertEqual(info.ttl, 10 * 60 * 1000, 'TTL is 10 minutes');
  console.log('✅ Test 5 passed\n');
} catch (e) {
  console.error('❌ Test 5 failed:', e.message, '\n');
}

// Test 6: Month-specific cache keys
console.log('Test 6: Month-Specific Cache Keys');
try {
  cache.clear('test_reset');
  
  // Create cache entries for different months
  cache.set('payments:admin:2024-01', { month: '2024-01' }, 5 * 60 * 1000);
  cache.set('payments:admin:2024-02', { month: '2024-02' }, 5 * 60 * 1000);
  cache.set('payments:admin:2024-03', { month: '2024-03' }, 5 * 60 * 1000);
  
  // Verify each month has separate cache
  const jan = cache.get('payments:admin:2024-01');
  const feb = cache.get('payments:admin:2024-02');
  const mar = cache.get('payments:admin:2024-03');
  
  assert(jan !== null && jan.month === '2024-01', 'January cache is separate');
  assert(feb !== null && feb.month === '2024-02', 'February cache is separate');
  assert(mar !== null && mar.month === '2024-03', 'March cache is separate');
  
  // Invalidate only January
  cache.invalidate('payments:admin:2024-01', 'test');
  
  assert(cache.get('payments:admin:2024-01') === null, 'January cleared');
  assert(cache.get('payments:admin:2024-02') !== null, 'February still cached');
  assert(cache.get('payments:admin:2024-03') !== null, 'March still cached');
  
  console.log('✅ Test 6 passed\n');
} catch (e) {
  console.error('❌ Test 6 failed:', e.message, '\n');
}

// Test 7: Cache statistics endpoint data
console.log('Test 7: Cache Statistics Endpoint Data');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  // Simulate cache operations
  cache.set('test:1', { data: 'value' }, 5000);
  cache.set('test:2', { data: 'value' }, 5000);
  
  cache.get('test:1'); // hit
  cache.get('test:1'); // hit
  cache.get('test:1'); // hit
  cache.get('nonexistent'); // miss
  cache.get('nonexistent'); // miss
  
  cache.invalidate('test:1', 'test');
  
  const stats = cache.getStats();
  
  assertEqual(stats.hits, 3, 'Stats show 3 hits');
  assertEqual(stats.misses, 2, 'Stats show 2 misses');
  assertEqual(stats.invalidations, 1, 'Stats show 1 invalidation');
  assertEqual(stats.sets, 2, 'Stats show 2 sets');
  assert(stats.hitRate.includes('60'), 'Hit rate is 60%');
  
  console.log('✅ Test 7 passed\n');
} catch (e) {
  console.error('❌ Test 7 failed:', e.message, '\n');
}

// Test 8: Invalidation logging for debugging
console.log('Test 8: Invalidation Logging');
try {
  cache.clear('test_reset');
  cache.clearInvalidationLog();
  
  // Set up cache entries first
  cache.set('payments:admin:2024-01', { data: 'value' }, 5000);
  cache.set('payments:user:1:2024-01', { data: 'value' }, 5000);
  cache.set('stats:dashboard:2024-01', { data: 'value' }, 5000);
  
  cache.invalidate('payments:admin:2024-01', 'payment_marked:user_1');
  cache.invalidate('payments:user:1:2024-01', 'payment_marked');
  cache.invalidate('stats:dashboard:2024-01', 'payment_marked');
  
  const log = cache.getInvalidationLog();
  
  assert(log.length >= 3, 'Log records all invalidations');
  assert(log.length > 0 && log[0].reason === 'payment_marked:user_1', 'Log records reason');
  assert(log.length > 0 && log[0].key === 'payments:admin:2024-01', 'Log records key');
  assert(log.length > 0 && log[0].timestamp !== undefined, 'Log records timestamp');
  
  console.log('✅ Test 8 passed\n');
} catch (e) {
  console.error('❌ Test 8 failed:', e.message, '\n');
}

// Test 9: Cache fallback scenario
console.log('Test 9: Cache Fallback (DB Query When Cache Unavailable)');
try {
  cache.clear('test_reset');
  
  const cacheKey = 'payments:admin:2024-01';
  
  // Cache miss - would trigger DB query
  let result = cache.get(cacheKey);
  assert(result === null, 'Cache miss returns null');
  
  // Simulate DB query result being cached
  const dbResult = { data: [{ userId: 1, fullname: 'User 1' }], total: 1 };
  cache.set(cacheKey, dbResult, 5 * 60 * 1000);
  
  // Now cache hit
  result = cache.get(cacheKey);
  assert(result !== null, 'Cache hit after DB query');
  assertEqual(result.data[0].userId, 1, 'Cached DB result is correct');
  
  console.log('✅ Test 9 passed\n');
} catch (e) {
  console.error('❌ Test 9 failed:', e.message, '\n');
}

// Test 10: Multiple users cache isolation
console.log('Test 10: Multiple Users Cache Isolation');
try {
  cache.clear('test_reset');
  
  const month = '2024-01';
  
  // Cache for different users
  cache.set(`payments:user:1:${month}`, { userId: 1, data: 'user1' }, 5 * 60 * 1000);
  cache.set(`payments:user:2:${month}`, { userId: 2, data: 'user2' }, 5 * 60 * 1000);
  cache.set(`payments:user:3:${month}`, { userId: 3, data: 'user3' }, 5 * 60 * 1000);
  
  // Invalidate only user 2
  cache.invalidate(`payments:user:2:${month}`, 'test');
  
  // Verify isolation
  assert(cache.get(`payments:user:1:${month}`) !== null, 'User 1 cache intact');
  assert(cache.get(`payments:user:2:${month}`) === null, 'User 2 cache cleared');
  assert(cache.get(`payments:user:3:${month}`) !== null, 'User 3 cache intact');
  
  console.log('✅ Test 10 passed\n');
} catch (e) {
  console.error('❌ Test 10 failed:', e.message, '\n');
}

// Summary
console.log('=== TEST SUMMARY ===');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All integration tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed`);
  process.exit(1);
}
