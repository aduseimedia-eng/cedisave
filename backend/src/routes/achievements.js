// ============================================
// ACHIEVEMENTS ROUTES
// File: backend/src/routes/achievements.js
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all achievements with user progress
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, earned_only } = req.query;

    let queryText = `
      SELECT 
        a.*,
        ua.earned_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_earned
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (category) {
      queryText += ` WHERE a.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (earned_only === 'true') {
      queryText += category ? ' AND' : ' WHERE';
      queryText += ' ua.id IS NOT NULL';
    }

    // Don't show secret achievements unless earned
    queryText += (category || earned_only === 'true') ? ' AND' : ' WHERE';
    queryText += ' (a.is_secret = FALSE OR ua.id IS NOT NULL)';

    queryText += ' ORDER BY a.category, a.xp_reward';

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch achievements' });
  }
});

// Get user's earned achievements
router.get('/earned', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        a.*,
        ua.earned_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching earned achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch earned achievements' });
  }
});

// Get achievement progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get various counts for progress tracking
    const statsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM expenses WHERE user_id = $1) as expense_count,
        (SELECT COUNT(*) FROM budgets WHERE user_id = $1) as budget_count,
        (SELECT COUNT(*) FROM goals WHERE user_id = $1) as goal_count,
        (SELECT COUNT(*) FROM goals WHERE user_id = $1 AND status = 'completed') as goals_completed,
        COALESCE((SELECT current_streak FROM streaks WHERE user_id = $1), 0) as streak_days,
        (SELECT COALESCE(SUM(current_amount), 0) FROM goals WHERE user_id = $1) as total_saved,
        (SELECT COUNT(*) FROM user_challenges WHERE user_id = $1 AND status = 'completed') as challenges_completed`,
      [userId]
    );

    const stats = statsResult.rows[0];

    // Get all unearned achievements
    const unearnedResult = await query(
      `SELECT a.* FROM achievements a
       WHERE NOT EXISTS (
         SELECT 1 FROM user_achievements ua 
         WHERE ua.achievement_id = a.id AND ua.user_id = $1
       )
       AND a.is_secret = FALSE`,
      [userId]
    );

    // Calculate progress for each unearned achievement
    const progress = unearnedResult.rows.map(achievement => {
      let currentValue = 0;
      
      switch (achievement.requirement_type) {
        case 'expense_count': currentValue = stats.expense_count; break;
        case 'budget_count': currentValue = stats.budget_count; break;
        case 'goal_count': currentValue = stats.goal_count; break;
        case 'goals_completed': currentValue = stats.goals_completed; break;
        case 'streak_days': currentValue = stats.streak_days; break;
        case 'total_saved': currentValue = stats.total_saved; break;
        case 'challenges_completed': currentValue = stats.challenges_completed; break;
        default: currentValue = 0;
      }

      const progressPercentage = achievement.requirement_value > 0 ? Math.min(100, Math.round((currentValue / achievement.requirement_value) * 100)) : 0;

      return {
        ...achievement,
        current_value: currentValue,
        progress_percentage: progressPercentage
      };
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch achievement progress' });
  }
});

// Check and award achievements (internal function, exposed for testing)
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const newlyEarned = [];

    // Get user stats
    const statsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM expenses WHERE user_id = $1) as expense_count,
        (SELECT COUNT(*) FROM budgets WHERE user_id = $1) as budget_count,
        (SELECT COUNT(*) FROM goals WHERE user_id = $1) as goal_count,
        (SELECT COUNT(*) FROM goals WHERE user_id = $1 AND status = 'completed') as goals_completed,
        COALESCE((SELECT current_streak FROM streaks WHERE user_id = $1), 0) as streak_days,
        (SELECT COALESCE(SUM(current_amount), 0) FROM goals WHERE user_id = $1) as total_saved,
        (SELECT COUNT(*) FROM user_challenges WHERE user_id = $1 AND status = 'completed') as challenges_completed`,
      [userId]
    );

    const stats = statsResult.rows[0];

    // Get unearned achievements
    const unearnedResult = await query(
      `SELECT a.* FROM achievements a
       WHERE NOT EXISTS (
         SELECT 1 FROM user_achievements ua 
         WHERE ua.achievement_id = a.id AND ua.user_id = $1
       )`,
      [userId]
    );

    // Check each achievement
    for (const achievement of unearnedResult.rows) {
      let currentValue = 0;
      let earned = false;

      switch (achievement.requirement_type) {
        case 'expense_count': 
          currentValue = parseInt(stats.expense_count);
          earned = currentValue >= achievement.requirement_value;
          break;
        case 'budget_count': 
          currentValue = parseInt(stats.budget_count);
          earned = currentValue >= achievement.requirement_value;
          break;
        case 'goal_count': 
          currentValue = parseInt(stats.goal_count);
          earned = currentValue >= achievement.requirement_value;
          break;
        case 'goals_completed': 
          currentValue = parseInt(stats.goals_completed);
          earned = currentValue >= achievement.requirement_value;
          break;
        case 'streak_days': 
          currentValue = parseInt(stats.streak_days);
          earned = currentValue >= achievement.requirement_value;
          break;
        case 'total_saved': 
          currentValue = parseFloat(stats.total_saved);
          earned = currentValue >= achievement.requirement_value;
          break;
        case 'challenges_completed': 
          currentValue = parseInt(stats.challenges_completed);
          earned = currentValue >= achievement.requirement_value;
          break;
      }

      if (earned) {
        // Award achievement
        await query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );

        // Award XP
        await query(
          `INSERT INTO user_xp (user_id, total_xp, level)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id) DO UPDATE SET total_xp = user_xp.total_xp + $2`,
          [userId, achievement.xp_reward]
        );

        newlyEarned.push(achievement);
      }
    }

    res.json({ 
      success: true, 
      data: newlyEarned,
      message: newlyEarned.length > 0 
        ? `You earned ${newlyEarned.length} new achievement(s)!` 
        : 'No new achievements'
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to check achievements' });
  }
});

// Get achievement stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM achievements WHERE is_secret = FALSE) as total_achievements,
        (SELECT COUNT(*) FROM user_achievements WHERE user_id = $1) as earned_count,
        (SELECT COALESCE(SUM(a.xp_reward), 0) 
         FROM user_achievements ua 
         JOIN achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = $1) as total_xp_from_achievements`,
      [userId]
    );

    const stats = result.rows[0];
    stats.completion_percentage = stats.total_achievements > 0 
      ? Math.round((stats.earned_count / stats.total_achievements) * 100) 
      : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch achievement stats' });
  }
});

module.exports = router;
