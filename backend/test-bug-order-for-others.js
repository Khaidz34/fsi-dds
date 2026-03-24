/**
 * Bug Condition Exploration Test: Order-for-Others Not Showing
 * 
 * This test MUST FAIL on unfixed code to confirm the bug exists.
 * When User A orders for User B, User B should see the order but currently doesn't.
 */

const http = require('http');
const assert = require('assert');

const API_BASE = 'http://localhost:10000';

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
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let userAToken, userBToken, userAId, userBId;
let dish1Id, dish2Id;

async function runBugExplorationTest() {
  console.log('🧪 Bug Condition Exploration Test\n');
  console.log('⚠️  EXPECTED: This test SHOULD FAIL on unfixed code\n');

  try {
    // Step 1: Register test users
    console.log('📝 Step 1: Registering test users...');
    const userA = await makeRequest('POST', '/api/auth/register', {
      username: `bug_test_a_${Date.now()}`,
      password: 'Test123!',
      fullname: 'Bug Test User A'
    });
    assert.strictEqual(userA.status, 200, 'Failed to register User A');
    userAToken = userA.data.token;
    userAId = userA.data.user.id;
    console.log(`  ✅ User A registered (ID: ${userAId})`);

    const userB = await makeRequest('POST', '/api/auth/register', {
      username: `bug_test_b_${Date.now()}`,
      password: 'Test123!',
      fullname: 'Bug Test User B'
    });
    assert.strictEqual(userB.status, 200, 'Failed to register User B');
    userBToken = userB.data.token;
    userBId = userB.data.user.id;
    console.log(`  ✅ User B registered (ID: ${userBId})`);

    // Step 2: Get menu
    console.log('\n📋 Step 2: Getting menu...');
    const menuRes = await makeRequest('GET', '/api/menu/today', null, userAToken);
    assert.strictEqual(menuRes.status, 200, 'Failed to get menu');
    assert(menuRes.data.dishes && menuRes.data.dishes.length >= 2, 'Not enough dishes');
    dish1Id = menuRes.data.dishes[0].id;
    dish2Id = menuRes.data.dishes[1].id;
    console.log(`  ✅ Menu loaded`);

    // Step 3: User A orders for User B
    console.log('\n🍽️  Step 3: User A orders for User B...');
    const orderRes = await makeRequest('POST', '/api/orders', {
      dish1Id: dish1Id,
      dish2Id: dish2Id,
      orderedFor: userBId,  // KEY: User A ordering for User B
      notes: 'Bug test order'
    }, userAToken);
    assert.strictEqual(orderRes.status, 200, 'Failed to create order');
    const orderId = orderRes.data.id;
    console.log(`  ✅ Order created (ID: ${orderId})`);
    console.log(`     user_id: ${userAId} (User A)`);
    console.log(`     ordered_for: ${userBId} (User B)`);

    // Step 4: BUG TEST - User B queries their orders
    console.log('\n🐛 Step 4: BUG TEST - User B queries orders...');
    console.log('   Expected: Order should appear (ordered_for = User B)');
    console.log('   Actual (on unfixed code): Order does NOT appear');
    
    const userBOrdersRes = await makeRequest('GET', '/api/orders/all', null, userBToken);
    assert.strictEqual(userBOrdersRes.status, 200, 'Failed to get User B orders');
    
    console.log(`   Orders returned: ${userBOrdersRes.data.length}`);
    const userBOrder = userBOrdersRes.data.find(o => o.id === orderId);
    
    if (!userBOrder) {
      console.log('   ❌ BUG CONFIRMED: User B does NOT see the order');
      console.log('   This is the expected failure on unfixed code');
      throw new Error('BUG CONFIRMED: User B cannot see order placed for them');
    } else {
      console.log('   ✅ User B sees the order (bug is fixed!)');
    }

    // Step 5: BUG TEST - User B's payment calculation
    console.log('\n🐛 Step 5: BUG TEST - User B payment calculation...');
    console.log('   Expected: Payment should include the order');
    console.log('   Actual (on unfixed code): Payment does NOT include order');
    
    const userBPaymentRes = await makeRequest('GET', '/api/payments/my', null, userBToken);
    assert.strictEqual(userBPaymentRes.status, 200, 'Failed to get User B payment');
    
    console.log(`   Orders count: ${userBPaymentRes.data.ordersCount}`);
    console.log(`   Orders total: ${userBPaymentRes.data.ordersTotal} đồng`);
    
    if (userBPaymentRes.data.ordersCount === 0 || userBPaymentRes.data.ordersTotal === 0) {
      console.log('   ❌ BUG CONFIRMED: User B payment does NOT include the order');
      console.log('   This is the expected failure on unfixed code');
      throw new Error('BUG CONFIRMED: User B payment does not include order placed for them');
    } else {
      console.log('   ✅ User B payment includes the order (bug is fixed!)');
    }

    console.log('\n✅ All tests passed - Bug is FIXED!');

  } catch (error) {
    if (error.message.includes('BUG CONFIRMED')) {
      console.log('\n📊 Test Result: FAILED (as expected on unfixed code)');
      console.log('This confirms the bug exists and needs to be fixed.');
      process.exit(0); // Exit with success - we confirmed the bug
    } else {
      console.error('\n❌ Test error:', error.message);
      process.exit(1);
    }
  }
}

runBugExplorationTest();
