const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { budgetValidation } = require('../middleware/validation');

router.post('/', authenticateToken, budgetValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period_type, amount, start_date } = req.body;
    const endDate = new Date(start_date);
    if (period_type === 'weekly') endDate.setDate(endDate.getDate() + 7);
    else endDate.setMonth(endDate.getMonth() + 1);
    await query('UPDATE budgets SET is_active = false WHERE user_id = $1 AND period_type = $2 AND is_active = true', [userId, period_type]);
    const result = await query('INSERT INTO budgets (user_id, period_type, amount, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, period_type, amount, start_date, endDate.toISOString().split('T')[0]]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create budget' });
  }
});

router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(`SELECT b.*, COALESCE(SUM(e.amount), 0) as spent_amount FROM budgets b LEFT JOIN expenses e ON b.user_id = e.user_id AND e.expense_date BETWEEN b.start_date AND b.end_date WHERE b.user_id = $1 AND b.is_active = true GROUP BY b.id`, [userId]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch budget' });
  }
});

module.exports = router;
