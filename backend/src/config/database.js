const { Pool } = require('pg');

// Only load .env in development (don't let it interfere with Railway env vars)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// PostgreSQL connection pool configuration
// Supports DATABASE_URL (Railway/Render) and individual DB_* variables (local)
const isRailway = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('.railway.internal');

let poolConfig;
if (process.env.DATABASE_URL) {
  if (isRailway) {
    // For Railway internal networking, use explicit host/port
    const dbUrl = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 5432,
      database: dbUrl.pathname.slice(1),
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      ssl: false, // Railway internal doesn't need SSL
    };
  } else {
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool({
  ...poolConfig,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Query helper with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get a client from the pool for complex operations
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  pool,
  query,
  transaction,
  getClient
};
