#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'gourmetgrid.db');

console.log('🗄️  FSI-DDS Database Viewer');
console.log('📍 Database:', dbPath);
console.log('─'.repeat(50));

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Không thể mở database:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Đã kết nối database');
  showTables();
});

function showTables() {
  console.log('\n📊 THỐNG KÊ DATABASE:');
  
  const queries = [
    { name: 'Users', query: 'SELECT COUNT(*) as count FROM users' },
    { name: 'Menus', query: 'SELECT COUNT(*) as count FROM menus' },
    { name: 'Dishes', query: 'SELECT COUNT(*) as count FROM dishes' },
    { name: 'Orders', query: 'SELECT COUNT(*) as count FROM orders' },
    { name: 'Payments', query: 'SELECT COUNT(*) as count FROM payments' },
    { name: 'Feedback', query: 'SELECT COUNT(*) as count FROM feedback' }
  ];
  
  let completed = 0;
  const stats = {};
  
  queries.forEach(({ name, query }) => {
    db.get(query, (err, row) => {
      if (err) {
        stats[name] = 'Error';
      } else {
        stats[name] = row.count;
      }
      
      completed++;
      if (completed === queries.length) {
        displayStats(stats);
        showRecentData();
      }
    });
  });
}

function displayStats(stats) {
  Object.entries(stats).forEach(([table, count]) => {
    console.log(`  ${table.padEnd(10)}: ${count} records`);
  });
}

function showRecentData() {
  console.log('\n👥 USERS (Recent 5):');
  db.all('SELECT id, username, fullname, role, created_at FROM users ORDER BY id DESC LIMIT 5', (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.table(rows);
    }
    
    console.log('\n🍽️  RECENT ORDERS (Last 10):');
    db.all(`
      SELECT 
        o.id,
        u1.fullname as orderer,
        u2.fullname as receiver,
        d1.name as dish1,
        d2.name as dish2,
        o.created_at
      FROM orders o
      LEFT JOIN users u1 ON o.ordered_by = u1.id
      LEFT JOIN users u2 ON o.ordered_for = u2.id
      LEFT JOIN dishes d1 ON o.dish1_id = d1.id
      LEFT JOIN dishes d2 ON o.dish2_id = d2.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `, (err, rows) => {
      if (err) {
        console.error('Error:', err.message);
      } else {
        console.table(rows);
      }
      
      console.log('\n📅 RECENT MENUS (Last 5):');
      db.all('SELECT id, date, image_url, created_at FROM menus ORDER BY date DESC LIMIT 5', (err, rows) => {
        if (err) {
          console.error('Error:', err.message);
        } else {
          console.table(rows);
        }
        
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('\n✅ Database connection closed');
          }
        });
      });
    });
  });
}