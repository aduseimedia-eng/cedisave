const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

// Check if phone_verified column exists
pool.query(
  `SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'phone_verified'`,
  (err, res) => {
    if (err) {
      console.error('Error:', err.message);
      pool.end();
      return;
    }

    if (res.rows.length > 0) {
      console.log('✅ phone_verified column EXISTS');
      pool.end();
    } else {
      console.log('❌ phone_verified column MISSING - Adding it now...');
      
      // Add the missing column
      pool.query(
        'ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE',
        (err, res) => {
          if (err) {
            if (err.message.includes('already exists')) {
              console.log('✅ phone_verified column already exists');
            } else {
              console.error('Error adding column:', err.message);
            }
          } else {
            console.log('✅ phone_verified column ADDED successfully');
          }
          pool.end();
        }
      );
    }
  }
);
