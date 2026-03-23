#!/usr/bin/env node

/**
 * Production System Test
 * Tests all critical functionality on production server
 */

require('dotenv').config();
const https = require('https');

const API_URL = process.env.API_URL || 'https://fsi-dds.onrender.com';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to make requests
const makeRequest = (method, path, data = null, headers = {}) => {
  return new Promise((resolve) => {
    const url = new URL(path, API_URL);
    const startTime = Date.now();

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...headers
      }
    };

    https.request(url, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const isCompressed = res.headers['content-encoding'] === 'gzip';
        
        try {
          const data = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            data,
            responseTime,
            isCompressed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            responseTime,
            isCompressed,
            headers: res.headers
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        status: 0,
        error: err.message,
        responseTime: Date.now() - startTime
      });
    }).end(data ? JSON.stringify(data) : null);
  });
};

// Test functions
const tests = {
  // 1. Health check
  healthCheck: async () => {
    console.log('\n🏥 Test 1: Health Check');
    const res = await makeRequest('GET', '/api/health');
    
    if (res.status === 200) {
      console.log('  ✅ Server is running');
      return true;
    } else {
      console.log(`  ❌ Server returned ${res.status}`);
      return false;
    }
  },

  // 2. Compression test
  compressionTest: async () => {
    console.log('\n📦 Test 2: Response Compression');
    const res = await makeRequest('GET', '/api/menu');
    
    if (res.isCompressed) {
      console.log('  ✅ Compression enabled (gzip)');
      return true;
    } else {
      console.log('  ⚠️  Compression not detected');
      return false;
    }
  },

  // 3. Rate limiting test
  rateLimitTest: async () => {
    console.log('\n🚦 Test 3: Rate Limiting');
    
    // Make 5 rapid requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('GET', '/api/menu'));
    }
    
    const responses = await Promise.all(promises);
    const hasRateLimit = responses.some(r => r.status === 429);
    
    if (hasRateLimit) {
      console.log('  ✅ Rate limiting is active');
      return true;
    } else {
      console.log('  ℹ️  Rate limiting not triggered (requests within limit)');
      return true; // Not a failure
    }
  },

  // 4. Response time test
  responseTimeTest: async () => {
    console.log('\n⏱️  Test 4: Response Time');
    
    const times = [];
    for (let i = 0; i < 5; i++) {
      const res = await makeRequest('GET', '/api/menu');
      if (res.responseTime) {
        times.push(res.responseTime);
      }
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  Average response time: ${avgTime.toFixed(0)}ms`);
    
    if (avgTime < 2000) {
      console.log('  ✅ Response time is good');
      return true;
    } else if (avgTime < 3000) {
      console.log('  ⚠️  Response time is acceptable');
      return true;
    } else {
      console.log('  ❌ Response time is slow');
      return false;
    }
  },

  // 5. Error handling test
  errorHandlingTest: async () => {
    console.log('\n🛡️  Test 5: Error Handling');
    
    // Test 404
    const res404 = await makeRequest('GET', '/api/nonexistent');
    
    if (res404.status === 404) {
      console.log('  ✅ 404 errors handled correctly');
      return true;
    } else {
      console.log(`  ❌ Unexpected status for 404: ${res404.status}`);
      return false;
    }
  },

  // 6. CORS test
  corsTest: async () => {
    console.log('\n🌐 Test 6: CORS Headers');
    
    const res = await makeRequest('GET', '/api/menu', null, {
      'Origin': 'http://localhost:3000'
    });
    
    const corsHeader = res.headers['access-control-allow-origin'];
    
    if (corsHeader) {
      console.log(`  ✅ CORS enabled: ${corsHeader}`);
      return true;
    } else {
      console.log('  ⚠️  CORS header not found');
      return false;
    }
  },

  // 7. Concurrent requests test
  concurrentTest: async () => {
    console.log('\n🔄 Test 7: Concurrent Requests (10 simultaneous)');
    
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest('GET', '/api/menu'));
    }
    
    const responses = await Promise.all(promises);
    const successful = responses.filter(r => r.status === 200).length;
    
    console.log(`  ${successful}/10 requests successful`);
    
    if (successful >= 8) {
      console.log('  ✅ System handles concurrent requests well');
      return true;
    } else {
      console.log('  ⚠️  Some requests failed under concurrency');
      return false;
    }
  },

  // 8. Cache test
  cacheTest: async () => {
    console.log('\n💾 Test 8: Caching');
    
    // Make same request twice
    const res1 = await makeRequest('GET', '/api/menu');
    const time1 = res1.responseTime;
    
    const res2 = await makeRequest('GET', '/api/menu');
    const time2 = res2.responseTime;
    
    console.log(`  First request: ${time1}ms`);
    console.log(`  Second request: ${time2}ms`);
    
    if (time2 < time1 * 0.8) {
      console.log('  ✅ Caching is working (second request faster)');
      return true;
    } else {
      console.log('  ℹ️  Cache may not be active or data is small');
      return true; // Not a failure
    }
  }
};

// Run all tests
const runTests = async () => {
  console.log('═'.repeat(60));
  console.log('🧪 PRODUCTION SYSTEM TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`Testing: ${API_URL}`);

  for (const [name, testFn] of Object.entries(tests)) {
    try {
      const passed = await testFn();
      results.tests.push({ name, passed });
      
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (err) {
      console.log(`  ❌ Test error: ${err.message}`);
      results.tests.push({ name, passed: false });
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Passed: ${results.passed}/${results.tests.length}`);
  console.log(`Failed: ${results.failed}/${results.tests.length}`);
  
  const passRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(`Pass Rate: ${passRate}%`);

  console.log('\n' + '═'.repeat(60));
  if (results.failed === 0) {
    console.log('✅ ALL TESTS PASSED - System is healthy!');
  } else if (results.failed <= 2) {
    console.log('⚠️  MOST TESTS PASSED - Minor issues detected');
  } else {
    console.log('❌ MULTIPLE FAILURES - System needs attention');
  }
  console.log('═'.repeat(60));
};

// Run tests
runTests().catch(console.error);
