const { query } = require('../config/database');

/**
 * KudiPal Spending Insights Engine
 * Generates smart, contextual, actionable insights from user spending data.
 */

// ─────────────────────────────────────────────
// 1. WEEKLY SPENDING CHANGE
// ─────────────────────────────────────────────
async function weeklyChangeInsight(userId) {
  const result = await query(
    `WITH current_week AS (
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE user_id = $1 AND expense_date >= date_trunc('week', CURRENT_DATE)
    ),
    previous_week AS (
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE user_id = $1 
        AND expense_date >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days'
        AND expense_date < date_trunc('week', CURRENT_DATE)
    )
    SELECT cw.total as current, pw.total as previous,
      CASE WHEN pw.total = 0 THEN 0 
      ELSE ROUND(((cw.total - pw.total) / pw.total * 100), 1) END as change
    FROM current_week cw, previous_week pw`,
    [userId]
  );
  const r = result.rows[0];
  if (parseFloat(r.previous) === 0 && parseFloat(r.current) === 0) return null;

  if (parseFloat(r.change) < -10) {
    return {
      type: 'positive', icon: '📉', priority: 2,
      title: 'Spending Down!',
      message: `You're spending ${Math.abs(r.change)}% less than last week. Great discipline!`,
      tip: 'Keep this momentum — consider moving the savings to a goal.'
    };
  } else if (parseFloat(r.change) > 25) {
    return {
      type: 'warning', icon: '⚠️', priority: 1,
      title: 'Spending Spike',
      message: `You're spending ${r.change}% more than last week (₵${Math.round(r.current)} vs ₵${Math.round(r.previous)}).`,
      tip: 'Review your recent expenses — can any be reduced or postponed?'
    };
  } else if (parseFloat(r.change) > 0) {
    return {
      type: 'info', icon: '📊', priority: 4,
      title: 'Spending Up Slightly',
      message: `Your spending is up ${r.change}% from last week.`,
      tip: 'Small increases add up. Track closely for the rest of the week.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 2. TOP SPENDING CATEGORY
// ─────────────────────────────────────────────
async function topCategoryInsight(userId) {
  const result = await query(
    `SELECT category, SUM(amount) as total,
      COUNT(*) as txn_count,
      ROUND(SUM(amount) / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30), 0) * 100, 1) as pct
     FROM expenses
     WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30
     GROUP BY category ORDER BY total DESC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const cat = result.rows[0];
  return {
    type: 'info', icon: '🏷️', priority: 3,
    title: `Top: ${cat.category}`,
    message: `${cat.category} takes ${cat.pct}% of your spending this month (₵${Math.round(cat.total)} across ${cat.txn_count} transactions).`,
    tip: cat.pct > 40 ? 'This category dominates your budget. Set a limit for it.' : 'Diversified spending is healthy — keep monitoring.'
  };
}

// ─────────────────────────────────────────────
// 3. WEEKEND vs WEEKDAY SPENDING
// ─────────────────────────────────────────────
async function weekendVsWeekdayInsight(userId) {
  const result = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM expense_date) IN (0, 6) THEN amount END), 0) as weekend_total,
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM expense_date) NOT IN (0, 6) THEN amount END), 0) as weekday_total,
      COUNT(CASE WHEN EXTRACT(DOW FROM expense_date) IN (0, 6) THEN 1 END) as weekend_txns,
      COUNT(CASE WHEN EXTRACT(DOW FROM expense_date) NOT IN (0, 6) THEN 1 END) as weekday_txns
     FROM expenses
     WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30`,
    [userId]
  );
  const r = result.rows[0];
  const weekendAvg = parseFloat(r.weekend_txns) > 0 ? parseFloat(r.weekend_total) / 8.6 : 0; // ~8.6 weekend days in 30 days
  const weekdayAvg = parseFloat(r.weekday_txns) > 0 ? parseFloat(r.weekday_total) / 21.4 : 0;

  if (weekendAvg === 0 && weekdayAvg === 0) return null;

  if (weekendAvg > weekdayAvg * 1.5) {
    return {
      type: 'warning', icon: '🎉', priority: 3,
      title: 'Weekend Spender',
      message: `You spend ${Math.round((weekendAvg / Math.max(weekdayAvg, 1) - 1) * 100)}% more on weekends (₵${Math.round(weekendAvg)}/day vs ₵${Math.round(weekdayAvg)}/day).`,
      tip: 'Plan your weekend activities in advance to limit impulse spending.'
    };
  } else if (weekdayAvg > weekendAvg * 1.5) {
    return {
      type: 'positive', icon: '💼', priority: 5,
      title: 'Weekday Spender',
      message: `Most spending happens on weekdays — ₵${Math.round(weekdayAvg)}/day vs ₵${Math.round(weekendAvg)}/day on weekends.`,
      tip: 'Your weekday spending may include commute & meals. Consider meal-prepping.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 4. NO-SPEND DAYS
// ─────────────────────────────────────────────
async function noSpendDaysInsight(userId) {
  const result = await query(
    `SELECT 
      COUNT(DISTINCT d.day) as total_days,
      COUNT(DISTINCT e.expense_date) as spend_days
     FROM generate_series(
       date_trunc('week', CURRENT_DATE)::date, 
       CURRENT_DATE, 
       '1 day'::interval
     ) d(day)
     LEFT JOIN expenses e ON e.expense_date = d.day::date AND e.user_id = $1`,
    [userId]
  );
  const r = result.rows[0];
  const noSpendDays = parseInt(r.total_days) - parseInt(r.spend_days);

  if (noSpendDays >= 3) {
    return {
      type: 'positive', icon: '✨', priority: 2,
      title: `${noSpendDays} No-Spend Days!`,
      message: `You've had ${noSpendDays} days with zero spending this week. Amazing self-control!`,
      tip: 'Challenge yourself to beat this record next week.'
    };
  } else if (noSpendDays === 0 && parseInt(r.total_days) >= 3) {
    return {
      type: 'info', icon: '💡', priority: 4,
      title: 'No Rest Days',
      message: `You've spent money every day this week so far.`,
      tip: 'Try a no-spend day challenge — pick one day and spend nothing.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 5. UNUSUAL SPENDING DETECTION (Spike)
// ─────────────────────────────────────────────
async function unusualSpendingInsight(userId) {
  const result = await query(
    `WITH daily_avg AS (
      SELECT COALESCE(AVG(daily_total), 0) as avg_daily,
             COALESCE(STDDEV(daily_total), 0) as std_daily
      FROM (
        SELECT expense_date, SUM(amount) as daily_total
        FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30
        GROUP BY expense_date
      ) d
    ),
    today AS (
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE user_id = $1 AND expense_date = CURRENT_DATE
    ),
    yesterday AS (
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE user_id = $1 AND expense_date = CURRENT_DATE - 1
    )
    SELECT da.avg_daily, da.std_daily, t.total as today_total, y.total as yesterday_total
    FROM daily_avg da, today t, yesterday y`,
    [userId]
  );
  const r = result.rows[0];
  const avg = parseFloat(r.avg_daily);
  const std = parseFloat(r.std_daily);
  const today = parseFloat(r.today_total);
  const yesterday = parseFloat(r.yesterday_total);

  // Check yesterday if today has no data yet
  const checkAmount = today > 0 ? today : yesterday;
  const checkLabel = today > 0 ? 'Today' : 'Yesterday';

  if (avg > 0 && std > 0 && checkAmount > avg + (std * 1.5)) {
    return {
      type: 'alert', icon: '🔔', priority: 1,
      title: 'Unusual Spending',
      message: `${checkLabel}'s spending (₵${Math.round(checkAmount)}) is significantly above your daily average of ₵${Math.round(avg)}.`,
      tip: 'Check if this was a one-time purchase or an emerging pattern.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 6. CATEGORY TREND (Growing/Shrinking)
// ─────────────────────────────────────────────
async function categoryTrendInsight(userId) {
  const result = await query(
    `WITH current_month AS (
      SELECT category, SUM(amount) as total
      FROM expenses WHERE user_id = $1 AND expense_date >= date_trunc('month', CURRENT_DATE)
      GROUP BY category
    ),
    previous_month AS (
      SELECT category, SUM(amount) as total
      FROM expenses WHERE user_id = $1 
        AND expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        AND expense_date < date_trunc('month', CURRENT_DATE)
      GROUP BY category
    )
    SELECT cm.category, cm.total as current_total, pm.total as previous_total,
      CASE WHEN pm.total = 0 THEN 100
      ELSE ROUND(((cm.total - pm.total) / pm.total * 100), 1) END as change_pct
    FROM current_month cm
    JOIN previous_month pm ON cm.category = pm.category
    WHERE pm.total > 0
    ORDER BY change_pct DESC
    LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const cat = result.rows[0];
  const change = parseFloat(cat.change_pct);

  if (change > 30) {
    return {
      type: 'warning', icon: '📈', priority: 2,
      title: `${cat.category} Rising`,
      message: `${cat.category} spending is up ${change}% this month (₵${Math.round(cat.current_total)} vs ₵${Math.round(cat.previous_total)} last month).`,
      tip: 'Set a budget limit for this category to stay on track.'
    };
  } else if (change < -30) {
    return {
      type: 'positive', icon: '📉', priority: 3,
      title: `${cat.category} Reduced`,
      message: `Great job! ${cat.category} spending is down ${Math.abs(change)}% from last month.`,
      tip: 'You\'re making progress — keep it going!'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 7. BUDGET PROXIMITY WARNING
// ─────────────────────────────────────────────
async function budgetInsight(userId) {
  const result = await query(
    `SELECT b.amount as budget, b.period_type,
      COALESCE(SUM(e.amount), 0) as spent,
      ROUND(COALESCE(SUM(e.amount), 0) / NULLIF(b.amount, 0) * 100, 1) as usage_pct
     FROM budgets b
     LEFT JOIN expenses e ON b.user_id = e.user_id
       AND e.expense_date BETWEEN b.start_date AND b.end_date
     WHERE b.user_id = $1 AND b.is_active = true
     GROUP BY b.amount, b.period_type
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const b = result.rows[0];
  const usage = parseFloat(b.usage_pct) || 0;
  const remaining = parseFloat(b.budget) - parseFloat(b.spent);

  if (usage >= 100) {
    return {
      type: 'alert', icon: '🚨', priority: 0,
      title: 'Budget Exceeded!',
      message: `You've exceeded your ${b.period_type} budget by ₵${Math.round(Math.abs(remaining))}.`,
      tip: 'Review your expenses and adjust spending for the rest of the period.'
    };
  } else if (usage >= 80) {
    return {
      type: 'warning', icon: '⏰', priority: 1,
      title: 'Budget Running Low',
      message: `You've used ${usage}% of your ${b.period_type} budget. Only ₵${Math.round(remaining)} left.`,
      tip: 'Be mindful of non-essential purchases for the rest of the period.'
    };
  } else if (usage <= 40) {
    return {
      type: 'positive', icon: '💰', priority: 5,
      title: 'Budget On Track',
      message: `Only ${usage}% of your ${b.period_type} budget used. ₵${Math.round(remaining)} remaining.`,
      tip: 'Nice pace! Consider putting some aside into savings goals.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 8. SAVINGS GOAL PACE
// ─────────────────────────────────────────────
async function savingsGoalInsight(userId) {
  const result = await query(
    `SELECT title, current_amount, target_amount, deadline,
      ROUND(current_amount / NULLIF(target_amount, 0) * 100, 1) as progress,
      deadline - CURRENT_DATE as days_remaining
     FROM goals
     WHERE user_id = $1 AND status = 'active' AND deadline IS NOT NULL
     ORDER BY deadline ASC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const g = result.rows[0];
  const progress = parseFloat(g.progress) || 0;
  const daysLeft = parseInt(g.days_remaining);
  const remaining = parseFloat(g.target_amount) - parseFloat(g.current_amount);

  if (daysLeft <= 0 && progress < 100) {
    return {
      type: 'warning', icon: '⏳', priority: 1,
      title: 'Goal Deadline Passed',
      message: `"${g.title}" deadline has passed at ${progress}% complete. ₵${Math.round(remaining)} still needed.`,
      tip: 'Consider extending the deadline or adjusting the target.'
    };
  } else if (daysLeft > 0 && daysLeft <= 7 && progress < 90) {
    return {
      type: 'warning', icon: '🎯', priority: 1,
      title: 'Goal Deadline Soon',
      message: `"${g.title}" is due in ${daysLeft} days and you're at ${progress}%.`,
      tip: `You need to save ₵${Math.round(remaining / daysLeft)} per day to make it.`
    };
  } else if (progress >= 90 && progress < 100) {
    return {
      type: 'positive', icon: '🏁', priority: 2,
      title: 'Almost There!',
      message: `"${g.title}" is ${progress}% complete! Just ₵${Math.round(remaining)} more to go.`,
      tip: 'You\'re so close — a little push and you\'ll crush this goal!'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 9. BEST SPENDING DAY
// ─────────────────────────────────────────────
async function bestDayInsight(userId) {
  const result = await query(
    `SELECT TO_CHAR(expense_date, 'Day') as day_name,
      ROUND(AVG(daily_total), 2) as avg_amount
     FROM (
       SELECT expense_date, SUM(amount) as daily_total
       FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 60
       GROUP BY expense_date
     ) d
     GROUP BY TO_CHAR(expense_date, 'Day'), EXTRACT(DOW FROM expense_date)
     ORDER BY avg_amount ASC
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    type: 'info', icon: '📅', priority: 5,
    title: 'Your Best Day',
    message: `${r.day_name.trim()} is your lowest-spending day — averaging ₵${Math.round(r.avg_amount)}.`,
    tip: 'Schedule important purchases on your cheapest day.'
  };
}

// ─────────────────────────────────────────────
// 10. STREAK-BASED INSIGHT
// ─────────────────────────────────────────────
async function streakInsight(userId) {
  const result = await query(
    'SELECT current_streak, longest_streak FROM streaks WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  const s = result.rows[0];
  const current = parseInt(s.current_streak) || 0;
  const longest = parseInt(s.longest_streak) || 0;

  if (current >= 7 && current === longest) {
    return {
      type: 'positive', icon: '🔥', priority: 2,
      title: `${current}-Day Record!`,
      message: `You're on your longest tracking streak ever — ${current} days!`,
      tip: 'Don\'t break the chain! Log today\'s expenses to keep it going.'
    };
  } else if (current >= 7) {
    return {
      type: 'positive', icon: '🔥', priority: 3,
      title: `${current}-Day Streak`,
      message: `You've logged expenses for ${current} days in a row! Your record is ${longest} days.`,
      tip: `${longest - current} more days to beat your record!`
    };
  } else if (current === 0) {
    return {
      type: 'info', icon: '💪', priority: 4,
      title: 'Start a Streak',
      message: 'Log an expense today to start building a streak.',
      tip: 'Consistent tracking is the #1 habit for financial success.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 11. SAVINGS RATE INSIGHT
// ─────────────────────────────────────────────
async function savingsRateInsight(userId) {
  const result = await query(
    `SELECT 
      COALESCE((SELECT SUM(amount) FROM income WHERE user_id = $1 AND income_date >= date_trunc('month', CURRENT_DATE)), 0) as income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= date_trunc('month', CURRENT_DATE)), 0) as expenses`,
    [userId]
  );
  const r = result.rows[0];
  const income = parseFloat(r.income);
  const expenses = parseFloat(r.expenses);
  if (income === 0) return null;

  const rate = ((income - expenses) / income * 100);

  if (rate >= 30) {
    return {
      type: 'positive', icon: '🏆', priority: 2,
      title: `${Math.round(rate)}% Savings Rate`,
      message: `You're saving ${Math.round(rate)}% of your income this month. That's excellent!`,
      tip: 'Financial experts recommend saving at least 20%. You\'re above that!'
    };
  } else if (rate < 0) {
    return {
      type: 'alert', icon: '🚩', priority: 0,
      title: 'Spending > Income',
      message: `You've spent more than you've earned this month. Expenses exceed income by ₵${Math.round(Math.abs(income - expenses))}.`,
      tip: 'Cut non-essential spending immediately and look for extra income sources.'
    };
  } else if (rate < 10) {
    return {
      type: 'warning', icon: '📉', priority: 2,
      title: `Low Savings Rate`,
      message: `You're only saving ${Math.round(rate)}% of your income this month.`,
      tip: 'Try reducing your top spending category by 20% to boost your savings.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 12. PAYMENT METHOD INSIGHT
// ─────────────────────────────────────────────
async function paymentMethodInsight(userId) {
  const result = await query(
    `SELECT payment_method, 
      COUNT(*) as txn_count, 
      SUM(amount) as total,
      ROUND(SUM(amount) / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30), 0) * 100, 1) as pct
     FROM expenses
     WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30
     GROUP BY payment_method ORDER BY total DESC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  if (parseFloat(r.pct) > 70) {
    return {
      type: 'info', icon: '💳', priority: 5,
      title: `${r.payment_method} Dominant`,
      message: `${parseFloat(r.pct)}% of your spending goes through ${r.payment_method}.`,
      tip: r.payment_method === 'Cash' 
        ? 'Cash makes it harder to track. Consider using mobile money for better records.'
        : 'Check your mobile money statement monthly for unauthorized charges.'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 13. DAILY SPENDING FORECAST
// ─────────────────────────────────────────────
async function forecastInsight(userId) {
  const result = await query(
    `WITH monthly_data AS (
      SELECT 
        COALESCE(SUM(amount), 0) as spent_so_far,
        EXTRACT(DAY FROM CURRENT_DATE) as days_passed,
        EXTRACT(DAY FROM date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day') as days_in_month
      FROM expenses
      WHERE user_id = $1 AND expense_date >= date_trunc('month', CURRENT_DATE)
    )
    SELECT *, 
      CASE WHEN days_passed > 0 
        THEN ROUND(spent_so_far / days_passed * days_in_month, 2) 
        ELSE 0 
      END as projected_total
    FROM monthly_data`,
    [userId]
  );
  const r = result.rows[0];
  const projected = parseFloat(r.projected_total);
  const spent = parseFloat(r.spent_so_far);
  const daysLeft = parseInt(r.days_in_month) - parseInt(r.days_passed);

  if (projected === 0 || daysLeft <= 0) return null;

  // Check against budget
  const budgetResult = await query(
    `SELECT amount FROM budgets WHERE user_id = $1 AND is_active = true AND period_type = 'monthly' LIMIT 1`,
    [userId]
  );

  if (budgetResult.rows.length > 0) {
    const budget = parseFloat(budgetResult.rows[0].amount);
    if (projected > budget * 1.1) {
      return {
        type: 'warning', icon: '🔮', priority: 1,
        title: 'Budget Forecast',
        message: `At this pace, you'll spend ₵${Math.round(projected)} this month — ₵${Math.round(projected - budget)} over budget.`,
        tip: `Limit daily spending to ₵${Math.round((budget - spent) / Math.max(daysLeft, 1))} for the rest of the month.`
      };
    }
  }

  return {
    type: 'info', icon: '🔮', priority: 4,
    title: 'Monthly Forecast',
    message: `At your current pace, you'll spend about ₵${Math.round(projected)} this month.`,
    tip: `That's ₵${Math.round(projected / parseInt(r.days_in_month))} per day average.`
  };
}

// ─────────────────────────────────────────────
// MASTER: Generate All Insights
// ─────────────────────────────────────────────
async function generateInsights(userId, options = {}) {
  const { limit = 6, includeAll = false } = options;

  // Run all insight generators in parallel
  const generators = [
    weeklyChangeInsight(userId),
    topCategoryInsight(userId),
    weekendVsWeekdayInsight(userId),
    noSpendDaysInsight(userId),
    unusualSpendingInsight(userId),
    categoryTrendInsight(userId),
    budgetInsight(userId),
    savingsGoalInsight(userId),
    bestDayInsight(userId),
    streakInsight(userId),
    savingsRateInsight(userId),
    paymentMethodInsight(userId),
    forecastInsight(userId),
  ];

  const results = await Promise.allSettled(generators);

  // Collect successful, non-null insights
  let insights = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  // Sort by priority (lower number = higher priority)
  insights.sort((a, b) => a.priority - b.priority);

  // Return limited set unless includeAll
  if (!includeAll) {
    insights = insights.slice(0, limit);
  }

  return insights;
}

module.exports = { generateInsights };
