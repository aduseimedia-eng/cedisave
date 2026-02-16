const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

// Check the latest registered user
pool.query(
  `SELECT id, name, email, phone, is_verified, phone_verified, created_at 
   FROM users 
   ORDER BY created_at DESC 
   LIMIT 1`,
  (err, res) => {
    if (err) {
      console.error('Error:', err.message);
      pool.end();
      return;
    }
    
    const user = res.rows[0];
    console.log('✅ Latest User:');
    console.log('  Email:', user.email);
    console.log('  Phone:', user.phone);
    console.log('  is_verified (email):', user.is_verified);
    console.log('  phone_verified:', user.phone_verified);
    console.log('  Created:', user.created_at);
    
    // Check latest phone verification record
    pool.query(
      `SELECT phone, otp, is_verified, verified_at 
       FROM phone_verification 
       WHERE phone = $1
       ORDER BY created_at DESC 
       LIMIT 1`,
      [user.phone],
      (err, res) => {
        if (err) {
          console.error('Phone verification error:', err.message);
          pool.end();
          return;
        }
        
        if (res.rows.length > 0) {
          const pv = res.rows[0];
          console.log('\n✅ Phone Verification Record:');
          console.log('  Phone:', pv.phone);
          console.log('  OTP Used:', pv.otp);
          console.log('  is_verified:', pv.is_verified);
          console.log('  Verified at:', pv.verified_at);
        }
        
        pool.end();
      }
    );
  }
);
