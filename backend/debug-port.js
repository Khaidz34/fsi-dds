const net = require('net');

const PORT = process.env.PORT || 10000;

console.log('🔍 Debugging Port Issues');
console.log('📋 Process ID:', process.pid);
console.log('🌐 Target Port:', PORT);

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      console.log(`✅ Port ${port} is available`);
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', (err) => {
      console.log(`❌ Port ${port} is NOT available:`, err.code);
      resolve(false);
    });
  });
}

async function debugPorts() {
  console.log('\n🔍 Checking port availability...');
  
  // Check main port
  await checkPort(PORT);
  
  // Check nearby ports
  for (let i = 1; i <= 5; i++) {
    await checkPort(PORT + i);
  }
  
  console.log('\n📊 Port check complete');
}

debugPorts();