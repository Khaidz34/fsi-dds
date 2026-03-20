#!/usr/bin/env node

/**
 * Cleanup Test Users Script
 * Usage: node backend/cleanup-test-users.js
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

const API_URL = process.env.API_URL || 'https://fsi-dds.foodorder';
const NUM_USERS = 30;

// Helper function to make HTTP requests
const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

// Login as admin to get admin token
const getAdminToken = async () => {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (response.status === 200) {
      return response.data.token;
    } else {
      console.log('Failed to login as admin');
      return null;
    }
  } catch (err) {
    console.log('Error logging in as admin:', err.message);
    return null;
  }
};

// Get all users
const getAllUsers = async (adminToken) => {
  try {
    const response = await makeRequest('GET', '/api/users', null, adminToken);
    if (response.status === 200) {
      return response.data;
    } else {
      console.log('Failed to get users');
      return [];
    }
  } catch (err) {
    console.log('Error getting users:', err.message);
    return [];
  }
};

// Delete test users
const deleteTestUsers = async (adminToken, users) => {
  let deletedCount = 0;
  
  for (const user of users) {
    if (user.username && user.username.startsWith('testuser')) {
      try {
        const response = await makeRequest('DELETE', `/api/users/${user.id}`, null, adminToken);
        if (response.status === 200) {
          console.log(`✓ Deleted: ${user.username}`);
          deletedCount++;
        } else {
          console.log(`✗ Failed to delete: ${user.username} (${response.status})`);
        }
      } catch (err) {
        console.log(`✗ Error deleting ${user.username}: ${err.message}`);
      }
    }
  }
  
  return deletedCount;
};

// Main execution
const cleanupTestUsers = async () => {
  console.log('🧹 Cleaning up test users...');
  console.log(`API URL: ${API_URL}`);

  // Login as admin
  console.log('\n🔑 Logging in as admin...');
  const adminToken = await getAdminToken();
  if (!adminToken) {
    console.log('❌ Failed to get admin token. Cannot cleanup.');
    return;
  }
  console.log('✓ Admin login successful');

  // Get all users
  console.log('\n📋 Getting all users...');
  const users = await getAllUsers(adminToken);
  console.log(`Found ${users.length} total users`);

  // Filter and delete test users
  const testUsers = users.filter(user => user.username && user.username.startsWith('testuser'));
  console.log(`Found ${testUsers.length} test users to delete`);

  if (testUsers.length === 0) {
    console.log('✅ No test users found. Database is clean.');
    return;
  }

  console.log('\n🗑️ Deleting test users...');
  const deletedCount = await deleteTestUsers(adminToken, testUsers);

  console.log('\n' + '='.repeat(50));
  console.log('📊 CLEANUP RESULTS');
  console.log('='.repeat(50));
  console.log(`Total test users found: ${testUsers.length}`);
  console.log(`Successfully deleted: ${deletedCount}`);
  console.log(`Failed to delete: ${testUsers.length - deletedCount}`);
  
  if (deletedCount === testUsers.length) {
    console.log('✅ All test users cleaned up successfully!');
  } else {
    console.log('⚠️ Some test users could not be deleted');
  }
  console.log('='.repeat(50));
};

cleanupTestUsers().catch(console.error);