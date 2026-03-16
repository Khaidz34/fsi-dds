require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'gourmetgrid.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Reset mật khẩu user\n');

rl.question('Nhập username cần reset: ', (username) => {
  if (!username) {
    console.log('❌ Username không được để trống');
    rl.close();
    db.close();
    return;
  }
  
  rl.question('Nhập mật khẩu mới: ', (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Mật khẩu phải có ít nhất 6 ký tự');
      rl.close();
      db.close();
      return;
    }
    
    // Hash password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Update password
    db.run(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username],
      function(err) {
        if (err) {
          console.error('❌ Lỗi:', err);
        } else if (this.changes === 0) {
          console.log(`❌ Không tìm thấy user: ${username}`);
        } else {
          console.log(`\n✅ Đã reset mật khẩu cho user: ${username}`);
          console.log(`🔑 Mật khẩu mới: ${newPassword}`);
        }
        
        rl.close();
        db.close();
      }
    );
  });
});
