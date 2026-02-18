const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true,
});

/**
 * Registration rate limiter
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 1000 : 5,
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later'
  },
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 1000 : 5,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later'
  },
});

/**
 * Expense creation limiter (to prevent spam)
 */
const expenseCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 10000 : 100,
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
