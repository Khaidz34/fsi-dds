/**
 * Check Khải Nguyễn's orders and payment status
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKhaiNguyen() {
  console.log('🔍 Checking Khải Nguyễn orders...\n');
  
  try {
    // Find Khải Nguyễn user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('fullname', '%Khải%')
      .single();

    if (userError || !user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Fullname: ${user.fullname}`);
    console.log(`   Username: ${user.username}`);

    // Get all orders for this user in April 2026
    const month = '2026-04';
    const startDate = `${month}-01T00:00:00Z`;
    const nextMonth = '2026-05-01T00:00:00Z';

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .or(`user_id.eq.${user.id},ordered_for.eq.${user.id}`)
      .is('deleted_at', null)
      .gte('created_at', startDate)
      .lt('created_at', nextMonth)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`\n📋 Orders in ${month}: ${orders?.length || 0}`);
    
    if (orders && orders.length > 0) {
      let totalOrders = 0;
      let totalPaid = 0;
      let paidCount = 0;
      let unpaidCount = 0;

      orders.forEach((order, idx) => {
        const isPaid = order.paid === true;
        const status = isPaid ? '✅ Paid' : '❌ Unpaid';
        console.log(`\n${idx + 1}. Order #${order.id}`);
        console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`);
        console.log(`   Price: ${order.price.toLocaleString()}đ`);
        console.log(`   Status: ${status}`);
        console.log(`   User ID: ${order.user_id}`);
        console.log(`   Ordered for: ${order.ordered_for}`);

        totalOrders += order.price;
        if (isPaid) {
          totalPaid += order.price;
          paidCount++;
        } else {
          unpaidCount++;
        }
      });

      console.log(`\n💰 Summary:`);
      console.log(`   Total orders: ${orders.length} (${totalOrders.toLocaleString()}đ)`);
      console.log(`   Paid: ${paidCount} (${totalPaid.toLocaleString()}đ)`);
      console.log(`   Unpaid: ${unpaidCount} (${(totalOrders - totalPaid).toLocaleString()}đ)`);
    }

    // Check payments table
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('paid_at', { ascending: false });

    if (!paymentsError && payments && payments.length > 0) {
      console.log(`\n💳 Payment history: ${payments.length} payments`);
      payments.forEach((payment, idx) => {
        console.log(`\n${idx + 1}. Payment #${payment.id}`);
        console.log(`   Amount: ${payment.amount.toLocaleString()}đ`);
        console.log(`   Paid at: ${new Date(payment.paid_at).toLocaleString()}`);
        console.log(`   Status: ${payment.status}`);
      });
    } else {
      console.log(`\n💳 No payment history found`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkKhaiNguyen();
