// Test script to check /api/payments/history endpoint
const https = require('https');

const testEndpoint = (month) => {
  const url = month 
    ? `https://fsi-dds.onrender.com/api/payments/history?month=${month}`
    : 'https://fsi-dds.onrender.com/api/payments/history';
  
  console.log(`\n🔍 Testing: ${url}`);
  
  https.get(url, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
    }
  }, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        const parsed = JSON.parse(data);
        console.log(`✅ Success: ${parsed.length} payments`);
      } else {
        console.log(`❌ Error: ${data}`);
      }
    });
  }).on('error', (err) => {
    console.error(`❌ Request error: ${err.message}`);
  });
};

// Test without month
testEndpoint();

// Test with month
setTimeout(() => testEndpoint('2026-04'), 1000);
