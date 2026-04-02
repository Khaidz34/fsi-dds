/**
 * Deploy script for cumulative debt fix
 * This script deploys the updated get_payment_stats function to Supabase
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
  console.log('🚀 Deploying cumulative debt fix...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'DROP-AND-CREATE-PAYMENT-STATS.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 SQL content preview:');
    console.log(sqlContent.substring(0, 200) + '...\n');
    
    // Split SQL into statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Try to execute using raw SQL query
      const { data, error } = await supabase.rpc('exec', { sql: statement });
      
      if (error) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, error.message);
        console.log('\n📝 MANUAL DEPLOYMENT REQUIRED:\n');
        console.log('The automated deployment failed. Please deploy manually:');
        console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy the content from: DROP-AND-CREATE-PAYMENT-STATS.sql');
        console.log('4. Paste and run in SQL Editor');
        console.log('5. Then run: node test-cumulative-debt-bug.js\n');
        process.exit(1);
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }
    
    console.log('\n🎉 Deployment complete!\n');
    console.log('Next steps:');
    console.log('1. Run: node test-cumulative-debt-bug.js (should now PASS)');
    console.log('2. Run: node test-cumulative-debt-preservation.js (should still PASS)\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n📝 MANUAL DEPLOYMENT REQUIRED:\n');
    console.log('The automated deployment failed. Please deploy manually:');
    console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the content from: DROP-AND-CREATE-PAYMENT-STATS.sql');
    console.log('4. Paste and run in SQL Editor');
    console.log('5. Then run: node test-cumulative-debt-bug.js\n');
    process.exit(1);
  }
}

deployFunction();
