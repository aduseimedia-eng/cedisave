const express = require('express');
const router = express.Router();
const {
  sendEmailVerification,
  verifyEmailToken,
  resendEmailVerification
} = require('../controllers/emailController');
const { body, query, validationResult } = require('express-validator');

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * POST /email/send-verification
 * Send email verification link
 */
router.post(
  '/send-verification',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    handleValidationErrors
  ],
  sendEmailVerification
);

/**
 * GET /email/verify-token
 * Verify email with verification token/link
 */
router.get(
  '/verify-token',
  [
    query('token')
      .notEmpty().withMessage('Verification token is required'),
    handleValidationErrors
  ],
  verifyEmailToken
);

/**
 * POST /email/resend-verification
 * Resend email verification link
 */
router.post(
  '/resend-verification',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    handleValidationErrors
  ],
  resendEmailVerification
);

module.exports = router;
