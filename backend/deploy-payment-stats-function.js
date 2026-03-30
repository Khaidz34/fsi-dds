/**
 * Deploy script for get_payment_stats PostgreSQL function
 * This script attempts to create the function programmatically
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFunction() {
  console.log('🚀 Deploying get_payment_stats function...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'CREATE-PAYMENT-STATS-FUNCTION.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 Attempting to create function...\n');
    
    // Try to execute the SQL
    // Note: This may not work with anon key - requires service role key or manual deployment
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Failed to create function via RPC:', error.message);
      console.log('\n📝 MANUAL DEPLOYMENT REQUIRED:\n');
      console.log('1. Open your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy the content from: CREATE-PAYMENT-STATS-FUNCTION.sql');
      console.log('4. Paste and run in SQL Editor');
      console.log('5. Then run: node test-payment-stats-function.js\n');
      process.exit(1);
    }
    
    console.log('✅ Function created successfully!');
    console.log('\n🧪 Testing function...\n');
    
    // Test the function
    const { data: testData, error: testError } = await supabase.rpc('get_payment_stats', {
      p_month: '2024-01',
      p_start_date: '2024-01-01T00:00:00',
      p_next_month: '2024-02-01T00:00:00',
      p_limit: 5,
      p_offset: 0
    });
    
    if (testError) {
      console.error('❌ Function test failed:', testError.message);
      process.exit(1);
    }
    
    console.log(`✅ Function test successful! Returned ${testData?.length || 0} results`);
    console.log('\n🎉 Deployment complete!\n');
    console.log('Next steps:');
    console.log('1. Run: node test-n-plus-one-bug.js (should now PASS)');
    console.log('2. Run: node test-n-plus-one-preservation.js (should still PASS)\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n📝 MANUAL DEPLOYMENT REQUIRED:\n');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the content from: CREATE-PAYMENT-STATS-FUNCTION.sql');
    console.log('4. Paste and run in SQL Editor');
    console.log('5. Then run: node test-payment-stats-function.js\n');
    process.exit(1);
  }
}

deployFunction();
