const http = require('http');
const { Pool } = require('pg');

// First, get a user and their token
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

pool.query(
  'SELECT id, email FROM users ORDER BY created_at DESC LIMIT 1',
  async (err, res) => {
    if (err) {
      console.error('Error getting user:', err.message);
      pool.end();
      return;
    }

    if (res.rows.length === 0) {
      console.log('❌ No users found');
      pool.end();
      return;
    }

    const user = res.rows[0];
    console.log('Testing with user:', user.email);
    pool.end();

    // Generate a test token (in real scenario, user would have JWT token)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev_jwt_secret_key_smartmoneygh_2026_change_in_prod',
      { expiresIn: '7d' }
    );

    // Test create expense
    const expenseData = JSON.stringify({
      amount: 50.00,
      category: 'Food',
      payment_method: 'Cash',
      expense_date: '2026-02-16',
      note: 'Test expense',
      is_recurring: false,
      recurring_frequency: null
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

    console.log('\n📝 Testing POST /api/v1/expenses...');
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        const data = JSON.parse(body);
        console.log('Response:', JSON.stringify(data, null, 2));
      });
    });

    req.on('error', err => {
      console.error('Error:', err);
    });

    req.write(expenseData);
    req.end();
  }
);
