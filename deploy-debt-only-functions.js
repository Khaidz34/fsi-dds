/**
 * Deploy debt-only payment stats functions to Supabase
 * Run: node deploy-debt-only-functions.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFunctions() {
  console.log('🚀 Deploying debt-only payment stats functions to Supabase...\n');

  try {
    // Read SQL files
    const debtOnlySQL = fs.readFileSync('CREATE-PAYMENT-STATS-DEBT-ONLY.sql', 'utf8');
    const countSQL = fs.readFileSync('GET-DEBT-USERS-COUNT.sql', 'utf8');

    console.log('📄 Deploying get_payment_stats_debt_only function...');
    const { data: data1, error: error1 } = await supabase.rpc('exec_sql', { sql: debtOnlySQL });
    
    if (error1) {
      console.error('❌ Error deploying get_payment_stats_debt_only:', error1);
      console.log('\n⚠️  Trying direct execution...\n');
      
      // Try executing directly (this might not work with anon key)
      console.log('Please run this SQL manually in Supabase SQL Editor:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(debtOnlySQL);
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else {
      console.log('✅ get_payment_stats_debt_only deployed successfully\n');
    }

    console.log('📄 Deploying get_debt_users_count function...');
    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: countSQL });
    
    if (error2) {
      console.error('❌ Error deploying get_debt_users_count:', error2);
      console.log('\n⚠️  Trying direct execution...\n');
      
      console.log('Please run this SQL manually in Supabase SQL Editor:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(countSQL);
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else {
      console.log('✅ get_debt_users_count deployed successfully\n');
    }

    console.log('✅ Deployment complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. If you see errors above, copy the SQL and run it manually in Supabase SQL Editor');
    console.log('   2. Restart your backend server');
    console.log('   3. Test the admin payments page\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

deployFunctions();
