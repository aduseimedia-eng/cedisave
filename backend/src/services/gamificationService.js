const { query } = require('../config/database');
const { 
  XP_REWARDS, 
  LEVEL_THRESHOLDS, 
  BADGES,
  NOTIFICATION_TYPES 
} = require('../config/constants');
const { createNotification } = require('./notificationService');

/**
 * Award XP to user
 */
const awardXP = async (userId, xpAmount, reason) => {
  try {
    // Get current XP
    const result = await query(
      'SELECT total_xp, level FROM user_xp WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create XP record if doesn't exist
      await query(
        'INSERT INTO user_xp (user_id, total_xp, level) VALUES ($1, $2, 1)',
        [userId, xpAmount]
      );
      return { newXP: xpAmount, newLevel: 1, leveledUp: false };
    }

    const currentXP = parseInt(result.rows[0].total_xp);
    const currentLevel = parseInt(result.rows[0].level);
    const newXP = currentXP + xpAmount;

    // Calculate new level
    let newLevel = currentLevel;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (newXP >= LEVEL_THRESHOLDS[i]) {
        newLevel = i + 1;
        break;
      }
    }

    const leveledUp = newLevel > currentLevel;

    // Update XP and level
    await query(
      'UPDATE user_xp SET total_xp = $1, level = $2 WHERE user_id = $3',
      [newXP, newLevel, userId]
    );

    // Send level up notification
    if (leveledUp) {
      await createNotification(
        userId,
        NOTIFICATION_TYPES.LEVEL_UP,
        `Level ${newLevel} Unlocked! 🎉`,
        `Congratulations! You've reached level ${newLevel}. Keep up the great work!`
      );
    }

    return { newXP, newLevel, leveledUp, xpGained: xpAmount };
  } catch (error) {
    console.error('Award XP error:', error);
    throw error;
  }
};

/**
 * Update user streak
 */
const updateStreak = async (userId) => {
  try {
    const result = await query(
      'SELECT current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create streak record
      await query(
        'INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES ($1, 1, 1, CURRENT_DATE)',
        [userId]
      );
      await awardXP(userId, XP_REWARDS.STREAK_DAY, 'Daily streak');
      return { currentStreak: 1, isNewStreak: true };
    }

    const { current_streak, longest_streak, last_activity_date } = result.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = last_activity_date ? new Date(last_activity_date).toISOString().split('T')[0] : null;

    // Check if already logged today
    if (lastActivity === today) {
      return { currentStreak: current_streak, isNewStreak: false };
    }

    // Calculate new streak
    let newStreak;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActivity === yesterdayStr) {
      // Consecutive day
      newStreak = current_streak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, longest_streak);

    // Update streak
    await query(
      'UPDATE streaks SET current_streak = $1, longest_streak = $2, last_activity_date = CURRENT_DATE WHERE user_id = $3',
      [newStreak, newLongest, userId]
    );

    // Award XP
    await awardXP(userId, XP_REWARDS.STREAK_DAY, 'Daily streak');

    // Check for streak milestones and award badges
    if (newStreak === 7 || newStreak === 30 || newStreak === 90) {
      await checkAndAwardStreakBadge(userId, newStreak);
    }

    return { currentStreak: newStreak, isNewStreak: true, longestStreak: newLongest };
  } catch (error) {
    console.error('Update streak error:', error);
    throw error;
  }
};

/**
 * Check and award streak badge
 */
const checkAndAwardStreakBadge = async (userId, streak) => {
  try {
    const badgeInfo = BADGES.CONSISTENCY_CHAMP;
    let tier, xp;

    if (streak >= badgeInfo.tiers.gold.days) {
      tier = 'gold';
      xp = badgeInfo.tiers.gold.xp;
    } else if (streak >= badgeInfo.tiers.silver.days) {
      tier = 'silver';
      xp = badgeInfo.tiers.silver.xp;
    } else if (streak >= badgeInfo.tiers.bronze.days) {
      tier = 'bronze';
      xp = badgeInfo.tiers.bronze.xp;
    } else {
      return;
    }

    // Check if badge already earned
    const existing = await query(
      'SELECT id FROM badges WHERE user_id = $1 AND badge_name = $2 AND badge_tier = $3',
      [userId, badgeInfo.name, tier]
    );

    if (existing.rows.length === 0) {
      await awardBadge(userId, badgeInfo.name, tier, badgeInfo.description, xp);
    }
  } catch (error) {
    console.error('Check streak badge error:', error);
  }
};

/**
 * Award badge to user
 */
const awardBadge = async (userId, badgeName, tier, description, bonusXP = 0) => {
  try {
    // Insert badge
    await query(
      'INSERT INTO badges (user_id, badge_name, badge_tier, description) VALUES ($1, $2, $3, $4)',
      [userId, badgeName, tier, description]
    );

    // Award bonus XP
    if (bonusXP > 0) {
      await awardXP(userId, bonusXP, `Badge earned: ${badgeName}`);
    }

    // Send notification
    await createNotification(
      userId,
      NOTIFICATION_TYPES.BADGE_EARNED,
      `New Badge Earned! 🏆`,
      `You've earned the ${badgeName} (${tier}) badge! ${description}`
    );

    return true;
  } catch (error) {
    console.error('Award badge error:', error);
    return false;
  }
};

/**
 * Check budget-related badges
 */
const checkBudgetBadges = async (userId) => {
  try {
    // Get months under budget
    const result = await query(
      `SELECT COUNT(*) as months_count
       FROM budgets b
       LEFT JOIN (
         SELECT user_id, DATE_TRUNC('month', expense_date) as month, SUM(amount) as spent
         FROM expenses
         GROUP BY user_id, DATE_TRUNC('month', expense_date)
       ) e ON b.user_id = e.user_id AND DATE_TRUNC('month', b.start_date) = e.month
       WHERE b.user_id = $1 
         AND b.is_active = false 
         AND (e.spent IS NULL OR e.spent <= b.amount)`,
      [userId]
    );

    const monthsCount = parseInt(result.rows[0].months_count);
    const badgeInfo = BADGES.BUDGET_BOSS;
    
    let tier, xp;
    if (monthsCount >= badgeInfo.tiers.gold.months) {
      tier = 'gold';
      xp = badgeInfo.tiers.gold.xp;
    } else if (monthsCount >= badgeInfo.tiers.silver.months) {
      tier = 'silver';
      xp = badgeInfo.tiers.silver.xp;
    } else if (monthsCount >= badgeInfo.tiers.bronze.months) {
      tier = 'bronze';
      xp = badgeInfo.tiers.bronze.xp;
    } else {
      return;
    }

    // Check if already earned
    const existing = await query(
      'SELECT id FROM badges WHERE user_id = $1 AND badge_name = $2 AND badge_tier = $3',
      [userId, badgeInfo.name, tier]
    );

    if (existing.rows.length === 0) {
      await awardBadge(userId, badgeInfo.name, tier, badgeInfo.description, xp);
    }
  } catch (error) {
    console.error('Check budget badges error:', error);
  }
};

/**
 * Check category-specific badges
 */
const checkCategoryBadges = async (userId, category) => {
  try {
    // Data/Airtime badge
    if (category === 'Data / Airtime') {
      const result = await query(
        `SELECT SUM(amount) as total
         FROM expenses
         WHERE user_id = $1 
           AND category = 'Data / Airtime'
           AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)
           AND expense_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
        [userId]
      );

      const total = parseFloat(result.rows[0].total) || 0;
      const badgeInfo = BADGES.DATA_KING;

      let tier, xp;
      if (total <= badgeInfo.tiers.gold.threshold) {
        tier = 'gold';
        xp = badgeInfo.tiers.gold.xp;
      } else if (total <= badgeInfo.tiers.silver.threshold) {
        tier = 'silver';
        xp = badgeInfo.tiers.silver.xp;
      } else if (total <= badgeInfo.tiers.bronze.threshold) {
        tier = 'bronze';
        xp = badgeInfo.tiers.bronze.xp;
      } else {
        return;
      }

      const existing = await query(
        'SELECT id FROM badges WHERE user_id = $1 AND badge_name = $2 AND badge_tier = $3',
        [userId, badgeInfo.name, tier]
      );

      if (existing.rows.length === 0) {
        await awardBadge(userId, badgeInfo.name, tier, badgeInfo.description, xp);
      }
    }
  } catch (error) {
    console.error('Check category badges error:', error);
  }
};

/**
 * Get user badges
 */
const getUserBadges = async (userId) => {
  try {
    const result = await query(
      'SELECT * FROM badges WHERE user_id = $1 ORDER BY earned_at DESC',
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Get user badges error:', error);
    throw error;
  }
};

/**
 * Get user XP and level
 */
const getUserXP = async (userId) => {
  try {
    const result = await query(
      'SELECT total_xp, level FROM user_xp WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { total_xp: 0, level: 1 };
    }

    const { total_xp, level } = result.rows[0];
    const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextLevelXP = LEVEL_THRESHOLDS[level] || total_xp;
    const progressToNextLevel = ((total_xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return {
      total_xp,
      level,
      current_level_xp: currentLevelXP,
      next_level_xp: nextLevelXP,
      progress_percentage: Math.min(100, Math.max(0, progressToNextLevel))
    };
  } catch (error) {
    console.error('Get user XP error:', error);
    throw error;
  }
};

module.exports = {
  awardXP,
  addXP: awardXP,  // Alias for consistency
  updateStreak,
  awardBadge,
  checkBudgetBadges,
  checkCategoryBadges,
  getUserBadges,
  getUserXP
};
