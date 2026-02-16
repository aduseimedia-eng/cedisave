const http = require('http');
const fs = require('fs');
require('dotenv').config();

// First, let me get a test user's JWT token
const { query } = require('./src/config/database');

async function testCreateGoal() {
  try {
    // Get a test user
    const userResult = await query('SELECT id FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('No users found. Please create a user first.');
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log('Using user ID:', userId);

    // Create a JWT token for testing
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: userId, email: 'test@example.com' },
      'dev_jwt_secret_key_smartmoneygh_2026_change_in_prod',
      { expiresIn: '1h' }
    );

    console.log('\nTesting goal creation...');

    // Test 1: Create a goal via API
    const goalData = {
      title: 'Test Laptop',
      target_amount: 5000,
      deadline: '2026-12-31'
    };

    console.log('\nRequest body:', JSON.stringify(goalData, null, 2));

    const postData = JSON.stringify(goalData);
    
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/goals',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\nResponse Status:', res.statusCode);
        try {
          const json = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(json, null, 2));
          
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('\n✅ Goal created successfully!');
          } else {
            console.log('\n❌ Failed to create goal');
          }
        } catch (e) {
          console.log('Response:', data);
        }
        process.exit(0);
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      process.exit(1);
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
}

// Wait a moment to ensure server is ready
setTimeout(testCreateGoal, 1000);
