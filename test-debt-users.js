/**
 * Test script to check users with debt in database
 * Run: node test-debt-users.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in backend/.env');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDebtUsers() {
  console.log('🔍 Checking users with debt in database...\n');
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  console.log(`📅 Current month: ${currentMonth}\n`);

  try {
    // First, check the orders table schema
    console.log('📋 Checking orders table schema...\n');
    const { data: sampleOrder, error: schemaError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
      .single();

    if (schemaError) {
      console.error('❌ Error fetching sample order:', schemaError);
    } else if (sampleOrder) {
      console.log('✅ Sample order columns:', Object.keys(sampleOrder));
      console.log('   Sample data:', sampleOrder);
      console.log('');
    }

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, fullname, username')
      .order('fullname');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`👥 Total users in database: ${users.length}\n`);

    // For each user, calculate their debt
    const usersWithDebt = [];
    
    for (const user of users) {
      // Get orders for current month - use correct date range
      const nextMonth = new Date(currentMonth + '-01');
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().slice(0, 7);
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${currentMonth}-01`)
        .lt('created_at', `${nextMonthStr}-01`)
        .is('deleted_at', null); // Only non-deleted orders

      if (ordersError) {
        console.error(`❌ Error fetching orders for ${user.fullname}:`, ordersError);
        continue;
      }

      if (!orders || orders.length === 0) {
        continue;
      }

      // Calculate totals - price column and paid boolean
      const ordersTotal = orders.reduce((sum, order) => {
        return sum + (order.price || 0);
      }, 0);
      
      const paidTotal = orders.reduce((sum, order) => {
        // If paid is true, add the price to paid total
        return sum + (order.paid ? (order.price || 0) : 0);
      }, 0);
      
      const remainingTotal = ordersTotal - paidTotal;

      if (remainingTotal > 0) {
        usersWithDebt.push({
          userId: user.id,
          fullname: user.fullname,
          username: user.username,
          ordersCount: orders.length,
          ordersTotal,
          paidTotal,
          remainingTotal
        });
      }
    }

    console.log(`💰 Users with debt: ${usersWithDebt.length}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (usersWithDebt.length === 0) {
      console.log('✅ No users with debt found!\n');
      return;
    }

    // Sort by debt amount (highest first)
    usersWithDebt.sort((a, b) => b.remainingTotal - a.remainingTotal);

    // Display all users with debt
    usersWithDebt.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullname} (@${user.username})`);
      console.log(`   User ID: ${user.userId}`);
      console.log(`   Orders: ${user.ordersCount}`);
      console.log(`   Total: ${user.ordersTotal.toLocaleString()}đ`);
      console.log(`   Paid: ${user.paidTotal.toLocaleString()}đ`);
      console.log(`   💸 DEBT: ${user.remainingTotal.toLocaleString()}đ`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📊 Summary:`);
    console.log(`   Total users with debt: ${usersWithDebt.length}`);
    console.log(`   Total debt amount: ${usersWithDebt.reduce((sum, u) => sum + u.remainingTotal, 0).toLocaleString()}đ`);
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDebtUsers();
