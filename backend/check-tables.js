const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_money_gh',
  user: 'postgres',
  password: '6669'
});

pool.query(
  `SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name`,
  (err, res) => {
    if (err) {
      console.error('Error:', err.message);
      pool.end();
      return;
    }
    
    console.log('✅ Tables in database:');
    const tables = res.rows.map(r => r.table_name);
    tables.forEach(t => console.log('  -', t));
    
    // Check for specific tables
    console.log('\n📋 Checking critical tables:');
    console.log('  streaks:', tables.includes('streaks') ? '✅' : '❌');
    console.log('  user_xp:', tables.includes('user_xp') ? '✅' : '❌');
    console.log('  badges:', tables.includes('badges') ? '✅' : '❌');
    
    pool.end();
  }
);
