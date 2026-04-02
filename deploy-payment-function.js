require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.error('SUPABASE_KEY:', supabaseKey ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFunction() {
  try {
    console.log('📦 Reading SQL function...');
    const sql = fs.readFileSync('CREATE-PAYMENT-STATS-FUNCTION.sql', 'utf8');
    
    console.log('🚀 Deploying get_payment_stats function to Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Deployment failed:', error);
      console.log('\n📝 Manual deployment required:');
      console.log('1. Go to: https://supabase.com/dashboard/project/bsmylhwyfmzbqnytnhzh/sql');
      console.log('2. Copy content from CREATE-PAYMENT-STATS-FUNCTION.sql');
      console.log('3. Paste and run in SQL Editor');
      process.exit(1);
    }
    
    console.log('✅ Function deployed successfully!');
    
    // Test the function
    console.log('\n🧪 Testing function...');
    const testMonth = new Date().toISOString().slice(0, 7);
    const { data: testData, error: testError } = await supabase.rpc('get_payment_stats', {
      p_month: testMonth,
      p_start_date: `${testMonth}-01T00:00:00Z`,
      p_next_month: `${testMonth}-31T23:59:59Z`,
      p_limit: 5,
      p_offset: 0
    });
    
    if (testError) {
      console.error('❌ Test failed:', testError);
    } else {
      console.log('✅ Function test passed!');
      console.log('Sample data:', testData);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📝 Manual deployment required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/bsmylhwyfmzbqnytnhzh/sql');
    console.log('2. Copy content from CREATE-PAYMENT-STATS-FUNCTION.sql');
    console.log('3. Paste and run in SQL Editor');
  }
}

deployFunction();
