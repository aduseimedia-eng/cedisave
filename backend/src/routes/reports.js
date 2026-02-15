const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

router.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const savingsData = await analyticsService.calculateMonthlySavingsRate(userId);
    res.json({ success: true, data: savingsData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

router.get('/health-score', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const healthScore = await analyticsService.calculateFinancialHealthScore(userId);
    res.json({ success: true, data: healthScore });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate health score' });
  }
});

router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const trends = await analyticsService.getSpendingTrends(userId);
    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get trends' });
  }
});

module.exports = router;
