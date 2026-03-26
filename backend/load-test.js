#!/usr/bin/env node

/**
 * Load Test Script - Simulate 30 concurrent users placing orders
 * Usage: node backend/load-test.js
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

const API_URL = process.env.API_URL || 'https://fsi-dds.onrender.com';
const NUM_USERS = 30;
const ORDERS_PER_USER = 3;

// Test data
const testUsers = Array.from({ length: NUM_USERS }, (_, i) => ({
  id: i + 1,
  username: `testuser${i + 1}`,
  fullname: `Test User ${i + 1}`,
  token: null
}));

const dishes = [
  { id: 1, name: 'Cơm gà' },
  { id: 2, name: 'Cơm tấm' },
  { id: 3, name: 'Cơm chiên' },
  { id: 4, name: 'Cơm cà ri' },
  { id: 5, name: 'Cơm lạc' }
];

// Metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTime: 0,
  responseTimes: [],
  errors: []
};

// Helper function to make HTTP requests
const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

// Register test users
const registerUsers = async () => {
  console.log(`\n📝 Registering ${NUM_USERS} test users...`);
  
  for (const user of testUsers) {
    try {
      const response = await makeRequest('POST', '/api/auth/register', {
        username: user.username,
        password: 'testpass123',
        fullname: user.fullname
      });

      if (response.status === 201 || response.status === 200) {
        user.token = response.data.token;
        console.log(`✓ Registered: ${user.username}`);
      } else {
        console.log(`✗ Failed to register: ${user.username} (${response.status})`);
      }
    } catch (err) {
      console.log(`✗ Error registering ${user.username}: ${err.message}`);
    }
  }
};

// Place orders for all users
const placeOrders = async () => {
  console.log(`\n🍽️ Placing ${NUM_USERS * ORDERS_PER_USER} orders concurrently...`);
  
  const startTime = Date.now();
  const promises = [];

  for (const user of testUsers) {
    if (!user.token) {
      console.log(`⚠️ Skipping ${user.username} - no token`);
      continue;
    }

    for (let i = 0; i < ORDERS_PER_USER; i++) {
      const promise = (async () => {
        const dish1 = dishes[Math.floor(Math.random() * dishes.length)];
        const dish2 = dishes[Math.floor(Math.random() * dishes.length)];

        const orderStart = Date.now();
        metrics.totalRequests++;

        try {
          const response = await makeRequest('POST', '/api/orders', {
            dish1Id: dish1.id,
            dish2Id: dish2.id,
            orderedFor: user.id,
            notes: `Test order from ${user.username}`
          }, user.token);

          const responseTime = Date.now() - orderStart;
          metrics.responseTimes.push(responseTime);

          if (response.status === 201 || response.status === 200) {
            metrics.successfulRequests++;
            console.log(`✓ Order placed by ${user.username} (${responseTime}ms)`);
          } else {
            metrics.failedRequests++;
            metrics.errors.push(`${user.username}: ${response.status}`);
            console.log(`✗ Order failed for ${user.username} (${response.status})`);
          }
        } catch (err) {
          metrics.failedRequests++;
          metrics.errors.push(`${user.username}: ${err.message}`);
          console.log(`✗ Error placing order for ${user.username}: ${err.message}`);
        }
      })();

      promises.push(promise);
    }
  }

  await Promise.all(promises);
  metrics.totalTime = Date.now() - startTime;
};

// Calculate and display metrics
const displayMetrics = () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOAD TEST RESULTS');
  console.log('='.repeat(60));

  const avgResponseTime = metrics.responseTimes.length > 0
    ? (metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length).toFixed(2)
    : 0;

  const minResponseTime = metrics.responseTimes.length > 0
    ? Math.min(...metrics.responseTimes)
    : 0;

  const maxResponseTime = metrics.responseTimes.length > 0
    ? Math.max(...metrics.responseTimes)
    : 0;

  const successRate = metrics.totalRequests > 0
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
    : 0;

  console.log(`\n📈 Metrics:`);
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(`  Successful: ${metrics.successfulRequests} ✓`);
  console.log(`  Failed: ${metrics.failedRequests} ✗`);
  console.log(`  Success Rate: ${successRate}%`);
  console.log(`\n⏱️ Response Times:`);
  console.log(`  Average: ${avgResponseTime}ms`);
  console.log(`  Min: ${minResponseTime}ms`);
  console.log(`  Max: ${maxResponseTime}ms`);
  console.log(`\n⏳ Total Time: ${(metrics.totalTime / 1000).toFixed(2)}s`);

  if (metrics.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    metrics.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    if (metrics.errors.length > 10) {
      console.log(`  ... and ${metrics.errors.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Performance assessment
  if (successRate >= 95 && avgResponseTime < 500) {
    console.log('✅ EXCELLENT: System can handle 30 concurrent users');
  } else if (successRate >= 90 && avgResponseTime < 1000) {
    console.log('⚠️ GOOD: System can handle 30 concurrent users with some delays');
  } else {
    console.log('❌ POOR: System needs optimization for 30 concurrent users');
  }

  console.log('='.repeat(60) + '\n');
};

// Main execution
const main = async () => {
  console.log('🚀 Starting Load Test...');
  console.log(`API URL: ${API_URL}`);
  console.log(`Concurrent Users: ${NUM_USERS}`);
  console.log(`Orders per User: ${ORDERS_PER_USER}`);

  try {
    await registerUsers();
    await placeOrders();
    displayMetrics();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
};

main();
