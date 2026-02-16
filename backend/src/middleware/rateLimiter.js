const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 10000 requests per 15 minutes (disabled for development)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for authentication endpoints
 * 1000 requests per 15 minutes (disabled for development)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Registration rate limiter
 * 1000 registrations per hour (disabled for development)
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later'
  },
});

/**
 * Password reset rate limiter
 * 1000 requests per hour (disabled for development)
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later'
  },
});

/**
 * Expense creation limiter (to prevent spam)
 * 10000 expenses per 5 minutes (disabled for development)
 */
const expenseCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10000,
  message: {
    success: false,
    message: 'Too many expense entries, please slow down'
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  expenseCreationLimiter
};
