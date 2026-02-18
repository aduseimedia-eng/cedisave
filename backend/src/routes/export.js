// ============================================
// EXPORT REPORTS ROUTES (PDF/Excel/CSV)
// File: backend/src/routes/export.js
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get export data (JSON format for frontend to convert)
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      type = 'expenses', 
      start_date, 
      end_date,
      format = 'json'
    } = req.query;

    let data = [];
    let columns = [];

    const startFilter = start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const endFilter = end_date || new Date().toISOString().split('T')[0];

    switch(type) {
      case 'expenses':
        const expenseResult = await query(
          `SELECT 
            expense_date as date,
            category,
            description,
            amount,
            currency
           FROM expenses
           WHERE user_id = $1 
             AND expense_date >= $2 
             AND expense_date <= $3
           ORDER BY expense_date DESC`,
          [userId, startFilter, endFilter]
        );
        data = expenseResult.rows;
        columns = ['Date', 'Category', 'Description', 'Amount', 'Currency'];
        break;

      case 'income':
        const incomeResult = await query(
          `SELECT 
            income_date as date,
            source,
            description,
            amount,
            currency
           FROM income
           WHERE user_id = $1 
             AND income_date >= $2 
             AND income_date <= $3
           ORDER BY income_date DESC`,
          [userId, startFilter, endFilter]
        );
        data = incomeResult.rows;
        columns = ['Date', 'Source', 'Description', 'Amount', 'Currency'];
        break;

      case 'summary':
        const summaryResult = await query(
          `SELECT 
            to_char(expense_date, 'YYYY-MM') as month,
            category,
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            AVG(amount) as average_amount
           FROM expenses
           WHERE user_id = $1 
             AND expense_date >= $2 
             AND expense_date <= $3
           GROUP BY to_char(expense_date, 'YYYY-MM'), category
           ORDER BY month DESC, total_amount DESC`,
          [userId, startFilter, endFilter]
        );
        data = summaryResult.rows;
        columns = ['Month', 'Category', 'Transactions', 'Total', 'Average'];
        break;

      case 'budgets':
        const budgetResult = await query(
          `SELECT 
            b.category,
            b.amount as budget_amount,
            b.period,
            COALESCE(SUM(e.amount), 0) as spent,
            b.amount - COALESCE(SUM(e.amount), 0) as remaining
           FROM budgets b
           LEFT JOIN expenses e ON b.user_id = e.user_id 
             AND b.category = e.category
             AND e.expense_date >= $2 
             AND e.expense_date <= $3
           WHERE b.user_id = $1
           GROUP BY b.id, b.category, b.amount, b.period`,
          [userId, startFilter, endFilter]
        );
        data = budgetResult.rows;
        columns = ['Category', 'Budget', 'Period', 'Spent', 'Remaining'];
        break;

      case 'goals':
        const goalsResult = await query(
          `SELECT 
            name,
            target_amount,
            current_amount,
            target_amount - current_amount as remaining,
            ROUND((current_amount / NULLIF(target_amount, 0) * 100), 1) as progress_percent,
            deadline
           FROM goals
           WHERE user_id = $1
           ORDER BY deadline ASC`,
          [userId]
        );
        data = goalsResult.rows;
        columns = ['Goal', 'Target', 'Current', 'Remaining', 'Progress %', 'Deadline'];
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    // Format data based on requested format
    if (format === 'csv') {
      const escapeCsvValue = (v) => {
        let str = String(v == null ? '' : v);
        // Escape double quotes
        str = str.replace(/"/g, '""');
        // Neutralize formula injection
        if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
        return `"${str}"`;
      };
      const csvHeader = columns.join(',');
      const csvRows = data.map(row => Object.values(row).map(escapeCsvValue).join(','));
      const csv = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
      return res.send(csv);
    }

    res.json({ 
      success: true, 
      data: {
        type,
        columns,
        rows: data,
        period: { start: startFilter, end: endFilter },
        generated_at: new Date().toISOString(),
        total_records: data.length
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// Get full financial report data
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      start_date,
      end_date,
      include_charts = 'true'
    } = req.query;

    const startFilter = start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const endFilter = end_date || new Date().toISOString().split('T')[0];

    // Gather comprehensive report data
    const [summaryResult, categoryResult, dailyResult, incomeResult, budgetResult] = await Promise.all([
      // Overall summary
      query(
        `SELECT 
          COALESCE(SUM(amount), 0) as total_expenses,
          COUNT(*) as transaction_count,
          COALESCE(AVG(amount), 0) as average_expense,
          COALESCE(MAX(amount), 0) as largest_expense,
          COUNT(DISTINCT expense_date) as days_with_expenses
         FROM expenses
         WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3`,
        [userId, startFilter, endFilter]
      ),
      
      // By category
      query(
        `SELECT 
          category,
          SUM(amount) as total,
          COUNT(*) as count,
          ROUND((SUM(amount) / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3), 0) * 100), 1) as percentage
         FROM expenses
         WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3
         GROUP BY category
         ORDER BY total DESC`,
        [userId, startFilter, endFilter]
      ),
      
      // Daily breakdown (for charts)
      include_charts === 'true' ? query(
        `SELECT 
          expense_date as date,
          SUM(amount) as total
         FROM expenses
         WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3
         GROUP BY expense_date
         ORDER BY expense_date`,
        [userId, startFilter, endFilter]
      ) : { rows: [] },
      
      // Income summary
      query(
        `SELECT 
          COALESCE(SUM(amount), 0) as total_income,
          COUNT(*) as income_count
         FROM income
         WHERE user_id = $1 AND income_date >= $2 AND income_date <= $3`,
        [userId, startFilter, endFilter]
      ),
      
      // Budget performance
      query(
        `SELECT 
          b.category,
          b.amount as budget,
          COALESCE(SUM(e.amount), 0) as spent,
          b.amount - COALESCE(SUM(e.amount), 0) as variance,
          CASE WHEN COALESCE(SUM(e.amount), 0) > b.amount THEN 'Over' ELSE 'Under' END as status
         FROM budgets b
         LEFT JOIN expenses e ON b.user_id = e.user_id AND b.category = e.category
           AND e.expense_date >= $2 AND e.expense_date <= $3
         WHERE b.user_id = $1
         GROUP BY b.id, b.category, b.amount`,
        [userId, startFilter, endFilter]
      )
    ]);

    const summary = summaryResult.rows[0];
    const income = incomeResult.rows[0];
    const totalIncomeNum = parseFloat(income.total_income) || 0;
    const netSavings = totalIncomeNum - parseFloat(summary.total_expenses);
    const savingsRate = totalIncomeNum > 0 
      ? Math.round((netSavings / totalIncomeNum) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        report_info: {
          generated_at: new Date().toISOString(),
          period: { start: startFilter, end: endFilter },
          currency: 'GHS'
        },
        overview: {
          total_income: parseFloat(income.total_income),
          total_expenses: parseFloat(summary.total_expenses),
          net_savings: netSavings,
          savings_rate: savingsRate,
          transaction_count: parseInt(summary.transaction_count),
          average_daily_expense: summary.days_with_expenses > 0 
            ? Math.round(summary.total_expenses / summary.days_with_expenses) 
            : 0
        },
        by_category: categoryResult.rows,
        budget_performance: budgetResult.rows,
        daily_totals: dailyResult.rows,
        insights: generateInsights(summary, categoryResult.rows, netSavings)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// Helper function to generate insights
function generateInsights(summary, categories, netSavings) {
  const insights = [];

  if (netSavings > 0) {
    insights.push({
      type: 'positive',
      message: `Great job! You saved ₵${Math.round(netSavings)} this period.`
    });
  } else if (netSavings < 0) {
    insights.push({
      type: 'warning',
      message: `You spent ₵${Math.abs(Math.round(netSavings))} more than you earned.`
    });
  }

  if (categories.length > 0) {
    const topCategory = categories[0];
    insights.push({
      type: 'info',
      message: `${topCategory.category} was your top spending category at ${topCategory.percentage}% of total.`
    });
  }

  if (parseFloat(summary.largest_expense) > parseFloat(summary.average_expense) * 3) {
    insights.push({
      type: 'info',
      message: `Your largest single expense (₵${Math.round(summary.largest_expense)}) was significantly above average.`
    });
  }

  return insights;
}

// Get available export templates
router.get('/templates', authenticateToken, async (req, res) => {
  const templates = [
    {
      id: 'monthly_summary',
      name: 'Monthly Summary',
      description: 'Overview of income, expenses, and savings for the month',
      includes: ['summary', 'categories', 'budget_status']
    },
    {
      id: 'expense_detail',
      name: 'Expense Detail Report',
      description: 'All expenses with full details',
      includes: ['all_expenses', 'category_breakdown']
    },
    {
      id: 'tax_report',
      name: 'Annual Tax Report',
      description: 'Income and deductible expenses for tax filing',
      includes: ['annual_income', 'deductible_expenses', 'summary']
    },
    {
      id: 'budget_analysis',
      name: 'Budget Analysis',
      description: 'Budget vs actual spending analysis',
      includes: ['budgets', 'variances', 'trends']
    },
    {
      id: 'savings_progress',
      name: 'Savings Progress',
      description: 'Progress toward financial goals',
      includes: ['goals', 'challenges', 'achievements']
    }
  ];

  res.json({ success: true, data: templates });
});

// Export using a template
router.post('/template/:templateId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;
    const { start_date, end_date } = req.body;

    const startFilter = start_date || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const endFilter = end_date || new Date().toISOString().split('T')[0];

    let reportData = {};

    switch(templateId) {
      case 'monthly_summary':
        const [summary, categories, budgets] = await Promise.all([
          query(
            `SELECT 
              COALESCE((SELECT SUM(amount) FROM income WHERE user_id = $1 AND income_date >= $2 AND income_date <= $3), 0) as total_income,
              COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3), 0) as total_expenses`,
            [userId, startFilter, endFilter]
          ),
          query(
            `SELECT category, SUM(amount) as total FROM expenses 
             WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3
             GROUP BY category ORDER BY total DESC`,
            [userId, startFilter, endFilter]
          ),
          query(
            `SELECT b.category, b.amount as budget, COALESCE(SUM(e.amount), 0) as spent
             FROM budgets b
             LEFT JOIN expenses e ON b.category = e.category AND b.user_id = e.user_id
               AND e.expense_date >= $2 AND e.expense_date <= $3
             WHERE b.user_id = $1
             GROUP BY b.id, b.category, b.amount`,
            [userId, startFilter, endFilter]
          )
        ]);
        
        reportData = {
          template: 'Monthly Summary',
          summary: summary.rows[0],
          categories: categories.rows,
          budgets: budgets.rows
        };
        break;

      case 'expense_detail':
        const expenses = await query(
          `SELECT expense_date, category, description, amount
           FROM expenses
           WHERE user_id = $1 AND expense_date >= $2 AND expense_date <= $3
           ORDER BY expense_date DESC`,
          [userId, startFilter, endFilter]
        );
        reportData = {
          template: 'Expense Detail Report',
          expenses: expenses.rows
        };
        break;

      default:
        return res.status(400).json({ success: false, message: 'Unknown template' });
    }

    res.json({
      success: true,
      data: {
        ...reportData,
        period: { start: startFilter, end: endFilter },
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template report' });
  }
});

module.exports = router;
