const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

// Get table schema
pool.query(
  `SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   ORDER BY ordinal_position`,
  (err, res) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('✅ Users Table Schema:');
      console.table(res.rows);
    }
    pool.end();
  }
);
