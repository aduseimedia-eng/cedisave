const { pool } = require('./src/config/database');
require('dotenv').config();

async function check() {
  const r1 = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'bill_reminders' ORDER BY ordinal_position"
  );
  console.log('bill_reminders columns:', r1.rows.map(r => r.column_name));

  const r2 = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'savings_challenges' ORDER BY ordinal_position"
  );
  console.log('savings_challenges columns:', r2.rows.map(r => r.column_name));

  await pool.end();
}
check();
