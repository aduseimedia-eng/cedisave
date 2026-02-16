const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

pool.query(
  `SELECT phone, otp, is_verified, verified_at 
   FROM phone_verification 
   WHERE phone = '233991999888'`,
  (err, res) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('✅ Phone Verification Record:');
      console.table(res.rows);
    }
    pool.end();
  }
);
