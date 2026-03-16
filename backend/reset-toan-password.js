require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'gourmetgrid.db');
const db = new sqlite3.Database(dbPath);

const username = 'Toàn';
const newPassword = 'password'; // Mật khẩu mặc định

console.log('🔐 Đang reset mật khẩu cho user Toàn...\n');

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
      console.log(`✅ Đã reset mật khẩu cho user: ${username}`);
      console.log(`🔑 Username: ${username}`);
      console.log(`🔑 Password: ${newPassword}`);
      console.log('\n💡 Bạn có thể đăng nhập với thông tin trên');
    }
    
    db.close();
  }
);
