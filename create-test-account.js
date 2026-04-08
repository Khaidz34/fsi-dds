/**
 * Script to create a test account for local development
 * Usage: node create-test-account.js
 */

import http from 'http';

const testAccount = {
  username: 'testuser',
  password: 'Test@123456',
  fullname: 'Test User'
};

const postData = JSON.stringify(testAccount);

const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Creating test account...');
console.log('Username:', testAccount.username);
console.log('Password:', testAccount.password);
console.log('Full Name:', testAccount.fullname);
console.log('');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('\n✅ Test account created successfully!');
      console.log('\nYou can now login with:');
      console.log('  Username:', testAccount.username);
      console.log('  Password:', testAccount.password);
    } else {
      console.log('\n❌ Failed to create account');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.error('\nMake sure the backend server is running on port 10000');
  console.error('Run: npm run dev (in the root directory)');
});

req.write(postData);
req.end();
