const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { incomeValidation, uuidParamValidation } = require('../middleware/validation');

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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM income WHERE user_id = $1 ORDER BY income_date DESC', [userId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch income' });
  }
});

module.exports = router;
