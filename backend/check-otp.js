const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

pool.query(
  `SELECT phone, otp, is_verified, created_at, expires_at 
   FROM phone_verification 
   WHERE phone = '233501234567' 
   ORDER BY created_at DESC LIMIT 3`,
  (err, res) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('✅ OTPs Found:', JSON.stringify(res.rows, null, 2));
    }
    pool.end();
  }
);
