/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // PostgreSQL specific errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        status = 409;
        message = 'Resource already exists';
        if (err.constraint) {
          if (err.constraint.includes('email')) {
            message = 'Email already registered';
          } else if (err.constraint.includes('phone')) {
            message = 'Phone number already registered';
          }
        }
        break;
      
      case '23503': // Foreign key violation
        status = 400;
        message = 'Invalid reference to related resource';
        break;
      
      case '23502': // Not null violation
        status = 400;
        message = 'Required field missing';
        break;
      
      case '22P02': // Invalid text representation
        status = 400;
        message = 'Invalid data format';
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  }

  // Send error response
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
