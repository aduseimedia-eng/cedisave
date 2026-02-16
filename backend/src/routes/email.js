const express = require('express');
const router = express.Router();
const {
  sendEmailVerification,
  verifyEmailOTP,
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
 * Send email verification (OTP or Link)
 */
router.post(
  '/send-verification',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('verificationType')
      .optional()
      .trim()
      .isIn(['otp', 'link']).withMessage('verficationType must be "otp" or "link"'),
    handleValidationErrors
  ],
  sendEmailVerification
);

/**
 * POST /email/verify-otp
 * Verify email with OTP code
 */
router.post(
  '/verify-otp',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    handleValidationErrors
  ],
  verifyEmailOTP
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
 * POST /email/resend
 * Resend email verification
 */
router.post(
  '/resend',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('verificationType')
      .optional()
      .trim()
      .isIn(['otp', 'link']).withMessage('verificationType must be "otp" or "link"'),
    handleValidationErrors
  ],
  resendEmailVerification
);

module.exports = router;
