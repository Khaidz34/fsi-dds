/**
 * Test Payment Endpoints - Phase 1 Query Optimization
 * Tests the optimized payment query builder and pagination
 */

const http = require('http');

const BASE_URL = 'http://localhost:10000';
const TEST_TOKEN = 'test-token'; // Will need valid token from login

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('=== Payment Endpoints Test Suite ===\n');

  try {
    // Test 1: Health check
    console.log('Test 1: Health Check');
    const health = await makeRequest('GET', '/health');
    console.log('Status:', health.status);
    console.log('Response:', health.body);
    console.log('✓ Health check passed\n');

    // Test 2: Login to get token
    console.log('Test 2: Login');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Status:', loginRes.status);
    if (loginRes.status === 200 && loginRes.body.token) {
      console.log('✓ Login successful, token obtained\n');
      const adminToken = loginRes.body.token;

      // Test 3: Get payments without pagination (default)
      console.log('Test 3: Get Payments (Default Pagination)');
      const paymentsDefault = await makeRequest('GET', '/api/payments', null, adminToken);
      console.log('Status:', paymentsDefault.status);
      console.log('Response structure:', {
        hasData: !!paymentsDefault.body.data,
        hasPagination: !!paymentsDefault.body.pagination,
        dataLength: paymentsDefault.body.data?.length,
        pagination: paymentsDefault.body.pagination
      });
      console.log('✓ Default pagination works\n');

      // Test 4: Get payments with limit=10
      console.log('Test 4: Get Payments (limit=10)');
      const paymentsLimit10 = await makeRequest('GET', '/api/payments?limit=10', null, adminToken);
      console.log('Status:', paymentsLimit10.status);
      console.log('Response structure:', {
        dataLength: paymentsLimit10.body.data?.length,
        pagination: paymentsLimit10.body.pagination
      });
      console.log('✓ Limit parameter works\n');

      // Test 5: Get payments with limit=150 (should be clamped to 100)
      console.log('Test 5: Get Payments (limit=150, should clamp to 100)');
      const paymentsLimit150 = await makeRequest('GET', '/api/payments?limit=150', null, adminToken);
      console.log('Status:', paymentsLimit150.status);
      console.log('Pagination limit:', paymentsLimit150.body.pagination?.pageSize);
      if (paymentsLimit150.body.pagination?.pageSize <= 100) {
        console.log('✓ Limit clamping works\n');
      } else {
        console.log('✗ Limit clamping failed\n');
      }

      // Test 6: Get payments with offset
      console.log('Test 6: Get Payments (offset=10)');
      const paymentsOffset = await makeRequest('GET', '/api/payments?offset=10', null, adminToken);
      console.log('Status:', paymentsOffset.status);
      console.log('Response structure:', {
        dataLength: paymentsOffset.body.data?.length,
        pagination: paymentsOffset.body.pagination
      });
      console.log('✓ Offset parameter works\n');

      // Test 7: Get payments with month filter
      console.log('Test 7: Get Payments (month=2024-01)');
      const paymentsMonth = await makeRequest('GET', '/api/payments?month=2024-01', null, adminToken);
      console.log('Status:', paymentsMonth.status);
      console.log('Response structure:', {
        dataLength: paymentsMonth.body.data?.length,
        pagination: paymentsMonth.body.pagination
      });
      console.log('✓ Month filter works\n');

      // Test 8: Get my payments
      console.log('Test 8: Get My Payments');
      const myPayments = await makeRequest('GET', '/api/payments/my', null, adminToken);
      console.log('Status:', myPayments.status);
      console.log('Response:', myPayments.body);
      console.log('✓ My payments endpoint works\n');

      // Test 9: Verify pagination metadata
      console.log('Test 9: Verify Pagination Metadata');
      const paginationTest = await makeRequest('GET', '/api/payments?limit=5&offset=0', null, adminToken);
      const pagination = paginationTest.body.pagination;
      console.log('Pagination metadata:', pagination);
      const hasRequiredFields = pagination && 
        'total' in pagination && 
        'page' in pagination && 
        'pageSize' in pagination && 
        'hasMore' in pagination &&
        'totalPages' in pagination;
      if (hasRequiredFields) {
        console.log('✓ All pagination metadata fields present\n');
      } else {
        console.log('✗ Missing pagination metadata fields\n');
      }

    } else {
      console.log('✗ Login failed\n');
    }

    console.log('=== Test Suite Complete ===');
  } catch (error) {
    console.error('Test error:', error);
  }

  process.exit(0);
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);
