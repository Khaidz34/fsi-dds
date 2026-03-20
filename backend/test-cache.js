/**
 * Test suite for cache layer and caching functionality
 * Tests cache operations, TTL, invalidation, and statistics
 */

const cache = require('./cache');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
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
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

// Test 1: Basic cache set and get
console.log('\n=== Test 1: Basic Cache Set/Get ===');
try {
  cache.clear('test_reset');
  cache.set('test:key1', { data: 'value1' }, 5000);
  const result = cache.get('test:key1');
  assert(result !== null, 'Cache get returns non-null value');
  assertEqual(result.data, 'value1', 'Cache returns correct data');
  console.log('✅ Test 1 passed\n');
} catch (e) {
  console.log('❌ Test 1 failed\n');
}

// Test 2: Cache miss on non-existent key
console.log('=== Test 2: Cache Miss ===');
try {
  const result = cache.get('nonexistent:key');
  assert(result === null, 'Cache returns null for non-existent key');
  console.log('✅ Test 2 passed\n');
} catch (e) {
  console.log('❌ Test 2 failed\n');
}

// Test 3: Cache expiration (TTL)
console.log('=== Test 3: Cache TTL Expiration ===');
try {
  cache.clear('test_reset');
  cache.set('test:ttl', { data: 'expires' }, 100); // 100ms TTL
  
  // Should be available immediately
  let result = cache.get('test:ttl');
  assert(result !== null, 'Cache returns value before TTL expires');
  
  // Wait for expiration
  setTimeout(() => {
    result = cache.get('test:ttl');
    assert(result === null, 'Cache returns null after TTL expires');
    console.log('✅ Test 3 passed\n');
  }, 150);
} catch (e) {
  console.log('❌ Test 3 failed\n');
}

// Test 4: Exact key invalidation
console.log('=== Test 4: Exact Key Invalidation ===');
try {
  cache.clear('test_reset');
  cache.set('test:invalidate', { data: 'value' }, 5000);
  
  let result = cache.get('test:invalidate');
  assert(result !== null, 'Cache has value before invalidation');
  
  const count = cache.invalidate('test:invalidate', 'test');
  assertEqual(count, 1, 'Invalidation returns correct count');
  
  result = cache.get('test:invalidate');
  assert(result === null, 'Cache returns null after invalidation');
  console.log('✅ Test 4 passed\n');
} catch (e) {
  console.log('❌ Test 4 failed\n');
}

// Test 5: Wildcard invalidation
console.log('=== Test 5: Wildcard Invalidation ===');
try {
  cache.clear('test_reset');
  cache.set('payments:admin:2024-01', { data: 'admin' }, 5000);
  cache.set('payments:user:1:2024-01', { data: 'user1' }, 5000);
  cache.set('payments:user:2:2024-01', { data: 'user2' }, 5000);
  cache.set('stats:dashboard:2024-01', { data: 'stats' }, 5000);
  
  // Invalidate all payments cache
  const count = cache.invalidate('payments:*', 'test');
  assertEqual(count, 3, 'Wildcard invalidation clears correct number of entries');
  
  // Verify payments are cleared
  assert(cache.get('payments:admin:2024-01') === null, 'Admin payments cleared');
  assert(cache.get('payments:user:1:2024-01') === null, 'User 1 payments cleared');
  assert(cache.get('payments:user:2:2024-01') === null, 'User 2 payments cleared');
  
  // Verify stats still exist
  assert(cache.get('stats:dashboard:2024-01') !== null, 'Stats not affected by payments wildcard');
  console.log('✅ Test 5 passed\n');
} catch (e) {
  console.log('❌ Test 5 failed\n');
}

// Test 6: Cache statistics - hits and misses
console.log('=== Test 6: Cache Statistics ===');
try {
  cache.clear('test_reset');
  cache.resetStats();
  
  cache.set('test:stat', { data: 'value' }, 5000);
  
  // Generate hits
  cache.get('test:stat');
  cache.get('test:stat');
  cache.get('test:stat');
  
  // Generate misses
  cache.get('nonexistent:1');
  cache.get('nonexistent:2');
  
  const stats = cache.getStats();
  assertEqual(stats.hits, 3, 'Statistics track hits correctly');
  assertEqual(stats.misses, 2, 'Statistics track misses correctly');
  assert(stats.hitRate.includes('60'), 'Hit rate calculated correctly (60%)');
  console.log('✅ Test 6 passed\n');
} catch (e) {
  console.log('❌ Test 6 failed\n');
}

// Test 7: Cache invalidation logging
console.log('=== Test 7: Invalidation Logging ===');
try {
  cache.clear('test_reset');
  cache.clearInvalidationLog();
  
  cache.set('test:log1', { data: 'value' }, 5000);
  cache.set('test:log2', { data: 'value' }, 5000);
  
  cache.invalidate('test:log1', 'test_reason_1');
  cache.invalidate('test:log2', 'test_reason_2');
  
  const log = cache.getInvalidationLog();
  assert(log.length >= 2, 'Invalidation log records events');
  assert(log[0].reason === 'test_reason_1', 'Log records correct reason');
  assert(log[0].key === 'test:log1', 'Log records correct key');
  assert(log[0].timestamp !== undefined, 'Log records timestamp');
  console.log('✅ Test 7 passed\n');
} catch (e) {
  console.log('❌ Test 7 failed\n');
}

// Test 8: Clear all cache
console.log('=== Test 8: Clear All Cache ===');
try {
  cache.clear('test_reset');
  cache.set('test:clear1', { data: 'value' }, 5000);
  cache.set('test:clear2', { data: 'value' }, 5000);
  cache.set('test:clear3', { data: 'value' }, 5000);
  
  let keys = cache.getAllKeys();
  assert(keys.length >= 3, 'Cache has multiple entries');
  
  cache.clear('test_clear_all');
  
  keys = cache.getAllKeys();
  assertEqual(keys.length, 0, 'Clear removes all entries');
  console.log('✅ Test 8 passed\n');
} catch (e) {
  console.log('❌ Test 8 failed\n');
}

// Test 9: Get entry info
console.log('=== Test 9: Get Entry Info ===');
try {
  cache.clear('test_reset');
  cache.set('test:info', { data: 'value' }, 5000);
  
  const info = cache.getEntryInfo('test:info');
  assert(info !== null, 'Entry info returns data');
  assertEqual(info.key, 'test:info', 'Entry info has correct key');
  assertEqual(info.ttl, 5000, 'Entry info has correct TTL');
  assert(info.age >= 0, 'Entry info has age');
  assert(info.remaining > 0, 'Entry info has remaining time');
  assert(info.expired === false, 'Entry info shows not expired');
  console.log('✅ Test 9 passed\n');
} catch (e) {
  console.log('❌ Test 9 failed\n');
}

// Test 10: Get all keys
console.log('=== Test 10: Get All Keys ===');
try {
  cache.clear('test_reset');
  cache.set('test:key1', { data: 'value' }, 5000);
  cache.set('test:key2', { data: 'value' }, 5000);
  cache.set('test:key3', { data: 'value' }, 5000);
  
  const keys = cache.getAllKeys();
  assert(keys.includes('test:key1'), 'getAllKeys includes key1');
  assert(keys.includes('test:key2'), 'getAllKeys includes key2');
  assert(keys.includes('test:key3'), 'getAllKeys includes key3');
  console.log('✅ Test 10 passed\n');
} catch (e) {
  console.log('❌ Test 10 failed\n');
}

// Test 11: Multiple invalidations with same prefix
console.log('=== Test 11: Multiple Invalidations ===');
try {
  cache.clear('test_reset');
  cache.set('payments:admin:2024-01', { data: 'admin' }, 5000);
  cache.set('payments:admin:2024-02', { data: 'admin' }, 5000);
  cache.set('payments:admin:2024-03', { data: 'admin' }, 5000);
  
  const count = cache.invalidate('payments:admin:*', 'test');
  assertEqual(count, 3, 'Wildcard invalidation with multiple months works');
  
  assert(cache.get('payments:admin:2024-01') === null, 'Jan cleared');
  assert(cache.get('payments:admin:2024-02') === null, 'Feb cleared');
  assert(cache.get('payments:admin:2024-03') === null, 'Mar cleared');
  console.log('✅ Test 11 passed\n');
} catch (e) {
  console.log('❌ Test 11 failed\n');
}

// Test 12: Cache key strategy validation
console.log('=== Test 12: Cache Key Strategy ===');
try {
  cache.clear('test_reset');
  
  // Test all cache key patterns
  const keys = [
    'payments:admin:2024-01',
    'payments:user:123:2024-01',
    'stats:dashboard:2024-01',
    'stats:user:123:2024-01'
  ];
  
  keys.forEach((key, idx) => {
    cache.set(key, { data: `value${idx}` }, 5000);
  });
  
  keys.forEach((key, idx) => {
    const result = cache.get(key);
    assert(result !== null, `Key pattern ${key} works`);
  });
  
  console.log('✅ Test 12 passed\n');
} catch (e) {
  console.log('❌ Test 12 failed\n');
}

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed`);
  process.exit(1);
}
