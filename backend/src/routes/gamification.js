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

// Add XP to user
router.post('/xp/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid XP amount' });
    }

    const xpData = await gamificationService.addXP(userId, amount);
    
    res.json({ 
      success: true, 
      data: xpData,
      message: `+${amount} XP earned`
    });
  } catch (error) {
    console.error('Add XP error:', error);
    res.status(500).json({ success: false, message: 'Failed to add XP' });
  }
});

// Award badge to user
router.post('/badges/award', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { badge_name, badge_tier } = req.body;

    if (!badge_name) {
      return res.status(400).json({ success: false, message: 'Badge name required' });
    }

    const badge = await gamificationService.awardBadge(userId, badge_name, badge_tier || 'bronze');
    
    res.json({ 
      success: true, 
      data: badge,
      message: `${badge_name} badge awarded!`
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({ success: false, message: 'Failed to award badge' });
  }
});

// Update streak (daily activity tracking)
router.put('/streak/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const streak = await gamificationService.updateStreak(userId);
    
    res.json({ 
      success: true, 
      data: streak,
      message: 'Streak updated'
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ success: false, message: 'Failed to update streak' });
  }
});

module.exports = router;
