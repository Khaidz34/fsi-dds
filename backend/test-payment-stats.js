require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('=== Testing Payment Stats ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Configured' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentStats() {
  try {
    const month = '2026-04';
    const startDate = `${month}-01T00:00:00Z`;
    const nextMonth = `${month}-30T23:59:59Z`;
    
    console.log('\n1️⃣ Testing get_payment_stats function...');
    console.log('Parameters:', { month, startDate, nextMonth, limit: 10, offset: 0 });
    
    const { data: statsData, error: statsError } = await supabase.rpc('get_payment_stats', {
      p_month: month,
      p_start_date: startDate,
      p_next_month: nextMonth,
      p_limit: 10,
      p_offset: 0
    });
    
    if (statsError) {
      console.error('❌ Function error:', statsError);
      console.log('\n📝 Function might not exist. Checking...');
    } else {
      console.log('✅ Function works!');
      console.log('Returned data:', JSON.stringify(statsData, null, 2));
    }
    
    console.log('\n2️⃣ Testing direct users query...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, fullname, username, role')
      .eq('role', 'user')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      console.log('✅ Users found:', users.length);
      console.log('Sample users:', JSON.stringify(users, null, 2));
    }
    
    console.log('\n3️⃣ Testing orders query...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, ordered_for, price, paid, created_at')
      .gte('created_at', startDate)
      .lt('created_at', nextMonth)
      .is('deleted_at', null)
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Orders query error:', ordersError);
    } else {
      console.log('✅ Orders found:', orders.length);
      console.log('Sample orders:', JSON.stringify(orders, null, 2));
    }
    
    console.log('\n4️⃣ Testing payments query...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, user_id, amount, created_at')
      .gte('created_at', startDate)
      .lt('created_at', nextMonth)
      .limit(5);
    
    if (paymentsError) {
      console.error('❌ Payments query error:', paymentsError);
    } else {
      console.log('✅ Payments found:', payments.length);
      console.log('Sample payments:', JSON.stringify(payments, null, 2));
    }
    
    console.log('\n5️⃣ Testing payment history query...');
    const { data: history, error: historyError } = await supabase
      .from('payments')
      .select(`
        *,
        user:user_id (id, fullname)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (historyError) {
      console.error('❌ Payment history error:', historyError);
    } else {
      console.log('✅ Payment history found:', history.length);
      console.log('Sample history:', JSON.stringify(history, null, 2));
    }
    
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

testPaymentStats();
