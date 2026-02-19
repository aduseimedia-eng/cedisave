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
// 14. MORNING vs EVENING SPENDING
// ─────────────────────────────────────────────
async function timeOfDayInsight(userId) {
  const result = await query(
    `SELECT 
      COUNT(CASE WHEN EXTRACT(HOUR FROM created_at) < 12 THEN 1 END) as morning_txns,
      COALESCE(SUM(CASE WHEN EXTRACT(HOUR FROM created_at) < 12 THEN amount END), 0) as morning_total,
      COUNT(CASE WHEN EXTRACT(HOUR FROM created_at) >= 17 THEN 1 END) as evening_txns,
      COALESCE(SUM(CASE WHEN EXTRACT(HOUR FROM created_at) >= 17 THEN amount END), 0) as evening_total,
      COUNT(*) as total_txns
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30`,
    [userId]
  );
  const r = result.rows[0];
  const mPct = parseInt(r.total_txns) > 0 ? Math.round(parseInt(r.morning_txns) / parseInt(r.total_txns) * 100) : 0;
  const ePct = parseInt(r.total_txns) > 0 ? Math.round(parseInt(r.evening_txns) / parseInt(r.total_txns) * 100) : 0;

  if (mPct >= 50) {
    return {
      type: 'info', icon: '🌅', priority: 5, mood: 'chill',
      title: 'Early Bird Spender! 🐦',
      message: `${mPct}% of your transactions happen before noon. You're out here swiping before lunch! ☀️`,
      tip: 'Morning spending is often impulsive (coffee, transport). Try a no-spend-before-noon day! 🧘'
    };
  } else if (ePct >= 50) {
    return {
      type: 'info', icon: '🌙', priority: 5, mood: 'chill',
      title: 'Night Owl Spender! 🦉',
      message: `${ePct}% of your money flows out after 5 PM. The evening vibes hit different on your wallet! 🌃`,
      tip: 'Evening spending = dining out + entertainment. Budget for fun nights separately! 🎯'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 15. BIGGEST SINGLE EXPENSE
// ─────────────────────────────────────────────
async function biggestExpenseInsight(userId) {
  const result = await query(
    `SELECT amount, category, note, expense_date,
      (SELECT AVG(amount) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30) as avg_amount
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30
     ORDER BY amount DESC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  const multiplier = parseFloat(r.avg_amount) > 0 ? (parseFloat(r.amount) / parseFloat(r.avg_amount)).toFixed(1) : 0;

  if (multiplier > 3) {
    return {
      type: 'warning', icon: '💥', priority: 3, mood: 'nudge',
      title: 'Monster Expense! 🦖',
      message: `Your biggest spend was ₵${Math.round(r.amount)} on ${r.category}${r.note ? ` (${r.note})` : ''} — that's ${multiplier}x your average transaction! BOOM! 💣`,
      tip: 'Big purchases deserve big planning. Next time, sleep on it for 24 hours before spending! 😴'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 16. RECURRING EXPENSE BURDEN
// ─────────────────────────────────────────────
async function recurringBurdenInsight(userId) {
  const result = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN is_recurring = true THEN amount END), 0) as recurring_total,
      COALESCE(SUM(amount), 0) as total,
      COUNT(CASE WHEN is_recurring = true THEN 1 END) as recurring_count
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30`,
    [userId]
  );
  const r = result.rows[0];
  const pct = parseFloat(r.total) > 0 ? Math.round(parseFloat(r.recurring_total) / parseFloat(r.total) * 100) : 0;

  if (pct > 50) {
    return {
      type: 'warning', icon: '🔄', priority: 2, mood: 'nudge',
      title: 'Subscription Overload! 📦',
      message: `${pct}% of your spending (₵${Math.round(r.recurring_total)}) is recurring expenses! That's ${r.recurring_count} subscriptions eating your cedis on autopilot! 🤖`,
      tip: 'Time for a subscription audit — cancel what you don\'t use. Your wallet is begging! 🙏'
    };
  } else if (parseInt(r.recurring_count) > 0 && pct < 20) {
    return {
      type: 'positive', icon: '✅', priority: 5, mood: 'celebrate',
      title: 'Subscription Ninja! 🥷',
      message: `Only ${pct}% of spending is recurring. You keep your subscriptions lean and mean! 💪`,
      tip: 'Low fixed costs = more freedom. That\'s financial flexibility goals! 🎯'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 17. CATEGORY DIVERSITY INDEX
// ─────────────────────────────────────────────
async function categoryDiversityInsight(userId) {
  const result = await query(
    `SELECT COUNT(DISTINCT category) as cat_count,
      (SELECT category FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30 
       GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1) as top_cat,
      (SELECT ROUND(SUM(amount) / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30), 0) * 100, 1)
       FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30
       GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1) as top_pct
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30`,
    [userId]
  );
  const r = result.rows[0];
  const catCount = parseInt(r.cat_count) || 0;
  const topPct = parseFloat(r.top_pct) || 0;

  if (catCount >= 6 && topPct < 35) {
    return {
      type: 'positive', icon: '🌈', priority: 5, mood: 'celebrate',
      title: 'Balanced Baller! ⚖️',
      message: `You spread money across ${catCount} categories and no single one dominates (max ${topPct}%). That's diversified spending! 🎨`,
      tip: 'Balanced spending = balanced life. You\'re making smart money moves! 🌟'
    };
  } else if (catCount <= 2) {
    return {
      type: 'info', icon: '🎯', priority: 5, mood: 'chill',
      title: 'Laser Focused! 🔬',
      message: `Just ${catCount} spending ${catCount === 1 ? 'category' : 'categories'} this month. You know exactly where your money goes! 🧐`,
      tip: 'Focused spending is powerful — just make sure essentials are covered! ✅'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 18. EXPENSE FREQUENCY PATTERN
// ─────────────────────────────────────────────
async function frequencyInsight(userId) {
  const result = await query(
    `SELECT COUNT(*) as total_txns,
      COUNT(DISTINCT expense_date) as active_days,
      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT expense_date), 0), 1) as txns_per_day
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 14`,
    [userId]
  );
  const r = result.rows[0];
  const perDay = parseFloat(r.txns_per_day) || 0;

  if (perDay >= 5) {
    return {
      type: 'warning', icon: '⚡', priority: 3, mood: 'nudge',
      title: 'Transaction Machine! 🤖',
      message: `${perDay} transactions per day?! Your wallet barely gets a chance to close! That's ${r.total_txns} txns in 2 weeks! 😤`,
      tip: 'Try batching purchases — one trip instead of five. Fewer swipes = fewer temptations! 🛒'
    };
  } else if (perDay > 0 && perDay <= 1.5) {
    return {
      type: 'positive', icon: '🧘', priority: 5, mood: 'chill',
      title: 'Thoughtful Spender! 🤓',
      message: `Only ~${perDay} transactions per day. You think before you spend! Mindful money moves! 🧠`,
      tip: 'Fewer transactions often mean intentional purchases. Quality over quantity! ✨'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 19. MICRO-SPEND TRACKER (Death by 1000 cuts)
// ─────────────────────────────────────────────
async function microSpendInsight(userId) {
  const result = await query(
    `SELECT COUNT(*) as small_count,
      COALESCE(SUM(amount), 0) as small_total,
      (SELECT COUNT(*) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30) as total_count
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30 AND amount <= 10`,
    [userId]
  );
  const r = result.rows[0];
  const smallPct = parseInt(r.total_count) > 0 ? Math.round(parseInt(r.small_count) / parseInt(r.total_count) * 100) : 0;

  if (parseInt(r.small_count) >= 15 && smallPct > 40) {
    return {
      type: 'warning', icon: '🐜', priority: 3, mood: 'nudge',
      title: 'Death by Small Cuts! 🪓',
      message: `${r.small_count} purchases under ₵10 added up to ₵${Math.round(r.small_total)} this month! Those "tiny" spends are NOT tiny! 😱`,
      tip: 'Toffees, pure water, snacks... they add up! Track these closely — awareness is power! 🔋'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 20. INCOME vs EXPENSE TIMING
// ─────────────────────────────────────────────
async function incomeTimingInsight(userId) {
  const result = await query(
    `SELECT 
      EXTRACT(DAY FROM income_date) as pay_day,
      amount as income_amount
     FROM income WHERE user_id = $1 AND income_date >= CURRENT_DATE - 60
     ORDER BY income_date DESC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const payDay = parseInt(result.rows[0].pay_day);

  // Check spending in first 7 days after payday
  const spendResult = await query(
    `SELECT COALESCE(SUM(amount), 0) as first_week,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses 
       WHERE user_id = $1 AND expense_date >= date_trunc('month', CURRENT_DATE)) as month_total
     FROM expenses 
     WHERE user_id = $1 
       AND EXTRACT(DAY FROM expense_date) BETWEEN $2 AND $2 + 7
       AND expense_date >= CURRENT_DATE - 30`,
    [userId, payDay]
  );
  const s = spendResult.rows[0];
  const firstWeekPct = parseFloat(s.month_total) > 0 
    ? Math.round(parseFloat(s.first_week) / parseFloat(s.month_total) * 100) : 0;

  if (firstWeekPct > 50) {
    return {
      type: 'warning', icon: '💨', priority: 2, mood: 'nudge',
      title: 'Payday FOMO! 🏃',
      message: `${firstWeekPct}% of your monthly spending happens right after payday! The money barely says hello before it bounces! 👋💸`,
      tip: 'Tip: move savings FIRST on payday, then spend what\'s left. Pay yourself first! 🥇'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 21. GOAL MULTIPLIER (What you could save)
// ─────────────────────────────────────────────
async function goalMultiplierInsight(userId) {
  const result = await query(
    `SELECT 
      (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30 AND category IN ('Entertainment', 'Shopping')) as fun_spending,
      (SELECT target_amount - current_amount FROM goals WHERE user_id = $1 AND status = 'active' ORDER BY deadline ASC LIMIT 1) as goal_remaining,
      (SELECT title FROM goals WHERE user_id = $1 AND status = 'active' ORDER BY deadline ASC LIMIT 1) as goal_title`,
    [userId]
  );
  const r = result.rows[0];
  const fun = parseFloat(r.fun_spending) || 0;
  const goalLeft = parseFloat(r.goal_remaining);
  const goalTitle = r.goal_title;

  if (fun > 0 && goalLeft > 0 && goalTitle) {
    const months = Math.ceil(goalLeft / (fun * 0.5));
    if (months <= 6) {
      return {
        type: 'info', icon: '🧮', priority: 3, mood: 'nudge',
        title: 'The Math is Mathing! 🤯',
        message: `If you cut entertainment + shopping by 50%, you'd complete "${goalTitle}" in just ${months} month${months > 1 ? 's' : ''}! That's ₵${Math.round(fun * 0.5)}/month toward your dream! 💭`,
        tip: 'You don\'t have to stop fun — just halve it! Your future self is counting on you 🤝'
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 22. BILL WARNING (Upcoming bills)
// ─────────────────────────────────────────────
async function billWarningInsight(userId) {
  const result = await query(
    `SELECT title, amount, due_date, 
      due_date - CURRENT_DATE as days_until
     FROM bill_reminders 
     WHERE user_id = $1 AND is_active = true AND is_paid = false
       AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
     ORDER BY due_date ASC LIMIT 3`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const bills = result.rows;
  const total = bills.reduce((sum, b) => sum + parseFloat(b.amount), 0);

  if (bills.length >= 2) {
    return {
      type: 'alert', icon: '📋', priority: 1, mood: 'alert',
      title: `${bills.length} Bills Coming! 😰`,
      message: `${bills.length} bills totaling ₵${Math.round(total)} are due this week! ${bills.map(b => `${b.title} (₵${Math.round(b.amount)})`).join(', ')}. Wallet, brace yourself! 🛡️`,
      tip: 'Set aside the bill money now before it gets spent elsewhere! Lock it in! 🔒'
    };
  } else {
    const b = bills[0];
    return {
      type: 'warning', icon: '🔔', priority: 2, mood: 'nudge',
      title: `Bill Alert: ${b.title}! ⏰`,
      message: `"${b.title}" (₵${Math.round(b.amount)}) is due in ${b.days_until} day${parseInt(b.days_until) !== 1 ? 's' : ''}! Don't let it sneak up on you! 🥷`,
      tip: 'Pro tip: mark it paid in Bills page once done. Stay on top of your bills game! 📱'
    };
  }
}

// ─────────────────────────────────────────────
// 23. SPENDING VELOCITY (Accelerating/Decelerating)
// ─────────────────────────────────────────────
async function velocityInsight(userId) {
  const result = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN expense_date >= CURRENT_DATE - 7 THEN amount END), 0) as last_7,
      COALESCE(SUM(CASE WHEN expense_date >= CURRENT_DATE - 14 AND expense_date < CURRENT_DATE - 7 THEN amount END), 0) as prev_7,
      COALESCE(SUM(CASE WHEN expense_date >= CURRENT_DATE - 21 AND expense_date < CURRENT_DATE - 14 THEN amount END), 0) as oldest_7
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 21`,
    [userId]
  );
  const r = result.rows[0];
  const w1 = parseFloat(r.oldest_7);
  const w2 = parseFloat(r.prev_7);
  const w3 = parseFloat(r.last_7);

  if (w1 > 0 && w2 > 0 && w3 > 0) {
    if (w3 > w2 && w2 > w1) {
      const accel = Math.round((w3 / w1 - 1) * 100);
      return {
        type: 'alert', icon: '🚀', priority: 1, mood: 'alert',
        title: 'Spending Speeding Up! 🏎️',
        message: `Your spending has been INCREASING for 3 straight weeks! Up ${accel}% from 3 weeks ago. The pedal is being pushed! 💨`,
        tip: 'Time to pump the brakes! Review this week\'s expenses and cut the extras 🛑'
      };
    } else if (w3 < w2 && w2 < w1) {
      const decel = Math.round((1 - w3 / w1) * 100);
      return {
        type: 'positive', icon: '📉', priority: 2, mood: 'celebrate',
        title: 'Spending Slowing Down! 🎉',
        message: `3 weeks of DECREASING spending! Down ${decel}% overall. You're getting tighter with the cedis! 💎`,
        tip: 'This is how financial freedom starts! Keep the momentum going! 🏃‍♂️💨'
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 24. ROUND NUMBER DETECTION
// ─────────────────────────────────────────────
async function roundNumberInsight(userId) {
  const result = await query(
    `SELECT 
      COUNT(CASE WHEN amount::int % 10 = 0 THEN 1 END) as round_count,
      COUNT(*) as total_count
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30`,
    [userId]
  );
  const r = result.rows[0];
  const pct = parseInt(r.total_count) > 0 ? Math.round(parseInt(r.round_count) / parseInt(r.total_count) * 100) : 0;

  if (pct > 60 && parseInt(r.total_count) >= 10) {
    return {
      type: 'info', icon: '🔢', priority: 6, mood: 'chill',
      title: 'Round Number Lover! 🎱',
      message: `${pct}% of your expenses are round numbers (₵10, ₵50, etc). You either love neat numbers or you're estimating! 🤔`,
      tip: 'If you\'re rounding up, try entering exact amounts. Every pesewa counts for accurate tracking! 💰'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 25. CATEGORY LOYALTY (Same category streak)
// ─────────────────────────────────────────────
async function categoryLoyaltyInsight(userId) {
  const result = await query(
    `SELECT category, COUNT(*) as streak
     FROM (
       SELECT category, expense_date,
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
       FROM expenses WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20
     ) recent
     WHERE rn <= 10
     GROUP BY category ORDER BY streak DESC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];

  if (parseInt(r.streak) >= 5) {
    const funReacts = { 'Food': 'Your stomach is running the show! 🍕', 'Transport': 'Going places... literally! 🚌', 'Shopping': 'The shops know you by name! 🛍️', 'Entertainment': 'Living your best life! 🎭' };
    return {
      type: 'info', icon: '🔄', priority: 4, mood: 'nudge',
      title: `${r.category} on Repeat! 🎵`,
      message: `${r.streak} of your last 10 expenses are ${r.category}. ${funReacts[r.category] || 'That\'s quite the pattern! 🧐'}`,
      tip: 'Variety is the spice of life — and budgets! Make sure this pattern is intentional 🎯'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 26. EXPENSE-FREE WEEKEND CHECK
// ─────────────────────────────────────────────
async function expenseFreeWeekendInsight(userId) {
  const result = await query(
    `SELECT COUNT(*) as weekend_expenses
     FROM expenses 
     WHERE user_id = $1 
       AND expense_date >= CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int)
       AND EXTRACT(DOW FROM expense_date) IN (0, 6)`,
    [userId]
  );
  const count = parseInt(result.rows[0].weekend_expenses) || 0;

  if (count === 0) {
    const dow = new Date().getDay();
    if (dow === 0 || dow === 6) {
      return {
        type: 'positive', icon: '🏖️', priority: 2, mood: 'celebrate',
        title: 'Zero-Spend Weekend! 🤑',
        message: 'This weekend: ₵0 spent! Your wallet is having the time of its life! That\'s elite discipline! 👑',
        tip: 'Zero-spend weekends are the ultimate flex. Save this streak! 💪'
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 27. DAILY AVERAGE INSIGHT
// ─────────────────────────────────────────────
async function dailyAverageInsight(userId) {
  const result = await query(
    `SELECT 
      ROUND(AVG(daily_total), 2) as avg_daily,
      MIN(daily_total) as min_daily,
      MAX(daily_total) as max_daily
     FROM (
       SELECT expense_date, SUM(amount) as daily_total
       FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30
       GROUP BY expense_date
     ) d`,
    [userId]
  );
  if (result.rows.length === 0 || !result.rows[0].avg_daily) return null;
  const r = result.rows[0];
  const avg = parseFloat(r.avg_daily);
  const range = parseFloat(r.max_daily) - parseFloat(r.min_daily);

  if (avg > 0) {
    const monthProjection = avg * 30;
    return {
      type: 'info', icon: '📊', priority: 4, mood: 'chill',
      title: `₵${Math.round(avg)}/Day Life! 💳`,
      message: `Your daily spending averages ₵${Math.round(avg)}. Range: ₵${Math.round(r.min_daily)} (chillest) to ₵${Math.round(r.max_daily)} (biggest). Monthly pace: ~₵${Math.round(monthProjection)} 📈`,
      tip: 'Knowing your daily number is a superpower. Try to beat it tomorrow! 🎯'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 28. MONEY PERSONALITY
// ─────────────────────────────────────────────
async function moneyPersonalityInsight(userId) {
  const result = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN category IN ('Food', 'Transport', 'Bills', 'Health') THEN amount END), 0) as needs,
      COALESCE(SUM(CASE WHEN category IN ('Entertainment', 'Shopping') THEN amount END), 0) as wants,
      COALESCE(SUM(amount), 0) as total,
      COUNT(DISTINCT category) as cat_count
     FROM expenses WHERE user_id = $1 AND expense_date >= CURRENT_DATE - 30`,
    [userId]
  );
  const r = result.rows[0];
  const total = parseFloat(r.total);
  if (total === 0) return null;

  const needsPct = Math.round(parseFloat(r.needs) / total * 100);
  const wantsPct = Math.round(parseFloat(r.wants) / total * 100);

  let personality, icon, msg;
  if (needsPct > 70) {
    personality = 'The Practical One 🧱'; icon = '🏗️';
    msg = `${needsPct}% of your spending goes to essentials. You're all business, no fluff! Super responsible! 🫡`;
  } else if (wantsPct > 50) {
    personality = 'The Fun Seeker 🎢'; icon = '🎉';
    msg = `${wantsPct}% goes to wants (shopping + entertainment). You live for the vibes! YOLO energy! 🌈`;
  } else if (parseInt(r.cat_count) >= 5 && needsPct >= 40 && needsPct <= 60) {
    personality = 'The Balanced One ⚖️'; icon = '🧠';
    msg = `Needs: ${needsPct}%, Wants: ${wantsPct}%, ${r.cat_count} categories. You've found the sweet spot between fun and responsible! 🌟`;
  } else {
    return null;
  }

  return {
    type: 'info', icon, priority: 4, mood: 'chill',
    title: personality,
    message: msg,
    tip: 'Your money personality shapes your financial future. Embrace it — but keep it balanced! 💎'
  };
}

// ─────────────────────────────────────────────
// 29. GOAL PROGRESS CELEBRATION
// ─────────────────────────────────────────────
async function goalProgressInsight(userId) {
  const result = await query(
    `SELECT title, current_amount, target_amount,
      ROUND(current_amount / NULLIF(target_amount, 0) * 100, 1) as progress
     FROM goals WHERE user_id = $1 AND status = 'active'
     ORDER BY (current_amount / NULLIF(target_amount, 0)) DESC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const g = result.rows[0];
  const progress = parseFloat(g.progress) || 0;

  if (progress >= 50 && progress < 90) {
    return {
      type: 'positive', icon: '🏔️', priority: 3, mood: 'celebrate',
      title: `Halfway Hero! 🦸`,
      message: `"${g.title}" is ${progress}% done! You've saved ₵${Math.round(g.current_amount)} of ₵${Math.round(g.target_amount)}. The finish line is in sight! 🏁`,
      tip: 'You\'ve come too far to quit now! Every cedi gets you closer! 💪'
    };
  } else if (progress >= 25 && progress < 50) {
    return {
      type: 'info', icon: '🌱', priority: 4, mood: 'chill',
      title: `Goal Growing! 🌿`,
      message: `"${g.title}" is ${progress}% funded (₵${Math.round(g.current_amount)} / ₵${Math.round(g.target_amount)}). Your savings seed is sprouting! 🌻`,
      tip: 'Keep watering your goal! Consistency beats intensity every time 🚿'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 30. XP & LEVEL INSIGHT
// ─────────────────────────────────────────────
async function xpLevelInsight(userId) {
  const result = await query(
    `SELECT total_xp, level FROM user_xp WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  const xp = parseInt(r.total_xp) || 0;
  const level = parseInt(r.level) || 1;
  const nextLevelXP = level * 500;
  const xpToGo = nextLevelXP - xp;

  if (xpToGo <= 100 && xpToGo > 0) {
    return {
      type: 'positive', icon: '⬆️', priority: 2, mood: 'celebrate',
      title: `Level ${level + 1} is RIGHT THERE! 🎮`,
      message: `Only ${xpToGo} XP to Level ${level + 1}! You're so close you can taste it! Keep logging and saving! 🏋️`,
      tip: 'Log expenses, complete challenges, and hit savings milestones for easy XP! 🎯'
    };
  } else if (level >= 5) {
    return {
      type: 'positive', icon: '👑', priority: 5, mood: 'celebrate',
      title: `Level ${level} Legend! 🏅`,
      message: `${xp} total XP and Level ${level}! You're a certified KudiPal power user! Most people don't make it this far! 🌟`,
      tip: 'Share your level with friends and challenge them to beat it! 🤝'
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// MASTER: Generate All Insights
// ─────────────────────────────────────────────
async function generateInsights(userId, options = {}) {
  const { limit = 10, includeAll = false } = options;

  // Generator names mapped to data source labels
  const generatorMeta = [
    { fn: weeklyChangeInsight(userId), source: 'Weekly Expenses' },
    { fn: topCategoryInsight(userId), source: '30-Day Categories' },
    { fn: weekendVsWeekdayInsight(userId), source: '30-Day Patterns' },
    { fn: noSpendDaysInsight(userId), source: 'This Week' },
    { fn: unusualSpendingInsight(userId), source: 'Daily Spending' },
    { fn: categoryTrendInsight(userId), source: 'Monthly Trends' },
    { fn: budgetInsight(userId), source: 'Active Budget' },
    { fn: savingsGoalInsight(userId), source: 'Savings Goals' },
    { fn: bestDayInsight(userId), source: '60-Day History' },
    { fn: streakInsight(userId), source: 'Your Streak' },
    { fn: savingsRateInsight(userId), source: 'Income vs Expenses' },
    { fn: paymentMethodInsight(userId), source: 'Payment Methods' },
    { fn: forecastInsight(userId), source: 'Monthly Forecast' },
    { fn: timeOfDayInsight(userId), source: '30-Day Timing' },
    { fn: biggestExpenseInsight(userId), source: '30-Day Expenses' },
    { fn: recurringBurdenInsight(userId), source: 'Recurring Bills' },
    { fn: categoryDiversityInsight(userId), source: 'Category Mix' },
    { fn: frequencyInsight(userId), source: '14-Day Frequency' },
    { fn: microSpendInsight(userId), source: 'Small Purchases' },
    { fn: incomeTimingInsight(userId), source: 'Payday Pattern' },
    { fn: goalMultiplierInsight(userId), source: 'Goals + Spending' },
    { fn: billWarningInsight(userId), source: 'Upcoming Bills' },
    { fn: velocityInsight(userId), source: '3-Week Velocity' },
    { fn: roundNumberInsight(userId), source: 'Expense Amounts' },
    { fn: categoryLoyaltyInsight(userId), source: 'Recent 10 Txns' },
    { fn: expenseFreeWeekendInsight(userId), source: 'This Weekend' },
    { fn: dailyAverageInsight(userId), source: '30-Day Average' },
    { fn: moneyPersonalityInsight(userId), source: 'Spending Profile' },
    { fn: goalProgressInsight(userId), source: 'Goal Progress' },
    { fn: xpLevelInsight(userId), source: 'Your XP & Level' },
  ];

  // Run all 30 insight generators in parallel
  const results = await Promise.allSettled(generatorMeta.map(g => g.fn));

  // Collect successful, non-null insights with source tags
  let insights = results
    .map((r, i) => {
      if (r.status === 'fulfilled' && r.value !== null) {
        return { ...r.value, source: generatorMeta[i].source };
      }
      return null;
    })
    .filter(Boolean);

  // Sort by priority (lower number = higher priority)
  insights.sort((a, b) => a.priority - b.priority);

  // Return limited set unless includeAll
  if (!includeAll) {
    insights = insights.slice(0, limit);
  }

  return insights;
}

module.exports = { generateInsights };
