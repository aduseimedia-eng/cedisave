require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkTables() {
  try {
    const res = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    console.log('Tables in Railway DB:');
    res.rows.forEach(t => console.log('  -', t.tablename));
    console.log('\nTotal:', res.rows.length, 'tables');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

checkTables();
