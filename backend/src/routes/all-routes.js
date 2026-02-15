// ============================================
// INCOME ROUTES
// File: backend/src/routes/income.js
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { incomeValidation, uuidParamValidation } = require('../middleware/validation');

// Create income
router.post('/', authenticateToken, incomeValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, source, income_date, note } = req.body;

    const result = await query(
      'INSERT INTO income (user_id, amount, source, income_date, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, amount, source, income_date, note]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create income' });
  }
});

// Get all income
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    let queryText = 'SELECT * FROM income WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (start_date) {
      queryText += ` AND income_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      queryText += ` AND income_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    queryText += ` ORDER BY income_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch income' });
  }
});

// Update income
router.put('/:id', authenticateToken, uuidParamValidation, incomeValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, source, income_date, note } = req.body;

    const result = await query(
      'UPDATE income SET amount = $1, source = $2, income_date = $3, note = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [amount, source, income_date, note, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Income not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update income' });
  }
});

// Delete income
router.delete('/:id', authenticateToken, uuidParamValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM income WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Income not found' });
    }

    res.json({ success: true, message: 'Income deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete income' });
  }
});

module.exports = router;

// ============================================
// BUDGET ROUTES
// File: backend/src/routes/budget.js
// ============================================

const budgetRouter = express.Router();
const { budgetValidation } = require('../middleware/validation');
const { checkBudgetAlerts } = require('../services/budgetService');

// Create budget
budgetRouter.post('/', authenticateToken, budgetValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period_type, amount, start_date } = req.body;

    // Calculate end_date based on period_type
    const endDate = new Date(start_date);
    if (period_type === 'weekly') {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Deactivate existing active budgets of same type
    await query(
      'UPDATE budgets SET is_active = false WHERE user_id = $1 AND period_type = $2 AND is_active = true',
      [userId, period_type]
    );

    const result = await query(
      'INSERT INTO budgets (user_id, period_type, amount, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, period_type, amount, start_date, endDate.toISOString().split('T')[0]]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create budget' });
  }
});

// Get active budget
budgetRouter.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        b.*,
        COALESCE(SUM(e.amount), 0) as spent_amount,
        b.amount - COALESCE(SUM(e.amount), 0) as remaining,
        ROUND((COALESCE(SUM(e.amount), 0) / b.amount * 100), 2) as usage_percentage
       FROM budgets b
       LEFT JOIN expenses e ON b.user_id = e.user_id AND e.expense_date BETWEEN b.start_date AND b.end_date
       WHERE b.user_id = $1 AND b.is_active = true
       GROUP BY b.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active budget found' });
    }

    // Check for budget alerts
    await checkBudgetAlerts(result.rows[0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch budget' });
  }
});

module.exports = { incomeRouter: router, budgetRouter };

// ============================================
// GOALS ROUTES
// File: backend/src/routes/goals.js
// ============================================

const goalsRouter = express.Router();
const { goalValidation } = require('../middleware/validation');

// Create goal
goalsRouter.post('/', authenticateToken, goalValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, target_amount, deadline } = req.body;

    const result = await query(
      'INSERT INTO goals (user_id, title, target_amount, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, target_amount, deadline]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});

// Get all goals
goalsRouter.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        *,
        ROUND((current_amount / NULLIF(target_amount, 0) * 100), 2) as progress_percentage,
        CASE 
          WHEN deadline IS NOT NULL THEN deadline::date - CURRENT_DATE
          ELSE NULL
        END as days_remaining
       FROM goals
       WHERE user_id = $1
       ORDER BY 
         CASE status
           WHEN 'active' THEN 1
           WHEN 'completed' THEN 2
           WHEN 'abandoned' THEN 3
         END,
         created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
});

// Update goal
goalsRouter.put('/:id', authenticateToken, uuidParamValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, target_amount, current_amount, deadline, status } = req.body;

    const result = await query(
      `UPDATE goals 
       SET title = $1, target_amount = $2, current_amount = $3, deadline = $4, status = $5,
           completed_at = CASE WHEN $5 = 'completed' AND status != 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, target_amount, current_amount, deadline, status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});

// Delete goal
goalsRouter.delete('/:id', authenticateToken, uuidParamValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});

module.exports = goalsRouter;

// ============================================
// REPORTS ROUTES
// File: backend/src/routes/reports.js
// ============================================

const reportsRouter = express.Router();
const analyticsService = require('../services/analyticsService');

// Get monthly report
reportsRouter.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    const monthDate = month ? new Date(month) : new Date();
    const savingsData = await analyticsService.calculateMonthlySavingsRate(userId, monthDate);
    const categoryData = await analyticsService.getCategoryBreakdown(
      userId,
      new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    );

    res.json({
      success: true,
      data: {
        month: monthDate.toISOString().substr(0, 7),
        ...savingsData,
        category_breakdown: categoryData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// Get weekly report
reportsRouter.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dailySpending = await analyticsService.calculateAverageDailySpending(userId, 7);
    const topCategories = await analyticsService.getTopSpendingCategories(userId, 5, 7);

    res.json({ success: true, data: { daily_spending: dailySpending, top_categories: topCategories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate weekly report' });
  }
});

// Get financial health score
reportsRouter.get('/health-score', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const healthScore = await analyticsService.calculateFinancialHealthScore(userId);

    res.json({ success: true, data: healthScore });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate health score' });
  }
});

// Get spending trends
reportsRouter.get('/trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const trends = await analyticsService.getSpendingTrends(userId);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get trends' });
  }
});

module.exports = reportsRouter;

// ============================================
// GAMIFICATION ROUTES
// File: backend/src/routes/gamification.js
// ============================================

const gamificationRouter = express.Router();
const gamificationService = require('../services/gamificationService');

// Get badges
gamificationRouter.get('/badges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const badges = await gamificationService.getUserBadges(userId);

    res.json({ success: true, data: badges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch badges' });
  }
});

// Get streak
gamificationRouter.get('/streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = $1',
      [userId]
    );

    const data = result.rows[0] || { current_streak: 0, longest_streak: 0, last_activity_date: null };
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch streak' });
  }
});

// Get XP and level
gamificationRouter.get('/xp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const xpData = await gamificationService.getUserXP(userId);

    res.json({ success: true, data: xpData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch XP' });
  }
});

module.exports = gamificationRouter;

// Export all routers
module.exports = {
  incomeRouter: router,
  budgetRouter,
  goalsRouter,
  reportsRouter,
  gamificationRouter
};
