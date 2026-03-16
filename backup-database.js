#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database paths
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'gourmetgrid.db');
const backupDir = path.join(__dirname, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

console.log('🗄️  Database Backup Tool');
console.log('📍 Source:', dbPath);
console.log('📁 Backup:', backupPath);
console.log('─'.repeat(50));

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('📁 Created backup directory');
}

// Check if source database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Source database not found:', dbPath);
  process.exit(1);
}

// Copy database file
try {
  fs.copyFileSync(dbPath, backupPath);
  console.log('✅ Database backup created successfully');
  
  // Verify backup
  const db = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Backup verification failed:', err.message);
      process.exit(1);
    }
    
    // Count records in backup
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        console.error('❌ Error reading backup:', err.message);
      } else {
        console.log(`📊 Backup contains ${row.count} users`);
      }
      
      db.close();
      console.log('✅ Backup verification completed');
    });
  });
  
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}