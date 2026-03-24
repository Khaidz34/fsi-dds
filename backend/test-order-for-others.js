/**
 * End-to-End Test: Order for Others Feature
 * 
 * Tests the complete flow of User A ordering meals for User B:
 * 1. User A orders meals for User B
 * 2. User A sees the order in their order history
 * 3. User A's payment includes the order amount
 * 4. User B sees the order in their order history
 * 5. User B's payment includes the order amount
 */

const http = require('http');
const assert = require('assert');

const API_BASE = 'http://localhost:10000';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test data
const testUsers = [
  { username: `user_a_${Date.now()}`, password: 'Test123!', fullname: 'User A' },
  { username: `user_b_${Date.now()}`, password: 'Test123!', fullname: 'User B' }
];

let userAToken, userBToken, userAId, userBId;
let menuId, dish1Id, dish2Id;

async function runTests() {
  console.log('🧪 Starting Order-for-Others Feature Test\n');

  try {
    // Step 1: Register test users
    console.log('📝 Step 1: Registering test users...');
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      const res = await makeRequest('POST', '/api/auth/register', {
        username: user.username,
        password: user.password,
        fullname: user.fullname
      });
      
      assert.strictEqual(res.status, 200, `Failed to register ${user.fullname}`);
      assert(res.data.token, `No token returned for ${user.fullname}`);
      
      if (i === 0) {
        userAToken = res.data.token;
        userAId = res.data.user.id;
        console.log(`  ✅ User A registered (ID: ${userAId})`);
      } else {
        userBToken = res.data.token;
        userBId = res.data.user.id;
        console.log(`  ✅ User B registered (ID: ${userBId})`);
      }
    }

    // Step 2: Get today's menu
    console.log('\n📋 Step 2: Getting today\'s menu...');
    const menuRes = await makeRequest('GET', '/api/menu/today', null, userAToken);
    assert.strictEqual(menuRes.status, 200, 'Failed to get menu');
    assert(menuRes.data.dishes && menuRes.data.dishes.length >= 2, 'Not enough dishes in menu');
    
    dish1Id = menuRes.data.dishes[0].id;
    dish2Id = menuRes.data.dishes[1].id;
    console.log(`  ✅ Menu loaded with ${menuRes.data.dishes.length} dishes`);
    console.log(`     Dish 1: ${menuRes.data.dishes[0].name} (ID: ${dish1Id})`);
    console.log(`     Dish 2: ${menuRes.data.dishes[1].name} (ID: ${dish2Id})`);

    // Step 3: User A orders meals for User B
    console.log('\n🍽️  Step 3: User A orders meals for User B...');
    const orderRes = await makeRequest('POST', '/api/orders', {
      dish1Id: dish1Id,
      dish2Id: dish2Id,
      orderedFor: userBId,  // KEY: Ordering for User B
      notes: 'Test order for User B'
    }, userAToken);
    
    assert.strictEqual(orderRes.status, 200, `Failed to create order: ${JSON.stringify(orderRes.data)}`);
    assert(orderRes.data.id, 'No order ID returned');
    const orderId = orderRes.data.id;
    console.log(`  ✅ Order created (ID: ${orderId})`);
    console.log(`     Ordered by: User A (${userAId})`);
    console.log(`     Ordered for: User B (${userBId})`);

    // Step 4: Verify User A sees the order in their history
    console.log('\n👀 Step 4: Verifying User A sees the order in their history...');
    const userAOrdersRes = await makeRequest('GET', '/api/orders/all', null, userAToken);
    assert.strictEqual(userAOrdersRes.status, 200, 'Failed to get User A orders');
    
    const userAOrder = userAOrdersRes.data.find(o => o.id === orderId);
    assert(userAOrder, 'User A does not see the order they placed for User B');
    console.log(`  ✅ User A sees the order in their history`);
    console.log(`     Order ID: ${userAOrder.id}`);
    console.log(`     User ID: ${userAOrder.user_id}`);
    console.log(`     Ordered For: ${userAOrder.ordered_for}`);

    // Step 5: Verify User B sees the order in their history
    console.log('\n👀 Step 5: Verifying User B sees the order in their history...');
    const userBOrdersRes = await makeRequest('GET', '/api/orders/all', null, userBToken);
    assert.strictEqual(userBOrdersRes.status, 200, 'Failed to get User B orders');
    
    const userBOrder = userBOrdersRes.data.find(o => o.id === orderId);
    assert(userBOrder, 'User B does not see the order placed for them');
    console.log(`  ✅ User B sees the order in their history`);
    console.log(`     Order ID: ${userBOrder.id}`);
    console.log(`     User ID: ${userBOrder.user_id}`);
    console.log(`     Ordered For: ${userBOrder.ordered_for}`);

    // Step 6: Get current month for payment queries
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log(`\n💰 Step 6: Checking payment calculations for month ${currentMonth}...`);

    // Step 7: Verify User A's payment includes the order
    console.log('\n💳 Step 7: Verifying User A\'s payment includes the order...');
    const userAPaymentRes = await makeRequest('GET', `/api/payments/my`, null, userAToken);
    assert.strictEqual(userAPaymentRes.status, 200, 'Failed to get User A payment');
    
    const userAPayment = userAPaymentRes.data;
    console.log(`  ✅ User A payment stats:`);
    console.log(`     Orders count: ${userAPayment.ordersCount}`);
    console.log(`     Orders total: ${userAPayment.ordersTotal} đồng`);
    console.log(`     Paid total: ${userAPayment.paidTotal} đồng`);
    console.log(`     Remaining total: ${userAPayment.remainingTotal} đồng`);
    
    assert(userAPayment.ordersCount > 0, 'User A has no orders in payment stats');
    assert(userAPayment.ordersTotal > 0, 'User A has no order total in payment stats');
    console.log(`  ✅ User A's payment includes the order amount`);

    // Step 8: Verify User B's payment includes the order
    console.log('\n💳 Step 8: Verifying User B\'s payment includes the order...');
    const userBPaymentRes = await makeRequest('GET', `/api/payments/my`, null, userBToken);
    assert.strictEqual(userBPaymentRes.status, 200, 'Failed to get User B payment');
    
    const userBPayment = userBPaymentRes.data;
    console.log(`  ✅ User B payment stats:`);
    console.log(`     Orders count: ${userBPayment.ordersCount}`);
    console.log(`     Orders total: ${userBPayment.ordersTotal} đồng`);
    console.log(`     Paid total: ${userBPayment.paidTotal} đồng`);
    console.log(`     Remaining total: ${userBPayment.remainingTotal} đồng`);
    
    assert(userBPayment.ordersCount > 0, 'User B has no orders in payment stats');
    assert(userBPayment.ordersTotal > 0, 'User B has no order total in payment stats');
    console.log(`  ✅ User B's payment includes the order amount`);

    // Step 9: Verify both users have the same order total (since it's the same order)
    console.log('\n🔍 Step 9: Verifying order amounts match...');
    assert.strictEqual(
      userAPayment.ordersTotal,
      userBPayment.ordersTotal,
      'Order totals do not match between User A and User B'
    );
    console.log(`  ✅ Both users have the same order total: ${userAPayment.ordersTotal} đồng`);

    // Step 10: Verify the order is marked as unpaid
    console.log('\n📊 Step 10: Verifying order payment status...');
    assert.strictEqual(userAOrder.paid, false, 'Order should be unpaid');
    assert.strictEqual(userBOrder.paid, false, 'Order should be unpaid');
    console.log(`  ✅ Order is correctly marked as unpaid`);

    console.log('\n✅ All tests passed! Order-for-Others feature is working correctly.\n');
    console.log('Summary:');
    console.log(`  - User A (${userAId}) ordered for User B (${userBId})`);
    console.log(`  - Both users see the order in their history`);
    console.log(`  - Both users have the order amount in their payment calculations`);
    console.log(`  - Order is correctly marked as unpaid`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  console.log('\n✨ Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
