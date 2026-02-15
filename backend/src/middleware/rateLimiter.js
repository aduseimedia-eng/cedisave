const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for authentication endpoints
 * 5 requests per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Registration rate limiter
 * 3 registrations per hour from same IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later'
  },
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later'
  },
});

/**
 * Expense creation limiter (to prevent spam)
 * 50 expenses per 5 minutes
 */
const expenseCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
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
