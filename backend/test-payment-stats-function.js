/**
 * Test script to verify the get_payment_stats PostgreSQL function
 * Run this AFTER deploying CREATE-PAYMENT-STATS-FUNCTION.sql to Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  console.log('🧪 Testing get_payment_stats function...\n');
  
  try {
    const month = '2024-01';
    const startDate = `${month}-01T00:00:00`;
    const nextMonth = '2024-02-01T00:00:00';
    
    console.log('📊 Calling get_payment_stats RPC...');
    console.log(`   Month: ${month}`);
    console.log(`   Start Date: ${startDate}`);
    console.log(`   Next Month: ${nextMonth}`);
    console.log(`   Limit: 10, Offset: 0\n`);
    
    const { data, error } = await supabase.rpc('get_payment_stats', {
      p_month: month,
      p_start_date: startDate,
      p_next_month: nextMonth,
      p_limit: 10,
      p_offset: 0
    });
    
    if (error) {
      console.error('❌ RPC call failed:', error);
      console.error('\n📝 Make sure to run CREATE-PAYMENT-STATS-FUNCTION.sql in your Supabase SQL Editor');
      process.exit(1);
    }
    
    console.log('✅ RPC call successful!\n');
    console.log(`📈 Results: ${data?.length || 0} users returned\n`);
    
    if (data && data.length > 0) {
      console.log('Sample result (first user):');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Verify all required fields are present
      const requiredFields = [
        'userId', 'fullname', 'username', 'month',
        'ordersCount', 'ordersTotal', 'paidCount', 'paidTotal',
        'remainingCount', 'remainingTotal', 'overpaidTotal'
      ];
      
      const missingFields = requiredFields.filter(field => !(field in data[0]));
      
      if (missingFields.length > 0) {
        console.error('\n❌ Missing required fields:', missingFields);
        process.exit(1);
      }
      
      console.log('\n✅ All required fields present');
    } else {
      console.log('⚠️  No data returned (this is OK if there are no users in the database)');
    }
    
    console.log('\n🎉 Function test successful!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFunction();
