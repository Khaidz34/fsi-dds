require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🧪 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '✅ Present' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📊 Testing database connection...');
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
      return false;
    }
    
    console.log(`✅ Users table: ${users} records`);
    
    // Test other tables
    const tables = ['menus', 'dishes', 'orders', 'payments', 'feedback'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ ${table} table error:`, error.message);
      } else {
        console.log(`✅ ${table} table: ${data} records`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase connection test successful!');
  } else {
    console.log('\n💥 Supabase connection test failed!');
    console.log('📝 Make sure to run SUPABASE-SETUP.sql in your Supabase dashboard');
  }
  process.exit(success ? 0 : 1);
});