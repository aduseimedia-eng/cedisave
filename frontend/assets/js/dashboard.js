// KudiPal - Dashboard Logic

utils.requireAuth();

let userData = null;
let budgetData = null;

// Get time-based greeting
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Get initials from name
function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Load profile picture from API (via userPreferences)
function loadProfilePicture() {
  // Get profile picture from user preferences (loaded from API)
  const savedPicture = (typeof getUserPreference === 'function') 
    ? getUserPreference('profile_picture') 
    : null;
  const avatarEl = document.getElementById('userAvatar');
  const initialsEl = document.getElementById('avatarInitials');
  
  if (savedPicture && avatarEl) {
    avatarEl.innerHTML = `<img src="${savedPicture}" alt="Profile">`;
    return true;
  } else if (initialsEl && userData) {
    initialsEl.textContent = getInitials(userData.name);
  }
  return false;
}

// Initialize dashboard
async function initDashboard() {
  try {
    // Set greeting
    document.getElementById('greetingTime').textContent = getTimeGreeting();
    
    // Load user profile (this also syncs preferences)
    const profileResponse = await api.getProfile();
    userData = profileResponse.data;
    
    document.getElementById('userName').textContent = userData.name || 'Welcome!';
    
    // Load profile picture from profile data
    const avatarEl = document.getElementById('userAvatar');
    const initialsEl = document.getElementById('avatarInitials');
    
    if (userData.profile_picture && avatarEl) {
      avatarEl.innerHTML = `<img src="${userData.profile_picture}" alt="Profile">`;
    } else if (initialsEl) {
      initialsEl.textContent = getInitials(userData.name);
    }

    // Load all dashboard data
    await Promise.all([
      loadFinancialSummary(),
      loadRecentExpenses(),
      loadBudget(),
      loadGamificationData()
    ]);

  } catch (error) {
    console.error('Dashboard init error:', error);
    utils.showAlert('Failed to load dashboard data', 'error');
  }
}

// Load financial summary
async function loadFinancialSummary() {
  try {
    const summaryResponse = await api.getExpenseSummary('month');
    const summary = summaryResponse.data.summary || summaryResponse.data;
    const totalExpenses = summary.total_amount || summary.total || 0;

    // Get income for the month
    const dateRange = utils.getDateRange ? utils.getDateRange('month') : {};
    const incomeResponse = await api.getIncome(dateRange);
    const totalIncome = incomeResponse.data.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

    // Update balance card
    const balance = totalIncome - totalExpenses;
    const symbol = utils.getCurrencySymbol();
    document.getElementById('balanceAmount').textContent = utils.formatCurrency(balance);
    document.getElementById('totalIncome').textContent = `+${symbol} ${utils.formatCurrencyAmount(totalIncome)}`;
    document.getElementById('totalExpenses').textContent = `-${symbol} ${utils.formatCurrencyAmount(totalExpenses)}`;

    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
    document.getElementById('savingsRate').textContent = `${savingsRate.toFixed(1)}%`;

  } catch (error) {
    console.error('Load summary error:', error);
  }
}

// Load recent expenses
async function loadRecentExpenses() {
  try {
    const response = await api.getExpenses({ limit: 5 });
    const expenses = response.data.expenses || response.data;

    const listContainer = document.getElementById('recentExpensesList');
    
    if (!expenses || expenses.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
          <p>No transactions yet</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = expenses.slice(0, 5).map(expense => `
      <div class="transaction-item">
        <div class="transaction-icon">${utils.getCategoryIcon(expense.category)}</div>
        <div class="transaction-info">
          <div class="transaction-category">${expense.category}</div>
          <div class="transaction-date">${utils.formatDate(expense.expense_date || expense.date)}</div>
        </div>
        <div class="transaction-amount">-${utils.formatCurrencyAmount(expense.amount)}</div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Load expenses error:', error);
    document.getElementById('recentExpensesList').innerHTML = 
      '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Failed to load</div>';
  }
}

// Load budget
async function loadBudget() {
  try {
    const response = await api.getActiveBudget();
    budgetData = response.data;

    const budgetFill = document.getElementById('budgetFill');
    const budgetPercentage = document.getElementById('budgetPercentage');
    const budgetSpent = document.getElementById('budgetSpent');
    const budgetRemaining = document.getElementById('budgetRemaining');

    if (!budgetData) {
      budgetPercentage.textContent = 'Not set';
      budgetSpent.textContent = 'Tap Budget to set';
      budgetRemaining.textContent = '';
      return;
    }

    const usage = parseFloat(budgetData.usage_percentage || 0);
    const spent = budgetData.spent_amount || 0;
    const total = budgetData.budget_amount || budgetData.amount || 0;
    const remaining = Math.max(0, total - spent);
    
    // Update UI
    budgetPercentage.textContent = `${usage.toFixed(0)}%`;
    budgetFill.style.width = `${Math.min(100, usage)}%`;
    budgetSpent.textContent = `${utils.formatCurrency(spent)} spent`;
    budgetRemaining.textContent = `${utils.formatCurrency(remaining)} left`;
    
    // Update fill color based on usage
    budgetFill.classList.remove('safe', 'warning', 'danger');
    if (usage >= 90) {
      budgetFill.classList.add('danger');
    } else if (usage >= 70) {
      budgetFill.classList.add('warning');
    } else {
      budgetFill.classList.add('safe');
    }

  } catch (error) {
    console.error('Load budget error:', error);
  }
}

// Load gamification data
async function loadGamificationData() {
  try {
    // Load streak
    const streakResponse = await api.getStreak();
    const streak = streakResponse.data;
    document.getElementById('currentStreak').textContent = `${streak.current_streak || 0} days`;

    // Load XP
    const xpResponse = await api.getXP();
    const xp = xpResponse.data;
    
    document.getElementById('userLevel').textContent = `Level ${xp.level}`;
    document.getElementById('levelBadge').textContent = xp.level;
    document.getElementById('xpProgress').style.width = `${xp.progress_percentage}%`;
    document.getElementById('xpText').textContent = `${xp.total_xp} / ${xp.next_level_xp} XP`;

    // Load badges
    const badgesResponse = await api.getBadges();
    const badges = badgesResponse.data;
    
    const badgesContainer = document.getElementById('badgesContainer');
    const badgeEmojis = ['💰', '🎯', '📊', '⭐', '🔥', '💎'];
    
    if (badges.length === 0) {
      badgesContainer.innerHTML = badgeEmojis.map(emoji => 
        `<span class="badge-item">${emoji}</span>`
      ).join('');
    } else {
      const earnedBadges = badges.map(b => utils.getBadgeEmoji(b.badge_name));
      badgesContainer.innerHTML = badgeEmojis.map(emoji => 
        `<span class="badge-item ${earnedBadges.includes(emoji) ? 'earned' : ''}">${emoji}</span>`
      ).join('');
    }

    // Set motivational message
    const quotes = [
      "Every cedi saved is a cedi earned! 💪",
      "Small steps lead to big wins! 🚀",
      "Your future self will thank you! 🌟",
      "Building wealth, one day at a time! 📈",
      "Stay consistent, stay wealthy! 💰"
    ];
    const motivationalEl = document.getElementById('motivationalMessage');
    if (motivationalEl) {
      motivationalEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }

  } catch (error) {
    console.error('Load gamification error:', error);
  }
}

// Modal functions
function openExpenseModal() {
  populateSelectOptions();
  document.getElementById('expenseDate').value = utils.getTodayDate();
  document.getElementById('expenseModal').classList.add('active');
}

function openIncomeModal() {
  populateIncomeOptions();
  document.getElementById('incomeDate').value = utils.getTodayDate();
  document.getElementById('incomeModal').classList.add('active');
}

function openBudgetModal() {
  document.getElementById('budgetStartDate').value = utils.getTodayDate();
  document.getElementById('budgetModal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function populateSelectOptions() {
  const categorySelect = document.getElementById('expenseCategory');
  categorySelect.innerHTML = utils.EXPENSE_CATEGORIES.map(cat => 
    `<option value="${cat}">${utils.getCategoryIcon(cat)} ${cat}</option>`
  ).join('');

  const methodSelect = document.getElementById('expensePaymentMethod');
  methodSelect.innerHTML = utils.PAYMENT_METHODS.map(method => 
    `<option value="${method}">${method}</option>`
  ).join('');
}

function populateIncomeOptions() {
  const sourceSelect = document.getElementById('incomeSource');
  sourceSelect.innerHTML = utils.INCOME_SOURCES.map(source => 
    `<option value="${source}">${source}</option>`
  ).join('');
}

// Handle add expense
async function handleAddExpense(event) {
  event.preventDefault();
  
  const expenseData = {
    amount: parseFloat(document.getElementById('expenseAmount').value),
    category: document.getElementById('expenseCategory').value,
    payment_method: document.getElementById('expensePaymentMethod').value,
    expense_date: document.getElementById('expenseDate').value,
    note: document.getElementById('expenseNote').value || null,
    is_recurring: false,
    recurring_frequency: null
  };

  try {
    utils.showLoading();
    await api.createExpense(expenseData);
    
    utils.hideLoading();
    utils.showAlert('Expense added successfully! +10 XP earned! 🎉', 'success');
    
    closeModal('expenseModal');
    document.getElementById('expenseForm').reset();
    
    // Reload data
    await initDashboard();
  } catch (error) {
    utils.hideLoading();
    utils.showAlert(error.message || 'Failed to add expense', 'error');
  }
}

// Handle add income
async function handleAddIncome(event) {
  event.preventDefault();
  
  const incomeData = {
    amount: parseFloat(document.getElementById('incomeAmount').value),
    source: document.getElementById('incomeSource').value,
    income_date: document.getElementById('incomeDate').value,
    note: document.getElementById('incomeNote').value || null
  };

  try {
    utils.showLoading();
    await api.createIncome(incomeData);
    
    utils.hideLoading();
    utils.showAlert('Income added successfully! 💰', 'success');
    
    closeModal('incomeModal');
    document.getElementById('incomeForm').reset();
    
    await loadFinancialSummary();
  } catch (error) {
    utils.hideLoading();
    utils.showAlert(error.message || 'Failed to add income', 'error');
  }
}

// Handle set budget
async function handleSetBudget(event) {
  event.preventDefault();
  
  const budgetData = {
    period_type: document.getElementById('budgetPeriod').value,
    amount: parseFloat(document.getElementById('budgetAmount').value),
    start_date: document.getElementById('budgetStartDate').value
  };

  try {
    utils.showLoading();
    await api.createBudget(budgetData);
    
    utils.hideLoading();
    utils.showAlert('Budget set successfully! 💼', 'success');
    
    closeModal('budgetModal');
    document.getElementById('budgetForm').reset();
    
    await loadBudget();
  } catch (error) {
    utils.hideLoading();
    utils.showAlert(error.message || 'Failed to set budget', 'error');
  }
}

// Logout
function logout() {
  api.logout();
}

// Load widget data for new features
async function loadWidgets() {
  try {
    // Load bills summary
    try {
      const billsResponse = await api.get('/bills/summary');
      if (billsResponse.success) {
        const dueBills = (billsResponse.data.overdue || 0) + (billsResponse.data.due_soon || 0);
        const billsCountEl = document.getElementById('billsDueCount');
        if (billsCountEl) billsCountEl.textContent = dueBills;
      }
    } catch (e) { /* Bills API not available */ }

    // Load active challenges
    try {
      const challengesResponse = await api.get('/challenges/stats');
      if (challengesResponse.success) {
        const challengesEl = document.getElementById('activeChallenges');
        if (challengesEl) challengesEl.textContent = challengesResponse.data.active_challenges || 0;
      }
    } catch (e) { /* Challenges API not available */ }

    // Load achievements count
    try {
      const achievementsResponse = await api.get('/achievements/stats');
      if (achievementsResponse.success) {
        const achievementsEl = document.getElementById('achievementsEarned');
        if (achievementsEl) achievementsEl.textContent = achievementsResponse.data.earned_achievements || 0;
      }
    } catch (e) { /* Achievements API not available */ }

    // Load spending insights
    try {
      const insightsResponse = await api.get('/comparisons/insights');
      if (insightsResponse.success && insightsResponse.data.length > 0) {
        const insightsCard = document.getElementById('insightsCard');
        const insightsContainer = document.getElementById('spendingInsights');
        
        if (insightsCard && insightsContainer) {
          insightsCard.style.display = 'block';
          insightsContainer.innerHTML = insightsResponse.data.map(insight => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 6px;">
              <span style="font-size: 20px;">${insight.icon}</span>
              <div>
                <div style="font-weight: 600; font-size: 12px; color: var(--text-primary);">${insight.title}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${insight.message}</div>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (e) { /* Insights API not available */ }

  } catch (error) {
    console.log('Widgets loading skipped:', error.message);
  }
}

// Close modal on outside click
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
  }
}

// ================================
// FUN & LIVELY INTERACTIONS 🎉
// ================================

// Animated number counter
function animateCounter(element, target, duration = 1000, prefix = '', suffix = '') {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
    const current = Math.floor(start + (target - start) * easeProgress);
    element.textContent = prefix + current.toLocaleString() + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = prefix + target.toLocaleString() + suffix;
      // Add pop effect at the end
      element.classList.add('animate-pop');
      setTimeout(() => element.classList.remove('animate-pop'), 300);
    }
  }
  
  requestAnimationFrame(update);
}

// Confetti celebration effect
function showConfetti() {
  const colors = ['#006B3F', '#00a05e', '#ffffff', '#34d399'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: 0;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      z-index: 9999;
      pointer-events: none;
      animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
    `;
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 4000);
  }
  
  // Add confetti keyframes if not exists
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Fun toast notification
function showFunToast(message, emoji = '🎉', type = 'success') {
  const existing = document.querySelector('.fun-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'fun-toast';
  toast.innerHTML = `<span style="font-size: 24px;">${emoji}</span> ${message}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: ${type === 'success' ? 'linear-gradient(135deg, #006B3F, #00a05e)' : 'var(--card-bg)'};
    color: white;
    padding: 12px 20px;
    border-radius: 50px;
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 9999;
    animation: toast-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
  `;
  
  document.body.appendChild(toast);
  
  // Add animation keyframes if not exists
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes toast-in {
        from { transform: translateX(-50%) translateY(100px) scale(0.8); opacity: 0; }
        to { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
      }
      @keyframes toast-out {
        from { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        to { transform: translateX(-50%) translateY(100px) scale(0.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Celebrate achievement unlock
function celebrateAchievement(title) {
  showConfetti();
  showFunToast(`Achievement Unlocked: ${title}!`, '🏆');
  
  // Add sound effect (web audio)
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3);
      osc.start(audioCtx.currentTime + i * 0.15);
      osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
    });
  } catch (e) { /* Audio not supported */ }
}

// Money saved celebration
function celebrateSavings(amount) {
  if (amount > 100) {
    showFunToast(`You saved ${utils.formatCurrency(amount)} this month!`, '💰');
    document.querySelector('.balance-amount')?.classList.add('animate-heartbeat');
    setTimeout(() => {
      document.querySelector('.balance-amount')?.classList.remove('animate-heartbeat');
    }, 2000);
  }
}

// Streak celebration
function celebrateStreak(days) {
  if (days === 7) {
    showFunToast('7 Day Streak! Keep it up! 🔥', '🔥');
    showConfetti();
  } else if (days === 30) {
    showFunToast('30 Day Streak! You\'re amazing! 🏆', '🏆');
    showConfetti();
  }
}

// Add bounce to navigation items on tap
document.querySelectorAll('.bottom-nav-item').forEach(item => {
  item.addEventListener('touchstart', function() {
    this.style.animation = 'bounce 0.3s ease';
  });
  item.addEventListener('animationend', function() {
    this.style.animation = '';
  });
});

// Add ripple effect to buttons
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255,255,255,0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-effect 0.6s ease forwards;
      pointer-events: none;
    `;
    
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
});

// Add emoji reactions
function addEmojiReaction(element, emoji) {
  const reaction = document.createElement('span');
  reaction.textContent = emoji;
  reaction.style.cssText = `
    position: absolute;
    font-size: 20px;
    animation: float-up 1s ease forwards;
    pointer-events: none;
    z-index: 100;
  `;
  element.style.position = 'relative';
  element.appendChild(reaction);
  
  if (!document.getElementById('float-up-style')) {
    const style = document.createElement('style');
    style.id = 'float-up-style';
    style.textContent = `
      @keyframes float-up {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-50px) scale(1.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  setTimeout(() => reaction.remove(), 1000);
}

// Daily motivational quotes with time-based variety
function getDailyQuote() {
  const quotes = [
    { text: "Every cedi saved is a cedi earned! 💪", emoji: "💪" },
    { text: "Small steps lead to big wins! 🚀", emoji: "🚀" },
    { text: "Your future self will thank you! 🌟", emoji: "🌟" },
    { text: "Building wealth, one day at a time! 📈", emoji: "📈" },
    { text: "Stay consistent, stay wealthy! 💰", emoji: "💰" },
    { text: "Financial freedom starts today! 🎯", emoji: "🎯" },
    { text: "Smart money moves pay off! 🧠", emoji: "🧠" },
    { text: "Track today, prosper tomorrow! ✨", emoji: "✨" },
    { text: "Discipline is the bridge to success! 🌉", emoji: "🌉" },
    { text: "Every budget kept is a goal met! 🏆", emoji: "🏆" }
  ];
  
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return quotes[dayOfYear % quotes.length];
}

// Initialize currency display with correct symbol
function initCurrencyDisplay() {
  const symbol = utils.getCurrencySymbol();
  const balanceEl = document.getElementById('balanceAmount');
  const incomeEl = document.getElementById('totalIncome');
  const expenseEl = document.getElementById('totalExpenses');
  const budgetSpentEl = document.getElementById('budgetSpent');
  const budgetRemainingEl = document.getElementById('budgetRemaining');
  
  if (balanceEl) balanceEl.textContent = `${symbol} 0.00`;
  if (incomeEl) incomeEl.textContent = `+${symbol} 0`;
  if (expenseEl) expenseEl.textContent = `-${symbol} 0`;
  if (budgetSpentEl && budgetSpentEl.textContent.includes('spent')) {
    budgetSpentEl.textContent = `${symbol} 0 spent`;
  }
  if (budgetRemainingEl && budgetRemainingEl.textContent.includes('left')) {
    budgetRemainingEl.textContent = `${symbol} 0 left`;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initCurrencyDisplay();
  initDashboard();
  loadWidgets();
  
  // Add fun entrance animations
  setTimeout(() => {
    document.querySelector('.greeting-banner')?.classList.add('animate-slide-up');
    document.querySelector('.balance-card')?.classList.add('animate-zoom');
  }, 100);
  
  // Make FAB more interactive
  const fab = document.querySelector('.fab');
  if (fab) {
    fab.addEventListener('touchstart', () => fab.classList.add('animate-pop'));
    fab.addEventListener('animationend', () => fab.classList.remove('animate-pop'));
  }
});
