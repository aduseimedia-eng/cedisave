const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  registerValidation, 
  loginValidation,
  passwordResetValidation,
  passwordChangeValidation
} = require('../middleware/validation');
const { 
  authLimiter, 
  registerLimiter, 
  passwordResetLimiter 
} = require('../middleware/rateLimiter');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerLimiter, registerValidation, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, authController.login);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile and preferences
 * @access  Private
 */
router.put('/profile', authenticateToken, authController.updateProfile);

/**
 * @route   POST /api/v1/auth/request-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/request-reset', passwordResetLimiter, passwordResetValidation, authController.requestPasswordReset);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', passwordChangeValidation, authController.resetPassword);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (logged in user)
 * @access  Private
 */
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
