require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const sql = `
  CREATE TABLE IF NOT EXISTS phone_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
  );
`;

pool.query(sql)
  .then(() => {
    console.log('✅ phone_verification table created successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
