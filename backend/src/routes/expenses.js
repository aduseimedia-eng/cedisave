const express = require('express');
const router = express.Router();

const expenseController = require('../controllers/expenseController');
const { authenticateToken } = require('../middleware/auth');
const { 
  expenseValidation, 
  uuidParamValidation,
  dateRangeValidation
} = require('../middleware/validation');
const { expenseCreationLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/v1/expenses
 * @desc    Create new expense
 * @access  Private
 */
router.post('/', authenticateToken, expenseCreationLimiter, expenseValidation, expenseController.createExpense);

/**
 * @route   GET /api/v1/expenses
 * @desc    Get all user expenses with filters
 * @access  Private
 */
router.get('/', authenticateToken, dateRangeValidation, expenseController.getExpenses);

/**
 * @route   GET /api/v1/expenses/summary
 * @desc    Get expense summary
 * @access  Private
 */
router.get('/summary', authenticateToken, expenseController.getExpenseSummary);

/**
 * @route   GET /api/v1/expenses/:id
 * @desc    Get single expense
 * @access  Private
 */
router.get('/:id', authenticateToken, uuidParamValidation, expenseController.getExpense);

/**
 * @route   PUT /api/v1/expenses/:id
 * @desc    Update expense
 * @access  Private
 */
router.put('/:id', authenticateToken, uuidParamValidation, expenseValidation, expenseController.updateExpense);

/**
 * @route   DELETE /api/v1/expenses/:id
 * @desc    Delete expense
 * @access  Private
 */
router.delete('/:id', authenticateToken, uuidParamValidation, expenseController.deleteExpense);

/**
 * @route   POST /api/v1/expenses/bulk-delete
 * @desc    Delete multiple expenses
 * @access  Private
 */
router.post('/bulk-delete', authenticateToken, expenseController.bulkDeleteExpenses);

module.exports = router;
