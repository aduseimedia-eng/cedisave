// ============================================
// SPENDING COMPARISONS ROUTES
// File: backend/src/routes/comparisons.js
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get week-over-week comparison
router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `WITH current_week AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1 
          AND expense_date >= date_trunc('week', CURRENT_DATE)
          AND expense_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
      ),
      previous_week AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1 
          AND expense_date >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days'
          AND expense_date < date_trunc('week', CURRENT_DATE)
      )
      SELECT 
        cw.total as current_week_total,
        pw.total as previous_week_total,
        CASE 
          WHEN pw.total = 0 THEN 0
          ELSE ROUND(((cw.total - pw.total) / pw.total * 100), 2)
        END as change_percentage
      FROM current_week cw, previous_week pw`,
      [userId]
    );

    const data = result.rows[0];
    const trend = data.change_percentage > 0 ? 'increased' : data.change_percentage < 0 ? 'decreased' : 'unchanged';

    res.json({ 
      success: true, 
      data: {
        ...data,
        trend,
        message: `You spent ${Math.abs(data.change_percentage)}% ${trend === 'increased' ? 'more' : trend === 'decreased' ? 'less' : 'the same'} than last week`
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get weekly comparison' });
  }
});

// Get month-over-month comparison
router.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `WITH current_month AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1 
          AND expense_date >= date_trunc('month', CURRENT_DATE)
          AND expense_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      ),
      previous_month AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1 
          AND expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
          AND expense_date < date_trunc('month', CURRENT_DATE)
      )
      SELECT 
        cw.total as current_month_total,
        pw.total as previous_month_total,
        CASE 
          WHEN pw.total = 0 THEN 0
          ELSE ROUND(((cw.total - pw.total) / pw.total * 100), 2)
        END as change_percentage
      FROM current_month cw, previous_month pw`,
      [userId]
    );

    const data = result.rows[0];
    const trend = data.change_percentage > 0 ? 'increased' : data.change_percentage < 0 ? 'decreased' : 'unchanged';

    res.json({ 
      success: true, 
      data: {
        ...data,
        trend,
        message: `You spent ${Math.abs(data.change_percentage)}% ${trend === 'increased' ? 'more' : trend === 'decreased' ? 'less' : 'the same'} than last month`
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get monthly comparison' });
  }
});

// Get category comparison (current vs previous period)
router.get('/category', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    const interval = period === 'week' ? '7 days' : '1 month';
    const truncPeriod = period === 'week' ? 'week' : 'month';

    const result = await query(
      `WITH current_period AS (
        SELECT category, COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1 
          AND expense_date >= date_trunc($3, CURRENT_DATE)
        GROUP BY category
      ),
      previous_period AS (
        SELECT category, COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = $1 
          AND expense_date >= date_trunc($3, CURRENT_DATE) - INTERVAL $2
          AND expense_date < date_trunc($3, CURRENT_DATE)
        GROUP BY category
      )
      SELECT 
        COALESCE(cp.category, pp.category) as category,
        COALESCE(cp.total, 0) as current_total,
        COALESCE(pp.total, 0) as previous_total,
        CASE 
          WHEN COALESCE(pp.total, 0) = 0 THEN 
            CASE WHEN COALESCE(cp.total, 0) > 0 THEN 100 ELSE 0 END
          ELSE ROUND(((COALESCE(cp.total, 0) - pp.total) / pp.total * 100), 2)
        END as change_percentage
      FROM current_period cp
      FULL OUTER JOIN previous_period pp ON cp.category = pp.category
      ORDER BY current_total DESC`,
      [userId, interval, truncPeriod]
    );

    // Add insights
    const data = result.rows.map(row => ({
      ...row,
      trend: row.change_percentage > 0 ? 'increased' : row.change_percentage < 0 ? 'decreased' : 'unchanged',
      insight: row.change_percentage > 20 
        ? `⚠️ ${row.category} spending up ${row.change_percentage}%`
        : row.change_percentage < -20 
        ? `✅ ${row.category} spending down ${Math.abs(row.change_percentage)}%`
        : null
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get category comparison' });
  }
});

// Get daily average comparison
router.get('/daily-average', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `WITH current_avg AS (
        SELECT 
          COALESCE(AVG(daily_total), 0) as avg_daily,
          COUNT(DISTINCT expense_date) as days_tracked
        FROM (
          SELECT expense_date, SUM(amount) as daily_total
          FROM expenses
          WHERE user_id = $1 
            AND expense_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY expense_date
        ) daily
      ),
      previous_avg AS (
        SELECT COALESCE(AVG(daily_total), 0) as avg_daily
        FROM (
          SELECT expense_date, SUM(amount) as daily_total
          FROM expenses
          WHERE user_id = $1 
            AND expense_date >= CURRENT_DATE - INTERVAL '60 days'
            AND expense_date < CURRENT_DATE - INTERVAL '30 days'
          GROUP BY expense_date
        ) daily
      )
      SELECT 
        ROUND(ca.avg_daily, 2) as current_daily_average,
        ca.days_tracked,
        ROUND(pa.avg_daily, 2) as previous_daily_average,
        CASE 
          WHEN pa.avg_daily = 0 THEN 0
          ELSE ROUND(((ca.avg_daily - pa.avg_daily) / pa.avg_daily * 100), 2)
        END as change_percentage
      FROM current_avg ca, previous_avg pa`,
      [userId]
    );

    const data = result.rows[0];
    
    res.json({ 
      success: true, 
      data: {
        ...data,
        insight: `Your daily average is ₵${data.current_daily_average}. ${
          data.change_percentage > 0 
            ? `That's ${data.change_percentage}% more than before.`
            : data.change_percentage < 0
            ? `That's ${Math.abs(data.change_percentage)}% less than before! 🎉`
            : `Same as before.`
        }`
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get daily average comparison' });
  }
});

// Get income vs expenses comparison
router.get('/income-vs-expenses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;

    const result = await query(
      `SELECT 
        to_char(date_trunc('month', d.date), 'YYYY-MM') as month,
        COALESCE(i.total_income, 0) as income,
        COALESCE(e.total_expenses, 0) as expenses,
        COALESCE(i.total_income, 0) - COALESCE(e.total_expenses, 0) as savings
       FROM (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * $2),
           date_trunc('month', CURRENT_DATE),
           '1 month'
         ) as date
       ) d
       LEFT JOIN (
         SELECT date_trunc('month', income_date) as month, SUM(amount) as total_income
         FROM income WHERE user_id = $1
         GROUP BY date_trunc('month', income_date)
       ) i ON d.date = i.month
       LEFT JOIN (
         SELECT date_trunc('month', expense_date) as month, SUM(amount) as total_expenses
         FROM expenses WHERE user_id = $1
         GROUP BY date_trunc('month', expense_date)
       ) e ON d.date = e.month
       ORDER BY d.date ASC`,
      [userId, parseInt(months) || 6]
    );

    // Calculate savings rate
    const data = result.rows.map(row => ({
      ...row,
      savings_rate: row.income > 0 ? Math.round((row.savings / row.income) * 100) : 0
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get income vs expenses' });
  }
});

// Get spending insights summary (powered by insights engine)
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 6, all = 'false' } = req.query;
    const { generateInsights } = require('../services/insightsService');

    const insights = await generateInsights(userId, {
      limit: parseInt(limit) || 6,
      includeAll: all === 'true'
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ success: false, message: 'Failed to get insights' });
  }
});

module.exports = router;
