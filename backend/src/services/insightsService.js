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
      type: 'positive', icon: '🎉', priority: 2, mood: 'celebrate',
      title: 'Money Saver Alert! 🏆',
      message: `Yoooo! You spent ${Math.abs(r.change)}% LESS than last week. That's some serious willpower right there! 💪`,
      tip: 'You\'re on fire! Why not slide those savings into a goal? Future you will throw a party.'
    };
  } else if (parseFloat(r.change) > 25) {
    return {
      type: 'warning', icon: '😅', priority: 1, mood: 'nudge',
      title: 'Wallet Says Ouch!',
      message: `Spending jumped ${r.change}% from last week (₵${Math.round(r.current)} vs ₵${Math.round(r.previous)}). Your wallet felt that one!`,
      tip: 'Deep breath! Check your recent expenses — anything you can pause or cancel?'
    };
  } else if (parseFloat(r.change) > 0) {
    return {
      type: 'info', icon: '📊', priority: 4, mood: 'chill',
      title: 'Slight Creep Up',
      message: `Spending nudged up ${r.change}% from last week. Nothing wild, but keep an eye on it!`,
      tip: 'Small drips fill the bucket. Stay sharp this week! 👀'
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
  const funNames = { 'Food': '🍔 Food', 'Transport': '🚗 Transport', 'Shopping': '🛍️ Shopping', 'Entertainment': '🎬 Entertainment', 'Bills': '📱 Bills', 'Health': '💊 Health', 'Education': '📚 Education' };
  const catName = funNames[cat.category] || cat.category;
  return {
    type: 'info', icon: '🏷️', priority: 3, mood: cat.pct > 40 ? 'nudge' : 'chill',
    title: `#1 Spending: ${catName}`,
    message: `${cat.category} is your main squeeze this month — ${cat.pct}% of all spending (₵${Math.round(cat.total)}, ${cat.txn_count} txns). ${cat.pct > 50 ? 'It\'s living rent-free in your wallet! 😂' : ''}`,
    tip: cat.pct > 40 ? 'Time to set a budget cap for this category — your wallet will thank you! 🙏' : 'Nice balance! Keep spreading the love across categories 📊'
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
      type: 'warning', icon: '🥳', priority: 3, mood: 'nudge',
      title: 'Weekend Warrior! 🎊',
      message: `The vibes are great on weekends but so is the spending — ${Math.round((weekendAvg / Math.max(weekdayAvg, 1) - 1) * 100)}% more than weekdays! (₵${Math.round(weekendAvg)}/day vs ₵${Math.round(weekdayAvg)}/day)`,
      tip: 'Pro move: plan your weekend fun in advance. Free activities exist too! 🌳'
    };
  } else if (weekdayAvg > weekendAvg * 1.5) {
    return {
      type: 'positive', icon: '💼', priority: 5, mood: 'chill',
      title: 'Chill Weekends 🧘',
      message: `You're a weekday spender (₵${Math.round(weekdayAvg)}/day) but weekends are super chill (₵${Math.round(weekendAvg)}/day). Love that!`,
      tip: 'Weekday costs often = commute + food. Try meal-prepping on Sundays! 🍱'
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
      type: 'positive', icon: '✨', priority: 2, mood: 'celebrate',
      title: `${noSpendDays} Zero-Spend Days! 🤑`,
      message: `${noSpendDays} days of ZERO spending this week?! You're built different! 🏅`,
      tip: 'Can you beat this next week? Challenge accepted? 💪'
    };
  } else if (noSpendDays === 0 && parseInt(r.total_days) >= 3) {
    return {
      type: 'info', icon: '🤔', priority: 4, mood: 'nudge',
      title: 'Money Goes Brrrr',
      message: `You've spent money every single day this week. Your wallet hasn't had a day off! 😅`,
      tip: 'Fun challenge: pick one day and spend absolutely NOTHING. Can you do it? 🎯'
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
      type: 'alert', icon: '�', priority: 1, mood: 'alert',
      title: 'Whoa, Big Spender! 💸',
      message: `${checkLabel}'s spending (₵${Math.round(checkAmount)}) is WAY above your usual ₵${Math.round(avg)}/day. Something special going on?`,
      tip: 'No judgment! Just check if it was a one-off or the start of a pattern 🔍'
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
      type: 'warning', icon: '📈', priority: 2, mood: 'nudge',
      title: `${cat.category} Going Up! 🆙`,
      message: `${cat.category} spending shot up ${change}% this month (₵${Math.round(cat.current_total)} vs ₵${Math.round(cat.previous_total)} last month). It's having a growth spurt! 😬`,
      tip: 'Time to set a spending cap for this category before it gets wild 🎪'
    };
  } else if (change < -30) {
    return {
      type: 'positive', icon: '📉', priority: 3, mood: 'celebrate',
      title: `${cat.category} Tamed! 🦁`,
      message: `You crushed it! ${cat.category} is down ${Math.abs(change)}% from last month. That's real progress!`,
      tip: 'You\'re proving you can control your spending. Legend! 🌟'
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
      type: 'alert', icon: '�', priority: 0, mood: 'alert',
      title: 'Budget: Game Over! 🎮',
      message: `Uh oh! You went ₵${Math.round(Math.abs(remaining))} over your ${b.period_type} budget. The budget said "I'm out!" 😵`,
      tip: 'Time for damage control — review your expenses and tighten up for the rest of the period!'
    };
  } else if (usage >= 80) {
    return {
      type: 'warning', icon: '⏰', priority: 1, mood: 'nudge',
      title: 'Budget Getting Thin! 🫣',
      message: `${usage}% of your ${b.period_type} budget is gone! Only ₵${Math.round(remaining)} left. It's getting spicy!`,
      tip: 'Easy does it — skip the "treat yourself" moments for now 🧘'
    };
  } else if (usage <= 40) {
    return {
      type: 'positive', icon: '💰', priority: 5, mood: 'celebrate',
      title: 'Budget Boss! 😎',
      message: `Only ${usage}% used and ₵${Math.round(remaining)} still in the tank. You're running this budget like a CEO!`,
      tip: 'Look at you go! Maybe slide some of that extra into a savings goal? 🎯'
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
      type: 'warning', icon: '⏳', priority: 1, mood: 'nudge',
      title: 'Goal Deadline Passed 😬',
      message: `"${g.title}" deadline has passed at ${progress}%. Still ₵${Math.round(remaining)} to go... but it's not over!`,
      tip: 'Extend the deadline — progress beats perfection every time! 💪'
    };
  } else if (daysLeft > 0 && daysLeft <= 7 && progress < 90) {
    return {
      type: 'warning', icon: '🎯', priority: 1, mood: 'nudge',
      title: 'Crunch Time! ⏱️',
      message: `"${g.title}" is due in ${daysLeft} days and you're at ${progress}%. Time to sprint!`,
      tip: `Save ₵${Math.round(remaining / daysLeft)}/day and you'll make it. Let's goooo! 🏃`
    };
  } else if (progress >= 90 && progress < 100) {
    return {
      type: 'positive', icon: '🏁', priority: 2, mood: 'celebrate',
      title: 'SO Close! 🤩',
      message: `"${g.title}" is ${progress}% done! Just ₵${Math.round(remaining)} more and you're a LEGEND!`,
      tip: 'You can taste it! One more push and this goal is CRUSHED! 💥'
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
    type: 'info', icon: '📅', priority: 5, mood: 'chill',
    title: `${r.day_name.trim()} = Chill Day 🧊`,
    message: `${r.day_name.trim()} is when your wallet gets to relax — only ₵${Math.round(r.avg_amount)} on average. It's your money's favorite day!`,
    tip: 'Fun hack: schedule big purchases on your cheapest day of the week 🧠'
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
      type: 'positive', icon: '🔥', priority: 2, mood: 'celebrate',
      title: `${current}-Day RECORD! 🏅`,
      message: `YOOO! ${current} days straight — your LONGEST streak EVER! You're absolutely unstoppable! 🚀`,
      tip: 'DON\'T STOP NOW! Log today\'s expenses and keep the fire burning! 🔥🔥🔥'
    };
  } else if (current >= 7) {
    return {
      type: 'positive', icon: '🔥', priority: 3, mood: 'celebrate',
      title: `${current}-Day Streak! 💪`,
      message: `${current} days of consistent tracking! You're on a roll! Record is ${longest} days.`,
      tip: `Only ${longest - current} more days to smash your record! You got this! 🎯`
    };
  } else if (current === 0) {
    return {
      type: 'info', icon: '😴', priority: 4, mood: 'nudge',
      title: 'Streak: Sleeping 💤',
      message: 'Your tracking streak is taking a nap! Wake it up by logging an expense today.',
      tip: 'Fun fact: people who track daily save 2x more! Let\'s go! 🚀'
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
      type: 'positive', icon: '🏆', priority: 2, mood: 'celebrate',
      title: `${Math.round(rate)}% Saved! KING! 👑`,
      message: `You're stacking ${Math.round(rate)}% of your income this month. That's absolutely elite status! 💎`,
      tip: 'Experts say save 20%. You\'re ABOVE that! Future millionaire in the making 💸'
    };
  } else if (rate < 0) {
    return {
      type: 'alert', icon: '🚩', priority: 0, mood: 'alert',
      title: 'Houston, We Have a Problem! 🫠',
      message: `Expenses beat income by ₵${Math.round(Math.abs(income - expenses))} this month. Your bank account is doing the struggle dance! 😅`,
      tip: 'Real talk: cut one non-essential expense TODAY. Every cedi counts! 💪'
    };
  } else if (rate < 10) {
    return {
      type: 'warning', icon: '📉', priority: 2, mood: 'nudge',
      title: 'Savings on Life Support 🏥',
      message: `Only ${Math.round(rate)}% saved this month. Your savings account is looking lonely! 😢`,
      tip: 'Quick win: reduce your top spending category by 20%. Small moves, big results! 🎯'
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
      type: 'info', icon: '💳', priority: 5, mood: 'chill',
      title: `${r.payment_method} Fan! 📱`,
      message: `${parseFloat(r.pct)}% of your money flows through ${r.payment_method}. It's your ride-or-die payment method! 🤝`,
      tip: r.payment_method === 'Cash' 
        ? 'Cash is sneaky — it disappears without a trace! Try MoMo for better tracking 📲'
        : 'Don\'t forget to check your MoMo statement monthly. Stay vigilant! 🕵️'
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
        type: 'warning', icon: '🔮', priority: 1, mood: 'nudge',
        title: 'Crystal Ball Says... 🔮',
        message: `If you keep this pace, you'll hit ₵${Math.round(projected)} this month — that's ₵${Math.round(projected - budget)} OVER budget! The math ain't mathing! 😬`,
        tip: `Mission: spend max ₵${Math.round((budget - spent) / Math.max(daysLeft, 1))}/day for the rest of the month. You can do it! 💪`
      };
    }
  }

  return {
    type: 'info', icon: '🔮', priority: 4, mood: 'chill',
    title: 'Future Vision 🔮',
    message: `My crystal ball says you'll spend ~₵${Math.round(projected)} this month at this pace. That's ₵${Math.round(projected / parseInt(r.days_in_month))}/day.`,
    tip: 'Knowledge is power! Now you can plan ahead like a boss 🧠'
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
