require('dotenv').config();

// Fail fast if JWT secrets are not configured
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set');
  process.exit(1);
}

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Token generation options
  options: {
    issuer: 'smart-money-gh',
    audience: 'smart-money-gh-users'
  }
};
