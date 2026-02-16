require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'smart_money_gh',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '6669'
});

pool.query(
  'SELECT id, email FROM users WHERE phone_verified = true ORDER BY created_at DESC LIMIT 1',
  (err, res) => {
    if (err) {
      console.error('❌ DB Error:', err.message);
      pool.end();
      return;
    }

    if (res.rows.length === 0) {
      console.log('❌ No verified users');
      pool.end();
      return;
    }

    const user = res.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev_jwt_secret_key_smartmoneygh_2026_change_in_prod',
      { expiresIn: '7d' }
    );

    pool.end();

    // Test data matching what the frontend sends
    const expenseData = JSON.stringify({
      amount: 50.00,
      category: 'Food / Chop Bar',
      payment_method: 'Cash',
      expense_date: '2026-02-16'
      // NO note, NO is_recurring, NO recurring_frequency
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/expenses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': expenseData.length
      }
    };

    console.log('📝 Testing expense with exact data:');
    console.log(JSON.parse(expenseData));
    console.log('\n');

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const data = JSON.parse(body);
          console.log('Response:', JSON.stringify(data, null, 2));
          if (data.errors) {
            console.log('\n❌ Validation Errors:');
            data.errors.forEach(e => console.log('  -', e.message));
          }
        } catch (e) {
          console.log('Response:', body);
        }
      });
    });

    req.on('error', err => console.error('❌ Request error:', err.message));
    req.write(expenseData);
    req.end();
  }
);
