#!/usr/bin/env node

/**
 * Load Test for Phase 1 - Test compression and caching
 * This test focuses on measuring response times and compression effectiveness
 */

require('dotenv').config();
const https = require('https');

const API_URL = process.env.API_URL || 'https://fsi-dds.onrender.com';
const NUM_CONCURRENT = 30;
const REQUESTS_PER_USER = 3;

// Metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  compressionSavings: 0
};

// Helper to make requests
const makeRequest = (path) => {
  return new Promise((resolve) => {
    const url = new URL(path, API_URL);
    const startTime = Date.now();

    const options = {
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': 'LoadTest/1.0'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      let compressedSize = 0;
      let uncompressedSize = 0;

      res.on('data', (chunk) => {
        data += chunk;
        compressedSize += chunk.length;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const isCompressed = res.headers['content-encoding'] === 'gzip';
        
        metrics.totalRequests++;
        metrics.responseTimes.push(responseTime);

        if (res.statusCode === 200) {
          metrics.successfulRequests++;
          console.log(`✓ ${path} (${responseTime}ms, ${isCompressed ? 'compressed' : 'uncompressed'})`);
        } else {
          metrics.failedRequests++;
          const errorKey = `${res.statusCode}`;
          metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
          console.log(`✗ ${path} (${res.statusCode})`);
        }

        resolve();
      });
    }).on('error', (err) => {
      metrics.totalRequests++;
      metrics.failedRequests++;
      const errorKey = err.code || 'UNKNOWN';
      metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
      console.log(`✗ ${path} (${err.message})`);
      resolve();
    });
  });
};

// Run load test
const runLoadTest = async () => {
  console.log(`\n🚀 Starting Phase 1 Load Test`);
  console.log(`📊 Testing with ${NUM_CONCURRENT} concurrent users, ${REQUESTS_PER_USER} requests each`);
  console.log(`🎯 Total requests: ${NUM_CONCURRENT * REQUESTS_PER_USER}\n`);

  const startTime = Date.now();
  const promises = [];

  // Simulate concurrent users
  for (let user = 1; user <= NUM_CONCURRENT; user++) {
    for (let req = 0; req < REQUESTS_PER_USER; req++) {
      // Vary the endpoints to test different response sizes
      const endpoints = [
        '/api/menu',
        '/api/orders',
        '/api/users'
      ];
      const endpoint = endpoints[req % endpoints.length];
      
      promises.push(makeRequest(endpoint));
    }
  }

  // Execute all requests concurrently
  await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('📈 PHASE 1 LOAD TEST RESULTS');
  console.log('='.repeat(60));

  const avgResponseTime = metrics.responseTimes.length > 0 
    ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
    : 0;
  
  const minResponseTime = metrics.responseTimes.length > 0 
    ? Math.min(...metrics.responseTimes)
    : 0;
  
  const maxResponseTime = metrics.responseTimes.length > 0 
    ? Math.max(...metrics.responseTimes)
    : 0;

  const p95ResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.sort((a, b) => a - b)[Math.floor(metrics.responseTimes.length * 0.95)]
    : 0;

  const successRate = metrics.totalRequests > 0 
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
    : 0;

  console.log(`\n✅ Metrics:`);
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(`  Successful: ${metrics.successfulRequests} ✓`);
  console.log(`  Failed: ${metrics.failedRequests} ✗`);
  console.log(`  Success Rate: ${successRate}%`);

  console.log(`\n⏱️  Response Times:`);
  console.log(`  Average: ${avgResponseTime}ms`);
  console.log(`  Min: ${minResponseTime}ms`);
  console.log(`  Max: ${maxResponseTime}ms`);
  console.log(`  P95: ${p95ResponseTime}ms`);

  console.log(`\n📊 Total Time: ${(totalTime / 1000).toFixed(2)}s`);

  if (Object.keys(metrics.errors).length > 0) {
    console.log(`\n❌ Errors:`);
    Object.entries(metrics.errors).forEach(([code, count]) => {
      console.log(`  - ${code}: ${count}`);
    });
  }

  // Assessment
  console.log('\n' + '='.repeat(60));
  if (successRate >= 95 && avgResponseTime < 2000) {
    console.log('✅ EXCELLENT: System ready for 30 concurrent users');
  } else if (successRate >= 90 && avgResponseTime < 2500) {
    console.log('✅ GOOD: System can handle 30 concurrent users');
  } else if (successRate >= 85 && avgResponseTime < 3000) {
    console.log('⚠️  FAIR: System needs optimization');
  } else {
    console.log('❌ POOR: System needs significant optimization');
  }
  console.log('='.repeat(60));
};

// Run the test
runLoadTest().catch(console.error);
