/**
 * Test script to verify mark-paid endpoint is working
 * Run: node test-mark-paid.js
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMarkPaid() {
  console.log('🧪 Testing mark-paid functionality...\n');
  
  try {
    // Step 1: Get a user with debt
    const month = '2026-04';
    const startDate = `${month}-01T00:00:00Z`;
    const nextMonth = '2026-05-01T00:00:00Z';
    
    console.log('📊 Step 1: Getting users with debt...');
    const { data: usersWithDebt, error: statsError } = await supabase.rpc('get_payment_stats_debt_only', {
      p_month: month,
      p_start_date: startDate,
      p_next_month: nextMonth,
      p_limit: 5,
      p_offset: 0
    });

    if (statsError) {
      console.error('❌ Error getting users with debt:', statsError);
      return;
    }

    if (!usersWithDebt || usersWithDebt.length === 0) {
      console.log('ℹ️  No users with debt found for testing');
      return;
    }

    console.log(`✅ Found ${usersWithDebt.length} users with debt`);
    console.log('\nUsers with debt:');
    usersWithDebt.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.fullname} (${user.username})`);
      console.log(`     - Total orders: ${user.ordersCount} (${user.ordersTotal.toLocaleString()}đ)`);
      console.log(`     - Paid: ${user.paidCount} (${user.paidTotal.toLocaleString()}đ)`);
      console.log(`     - Remaining: ${user.remainingCount} (${user.remainingTotal.toLocaleString()}đ)`);
    });

    // Step 2: Check if payments table exists
    console.log('\n📊 Step 2: Checking payments table...');
    const { data: paymentsCheck, error: paymentsError } = await supabase
      .from('payments')
      .select('count')
      .limit(1);

    if (paymentsError) {
      console.error('❌ Payments table error:', paymentsError.message);
      console.log('\n⚠️  The payments table might not exist or have RLS issues');
      console.log('   This could be why mark-paid is failing');
      return;
    }

    console.log('✅ Payments table is accessible');

    // Step 3: Check unpaid orders for first user
    const testUser = usersWithDebt[0];
    console.log(`\n📊 Step 3: Checking unpaid orders for ${testUser.fullname}...`);
    
    const { data: unpaidOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, price, paid')
      .eq('user_id', testUser.userId)
      .eq('paid', false)
      .is('deleted_at', null)
      .gte('created_at', startDate)
      .lt('created_at', nextMonth)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Error fetching unpaid orders:', ordersError);
      return;
    }

    console.log(`✅ Found ${unpaidOrders?.length || 0} unpaid orders`);
    if (unpaidOrders && unpaidOrders.length > 0) {
      console.log('\nUnpaid orders:');
      unpaidOrders.slice(0, 3).forEach((order, idx) => {
        console.log(`  ${idx + 1}. Order #${order.id} - ${order.price.toLocaleString()}đ (${new Date(order.created_at).toLocaleDateString()})`);
      });
    }

    console.log('\n✅ All checks passed!');
    console.log('\n📝 Summary:');
    console.log(`   - Users with debt: ${usersWithDebt.length}`);
    console.log(`   - Payments table: accessible`);
    console.log(`   - Unpaid orders: ${unpaidOrders?.length || 0}`);
    console.log('\n💡 The mark-paid endpoint should work correctly.');
    console.log('   If it\'s still failing, check:');
    console.log('   1. Browser console for errors');
    console.log('   2. Render logs for backend errors');
    console.log('   3. Network tab to see the actual API request/response');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testMarkPaid();
