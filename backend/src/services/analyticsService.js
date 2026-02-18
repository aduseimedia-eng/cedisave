const { query } = require('../config/database');
const { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } = require('date-fns');

/**
 * Calculate monthly savings rate
 */
const calculateMonthlySavingsRate = async (userId, month = new Date()) => {
  try {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    const result = await query(
      `SELECT 
        COALESCE((SELECT SUM(amount) FROM income WHERE user_id = $1 AND income_date >= $2 AND income_date <= $3), 0) as total_income,
        COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3), 0) as total_expenses`,
      [userId, start, end]
    );

    const { total_income, total_expenses } = result.rows[0];
    const income = parseFloat(total_income);
    const expenses = parseFloat(total_expenses);
    
    if (income === 0) {
      return { savings_rate: 0, income, expenses, savings: 0 };
    }

    const savings = income - expenses;
    const savings_rate = (savings / income) * 100;

    return {
      savings_rate: Math.round(savings_rate * 100) / 100,
      income,
      expenses,
      savings
    };
  } catch (error) {
    console.error('Calculate savings rate error:', error);
    throw error;
  }
};

/**
 * Calculate average daily spending
 */
const calculateAverageDailySpending = async (userId, days = 30) => {
  try {
    const result = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1 
         AND expense_date >= CURRENT_DATE - INTERVAL '1 day' * $2`,
      [userId, days]
    );

    const total = parseFloat(result.rows[0].total);
    const average = total / days;

    return {
      total_spent: total,
      days,
      average_daily: Math.round(average * 100) / 100
    };
  } catch (error) {
    console.error('Calculate average daily spending error:', error);
    throw error;
  }
};

/**
 * Get category breakdown with percentages
 */
const getCategoryBreakdown = async (userId, start_date, end_date) => {
  try {
    const result = await query(
      `SELECT 
        category,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        ROUND(
          (SUM(amount) / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3), 0)) * 100,
          2
        ) as percentage
       FROM expenses
       WHERE user_id = $1 
         AND expense_date BETWEEN $2 AND $3
       GROUP BY category
       ORDER BY total_amount DESC`,
      [userId, start_date, end_date]
    );

    return result.rows;
  } catch (error) {
    console.error('Get category breakdown error:', error);
    throw error;
  }
};

/**
 * Calculate financial health score (0-100)
 */
const calculateFinancialHealthScore = async (userId) => {
  try {
    let score = 0;

    // 1. Savings rate (30 points)
    const savingsData = await calculateMonthlySavingsRate(userId);
    if (savingsData.savings_rate >= 30) score += 30;
    else if (savingsData.savings_rate >= 20) score += 25;
    else if (savingsData.savings_rate >= 10) score += 20;
    else score += Math.max(0, (savingsData.savings_rate / 10) * 15);

    // 2. Budget adherence (30 points)
    const budgetResult = await query(
      `SELECT 
        b.amount as budget_amount,
        COALESCE(SUM(e.amount), 0) as spent_amount
       FROM budgets b
       LEFT JOIN expenses e ON b.user_id = e.user_id 
         AND e.expense_date BETWEEN b.start_date AND b.end_date
       WHERE b.user_id = $1 AND b.is_active = true
       GROUP BY b.amount`,
      [userId]
    );

    if (budgetResult.rows.length > 0) {
      const { budget_amount, spent_amount } = budgetResult.rows[0];
      const budgetAmt = parseFloat(budget_amount) || 0;
      const usage = budgetAmt > 0 ? (parseFloat(spent_amount) / budgetAmt) * 100 : 0;
      
      if (usage <= 80) score += 30;
      else if (usage <= 90) score += 25;
      else if (usage <= 100) score += 20;
      else score += 10;
    }

    // 3. Consistency (20 points)
    const streakResult = await query(
      'SELECT current_streak FROM streaks WHERE user_id = $1',
      [userId]
    );

    if (streakResult.rows.length > 0) {
      const streak = parseInt(streakResult.rows[0].current_streak);
      if (streak >= 30) score += 20;
      else if (streak >= 14) score += 15;
      else if (streak >= 7) score += 10;
      else score += streak * 1.5;
    }

    // 4. Goal progress (20 points)
    const goalsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        AVG(current_amount / NULLIF(target_amount, 0) * 100) as avg_progress
       FROM goals
       WHERE user_id = $1`,
      [userId]
    );

    if (goalsResult.rows.length > 0) {
      const { completed, active, avg_progress } = goalsResult.rows[0];
      const completedCount = parseInt(completed) || 0;
      const activeCount = parseInt(active) || 0;
      const progress = parseFloat(avg_progress) || 0;

      score += Math.min(20, (completedCount * 5) + (progress / 10) + (activeCount > 0 ? 5 : 0));
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      breakdown: {
        savings_rate: Math.min(30, score >= 30 ? 30 : 0),
        budget_adherence: 30,
        consistency: 20,
        goal_progress: 20
      }
    };
  } catch (error) {
    console.error('Calculate financial health score error:', error);
    throw error;
  }
};

/**
 * Get monthly comparison data
 */
const getMonthlyComparison = async (userId, months = 6) => {
  try {
    const result = await query(
      `SELECT 
        TO_CHAR(expense_date, 'YYYY-MM') as month,
        SUM(amount) as total
       FROM expenses
       WHERE user_id = $1 
         AND expense_date >= CURRENT_DATE - INTERVAL '1 month' * $2
       GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
       ORDER BY month`,
      [userId, months]
    );

    return result.rows;
  } catch (error) {
    console.error('Get monthly comparison error:', error);
    throw error;
  }
};

/**
 * Get spending trends
 */
const getSpendingTrends = async (userId) => {
  try {
    // Weekly trend
    const weeklyResult = await query(
      `SELECT 
        DATE_TRUNC('week', expense_date) as week,
        SUM(amount) as total
       FROM expenses
       WHERE user_id = $1 
         AND expense_date >= CURRENT_DATE - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', expense_date)
       ORDER BY week`,
      [userId]
    );

    // Month over month change
    const currentMonth = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1 
         AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    const lastMonth = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE user_id = $1 
         AND expense_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
         AND expense_date < DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    const currentTotal = parseFloat(currentMonth.rows[0].total);
    const lastTotal = parseFloat(lastMonth.rows[0].total);
    const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    return {
      weekly_trend: weeklyResult.rows,
      month_over_month: {
        current_month: currentTotal,
        last_month: lastTotal,
        change_percentage: Math.round(change * 100) / 100,
        trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable'
      }
    };
  } catch (error) {
    console.error('Get spending trends error:', error);
    throw error;
  }
};

/**
 * Get top spending categories
 */
const getTopSpendingCategories = async (userId, limit = 5, days = 30) => {
  try {
    const result = await query(
      `SELECT 
        category,
        COUNT(*) as transactions,
        SUM(amount) as total
       FROM expenses
       WHERE user_id = $1 
         AND expense_date >= CURRENT_DATE - INTERVAL '1 day' * $3
       GROUP BY category
       ORDER BY total DESC
       LIMIT $2`,
      [userId, limit, days]
    );

    return result.rows;
  } catch (error) {
    console.error('Get top spending categories error:', error);
    throw error;
  }
};

module.exports = {
  calculateMonthlySavingsRate,
  calculateAverageDailySpending,
  getCategoryBreakdown,
  calculateFinancialHealthScore,
  getMonthlyComparison,
  getSpendingTrends,
  getTopSpendingCategories
};
