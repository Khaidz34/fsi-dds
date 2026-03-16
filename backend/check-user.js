require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'gourmetgrid.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Đang kiểm tra thông tin user...\n');

db.all('SELECT id, username, fullname, role FROM users', [], (err, rows) => {
  if (err) {
    console.error('❌ Lỗi:', err);
    return;
  }
  
  console.log('📋 Danh sách tất cả users:\n');
  rows.forEach(user => {
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Fullname: ${user.fullname}`);
    console.log(`Role: ${user.role}`);
    console.log('---');
  });
  
  // Tìm user Toàn
  const toanUser = rows.find(u => u.fullname.toLowerCase().includes('toàn') || u.username.toLowerCase().includes('toan'));
  
  if (toanUser) {
    console.log('\n✅ Tìm thấy user Toàn:');
    console.log(`Username: ${toanUser.username}`);
    console.log(`Fullname: ${toanUser.fullname}`);
    console.log(`Role: ${toanUser.role}`);
    console.log('\n💡 Để reset mật khẩu, chạy: node backend/reset-user-password.js');
  } else {
    console.log('\n⚠️  Không tìm thấy user có tên Toàn');
  }
  
  db.close();
});
