const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        return res.status(403).json({
          success: false,
          message: 'Invalid token'
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };

      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        req.user = null;
      } else {
        req.user = {
          id: decoded.userId,
          email: decoded.email
        };
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Generate access token
 */
const generateToken = (userId, email) => {
  return jwt.sign(
    {
      userId,
      email
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience
    }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiresIn
    }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
