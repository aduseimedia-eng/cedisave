const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const gamificationService = require('../services/gamificationService');

router.get('/badges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const badges = await gamificationService.getUserBadges(userId);
    res.json({ success: true, data: badges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch badges' });
  }
});

router.get('/streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = $1', [userId]);
    res.json({ success: true, data: result.rows[0] || { current_streak: 0, longest_streak: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch streak' });
  }
});

router.get('/xp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const xpData = await gamificationService.getUserXP(userId);
    res.json({ success: true, data: xpData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch XP' });
  }
});

module.exports = router;
