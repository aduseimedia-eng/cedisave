// KudiSave - API Service
// Handles all communication with backend
// Supports both Demo Mode (localStorage) and Production Mode (API)

// API Configuration - set by config.js
const API_BASE_URL = window.KUDISAVE_API_URL;
const DEMO_MODE = window.KUDISAVE_DEMO_MODE || false;

// Demo mode helper functions
function isDemoMode() {
  return DEMO_MODE;
}

function getDemoData(key) {
  try {
    const data = localStorage.getItem(`kudisave_demo_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function setDemoData(key, data) {
  try {
    localStorage.setItem(`kudisave_demo_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save demo data:', e);
  }
}

// User preferences (loaded from API, cached in memory)
let userPreferences = {
  theme: 'dark',
  currency: 'GHS',
  profile_picture: null,
  low_data_mode: false,
  last_visited_page: 'pages/dashboard.html',
  notification_preferences: {
    email: true,
    push: true,
    budget_alerts: true,
    goal_reminders: true,
    bill_reminders: true
  }
};

// Cache configuration for low data mode
const CACHE_CONFIG = {
  expenses: { key: 'kudisave_cache_expenses', ttl: 5 * 60 * 1000 }, // 5 minutes
  goals: { key: 'kudisave_cache_goals', ttl: 10 * 60 * 1000 }, // 10 minutes
  budget: { key: 'kudisave_cache_budget', ttl: 5 * 60 * 1000 },
  income: { key: 'kudisave_cache_income', ttl: 10 * 60 * 1000 },
  profile: { key: 'kudisave_cache_profile', ttl: 30 * 60 * 1000 }, // 30 minutes
  summary: { key: 'kudisave_cache_summary', ttl: 5 * 60 * 1000 }
};

// Check if low data mode is enabled (from user preferences)
function isLowDataMode() {
  return userPreferences.low_data_mode;
}

// Get user preference
function getUserPreference(key) {
  return userPreferences[key];
}

// Update user preference locally and sync to server
async function setUserPreference(key, value) {
  userPreferences[key] = value;
  
  // Sync to server if authenticated
  const token = localStorage.getItem('token');
  if (token && api) {
    try {
      await api.updateProfile({ [key]: value });
    } catch (e) {
      console.warn('Failed to sync preference to server:', e);
    }
  }
}

// Get cached data if valid
function getCachedData(cacheKey) {
  if (!isLowDataMode()) return null;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { data, timestamp, ttl } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > ttl;
    
    if (isExpired) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch (e) {
    return null;
  }
}

// Save data to cache
function setCachedData(cacheKey, data, ttl) {
  if (!isLowDataMode()) return;
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl
    }));
  } catch (e) {
    // Clear old cache if storage is full
    clearOldCache();
  }
}

// Clear old cache entries
function clearOldCache() {
  Object.values(CACHE_CONFIG).forEach(config => {
    try {
      localStorage.removeItem(config.key);
    } catch (e) {}
  });
}

// Check if offline
function isOffline() {
  return !navigator.onLine;
}

// Mock data for demo mode
const MOCK_DATA = {
  user: getDemoData('user') || {
    id: 1,
    name: 'Demo User',
    email: 'demo@kudisave.com',
    phone: '233241234567',
    created_at: '2026-01-01',
    theme: 'dark',
    currency: 'GHS'
  },
  expenses: getDemoData('expenses') || [
    { id: 1, category: 'Food / Chop Bar', amount: 45.00, description: 'Lunch at Chop Bar', payment_method: 'MTN MoMo', date: '2026-02-13' },
    { id: 2, category: 'Transport (Trotro / Bolt)', amount: 15.00, description: 'Trotro to work', payment_method: 'Cash', date: '2026-02-12' },
    { id: 3, category: 'Data / Airtime', amount: 50.00, description: 'MTN data bundle', payment_method: 'MTN MoMo', date: '2026-02-11' },
    { id: 4, category: 'Entertainment', amount: 80.00, description: 'Movie night', payment_method: 'Cash', date: '2026-02-10' },
    { id: 5, category: 'Shopping', amount: 120.00, description: 'New shirt', payment_method: 'Bank Transfer', date: '2026-02-09' }
  ],
  goals: getDemoData('goals') || [
    { id: 1, title: 'New Laptop', target_amount: 5000.00, current_amount: 2500.00, deadline: '2026-06-30', status: 'in_progress' },
    { id: 2, title: 'Emergency Fund', target_amount: 2000.00, current_amount: 1800.00, deadline: '2026-03-31', status: 'in_progress' },
    { id: 3, title: 'Weekend Trip', target_amount: 500.00, current_amount: 500.00, deadline: '2026-02-28', status: 'completed' }
  ],
  budget: getDemoData('budget') || {
    id: 1,
    total_budget: 1500.00,
    spent: 310.00,
    remaining: 1190.00,
    month: '2026-02',
    categories: [
      { category: 'Food / Chop Bar', budget: 400, spent: 45 },
      { category: 'Transport (Trotro / Bolt)', budget: 200, spent: 15 },
      { category: 'Data / Airtime', budget: 100, spent: 50 }
    ]
  },
  income: getDemoData('income') || [
    { id: 1, source: 'Salary', amount: 3500.00, date: '2026-02-01' },
    { id: 2, source: 'Hustle', amount: 500.00, date: '2026-02-05' }
  ],
  badges: getDemoData('badges') || [
    { id: 1, name: 'Budget Boss', earned_at: '2026-02-01' },
    { id: 2, name: 'Consistency Champ', earned_at: '2026-02-10' }
  ],
  streak: getDemoData('streak') || { current_streak: 7, longest_streak: 14 },
  xp: getDemoData('xp') || { total_xp: 1250, level: 5 }
};

// Save mock data to localStorage (for persistence in demo mode)
function saveDemoData() {
  if (!isDemoMode()) return;
  setDemoData('user', MOCK_DATA.user);
  setDemoData('expenses', MOCK_DATA.expenses);
  setDemoData('goals', MOCK_DATA.goals);
  setDemoData('budget', MOCK_DATA.budget);
  setDemoData('income', MOCK_DATA.income);
  setDemoData('badges', MOCK_DATA.badges);
  setDemoData('streak', MOCK_DATA.streak);
  setDemoData('xp', MOCK_DATA.xp);
}

class APIService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.preferencesLoaded = false;
  }

  // Load user preferences from profile
  async loadUserPreferences() {
    if (this.preferencesLoaded || !this.token) return;
    
    // Demo mode - load from mock data
    if (isDemoMode()) {
      userPreferences.theme = MOCK_DATA.user.theme || 'dark';
      userPreferences.currency = MOCK_DATA.user.currency || 'GHS';
      userPreferences.profile_picture = MOCK_DATA.user.profile_picture;
      this.preferencesLoaded = true;
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const profile = data.data;
          // Update preferences from profile
          userPreferences.theme = profile.theme || 'dark';
          userPreferences.currency = profile.currency || 'GHS';
          userPreferences.profile_picture = profile.profile_picture;
          userPreferences.low_data_mode = profile.low_data_mode || false;
          userPreferences.last_visited_page = profile.last_visited_page || 'pages/dashboard.html';
          userPreferences.notification_preferences = profile.notification_preferences || userPreferences.notification_preferences;
          
          this.preferencesLoaded = true;
          
          // Apply theme immediately
          if (typeof initThemeFromPreferences === 'function') {
            initThemeFromPreferences();
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load user preferences:', e);
    }
  }

  // Get authorization headers
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Handle API response
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.response = { data };
      throw error;
    }

    return data;
  }

  // Set token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Clear token
  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // AUTH ENDPOINTS

  async register(userData) {
    // Demo mode - simulate registration
    if (isDemoMode()) {
      MOCK_DATA.user = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        created_at: new Date().toISOString().split('T')[0],
        theme: 'dark',
        currency: 'GHS'
      };
      saveDemoData();
      this.setToken('demo_token_' + Date.now());
      return { success: true, data: { token: this.token, user: MOCK_DATA.user } };
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(userData)
    });

    const data = await this.handleResponse(response);
    if (data.data.token) {
      this.setToken(data.data.token);
    }
    return data;
  }

  async login(credentials) {
    // Demo mode - simulate login
    if (isDemoMode()) {
      // Accept any credentials in demo mode
      this.setToken('demo_token_' + Date.now());
      // Load user preferences
      userPreferences.theme = MOCK_DATA.user.theme || 'dark';
      userPreferences.currency = MOCK_DATA.user.currency || 'GHS';
      this.preferencesLoaded = true;
      return { success: true, data: { token: this.token, user: MOCK_DATA.user } };
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(credentials)
    });

    const data = await this.handleResponse(response);
    if (data.data.token) {
      this.setToken(data.data.token);
      // Load user preferences after login
      await this.loadUserPreferences();
    }
    return data;
  }

  async getProfile() {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.user };
    }
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: this.getHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Sync preferences from profile
    if (result.success && result.data) {
      const profile = result.data;
      userPreferences.theme = profile.theme || 'dark';
      userPreferences.currency = profile.currency || 'GHS';
      userPreferences.profile_picture = profile.profile_picture;
      userPreferences.low_data_mode = profile.low_data_mode || false;
      userPreferences.last_visited_page = profile.last_visited_page || 'pages/dashboard.html';
      userPreferences.notification_preferences = profile.notification_preferences || userPreferences.notification_preferences;
      this.preferencesLoaded = true;
    }
    
    return result;
  }

  async updateProfile(profileData) {
    if (isDemoMode()) {
      MOCK_DATA.user = { ...MOCK_DATA.user, ...profileData };
      saveDemoData();
      return { success: true, data: MOCK_DATA.user };
    }
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(profileData)
    });

    return await this.handleResponse(response);
  }

  async changePassword({ currentPassword, newPassword }) {
    if (isDemoMode()) {
      // Simulate password change in demo mode
      return { success: true, message: 'Password changed successfully' };
    }
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });

    return await this.handleResponse(response);
  }

  logout() {
    this.clearToken();
    this.preferencesLoaded = false;
    // Reset preferences to defaults
    userPreferences = {
      theme: 'dark',
      currency: 'GHS',
      profile_picture: null,
      low_data_mode: false,
      last_visited_page: 'pages/dashboard.html',
      notification_preferences: {
        email: true,
        push: true,
        budget_alerts: true,
        goal_reminders: true,
        bill_reminders: true
      }
    };
    // Clear any cached data
    clearOldCache();
    window.location.href = '../splash.html';
  }

  // EXPENSE ENDPOINTS

  async createExpense(expenseData) {
    if (isDemoMode()) {
      const newExpense = { id: Date.now(), ...expenseData, date: expenseData.date || new Date().toISOString().split('T')[0] };
      MOCK_DATA.expenses.unshift(newExpense);
      saveDemoData();
      return { success: true, data: newExpense };
    }
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(expenseData)
    });

    return await this.handleResponse(response);
  }

  async getExpenses(filters = {}) {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.expenses };
    }
    
    // Check cache in low data mode
    const cacheKey = CACHE_CONFIG.expenses.key;
    const cached = getCachedData(cacheKey);
    if (cached && Object.keys(filters).length === 0) {
      return cached;
    }
    
    // Return cached data if offline
    if (isOffline() && cached) {
      return cached;
    }
    
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/expenses?${params}`, {
      headers: this.getHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Cache result
    if (Object.keys(filters).length === 0) {
      setCachedData(cacheKey, result, CACHE_CONFIG.expenses.ttl);
    }
    
    return result;
  }

  async getExpenseSummary(period = 'month') {
    if (isDemoMode()) {
      const total = MOCK_DATA.expenses.reduce((sum, e) => sum + e.amount, 0);
      return { success: true, data: { total, count: MOCK_DATA.expenses.length } };
    }
    
    // Check cache in low data mode
    const cacheKey = CACHE_CONFIG.summary.key + '_' + period;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    
    if (isOffline() && cached) return cached;
    
    const response = await fetch(`${API_BASE_URL}/expenses/summary?period=${period}`, {
      headers: this.getHeaders()
    });

    const result = await this.handleResponse(response);
    setCachedData(cacheKey, result, CACHE_CONFIG.summary.ttl);
    return result;
  }

  async updateExpense(id, expenseData) {
    if (isDemoMode()) {
      const index = MOCK_DATA.expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        MOCK_DATA.expenses[index] = { ...MOCK_DATA.expenses[index], ...expenseData };
        saveDemoData();
        return { success: true, data: MOCK_DATA.expenses[index] };
      }
      return { success: false, message: 'Expense not found' };
    }
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(expenseData)
    });

    return await this.handleResponse(response);
  }

  async deleteExpense(id) {
    if (isDemoMode()) {
      MOCK_DATA.expenses = MOCK_DATA.expenses.filter(e => e.id !== id);
      saveDemoData();
      return { success: true, message: 'Expense deleted' };
    }
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  // INCOME ENDPOINTS

  async createIncome(incomeData) {
    if (isDemoMode()) {
      const newIncome = { id: Date.now(), ...incomeData, date: incomeData.date || new Date().toISOString().split('T')[0] };
      MOCK_DATA.income.unshift(newIncome);
      saveDemoData();
      return { success: true, data: newIncome };
    }
    const response = await fetch(`${API_BASE_URL}/income`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(incomeData)
    });

    return await this.handleResponse(response);
  }

  async getIncome(filters = {}) {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.income };
    }
    
    // Check cache in low data mode
    const cacheKey = CACHE_CONFIG.income.key;
    const cached = getCachedData(cacheKey);
    if (cached && Object.keys(filters).length === 0) return cached;
    if (isOffline() && cached) return cached;
    
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/income?${params}`, {
      headers: this.getHeaders()
    });

    const result = await this.handleResponse(response);
    if (Object.keys(filters).length === 0) {
      setCachedData(cacheKey, result, CACHE_CONFIG.income.ttl);
    }
    return result;
  }

  // BUDGET ENDPOINTS

  async createBudget(budgetData) {
    if (isDemoMode()) {
      MOCK_DATA.budget = { id: Date.now(), ...budgetData, spent: 0, remaining: budgetData.total_budget };
      saveDemoData();
      return { success: true, data: MOCK_DATA.budget };
    }
    const response = await fetch(`${API_BASE_URL}/budget`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(budgetData)
    });

    return await this.handleResponse(response);
  }

  async getActiveBudget() {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.budget };
    }
    
    // Check cache in low data mode
    const cacheKey = CACHE_CONFIG.budget.key;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    if (isOffline() && cached) return cached;
    
    const response = await fetch(`${API_BASE_URL}/budget/active`, {
      headers: this.getHeaders()
    });

    const result = await this.handleResponse(response);
    setCachedData(cacheKey, result, CACHE_CONFIG.budget.ttl);
    return result;
  }

  // GOALS ENDPOINTS

  async createGoal(goalData) {
    if (isDemoMode()) {
      const newGoal = { id: Date.now(), ...goalData, current_amount: 0, status: 'in_progress' };
      MOCK_DATA.goals.unshift(newGoal);
      saveDemoData();
      return { success: true, data: newGoal };
    }
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(goalData)
    });

    return await this.handleResponse(response);
  }

  async getGoals() {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.goals };
    }
    
    // Check cache in low data mode
    const cacheKey = CACHE_CONFIG.goals.key;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    if (isOffline() && cached) return cached;
    
    const response = await fetch(`${API_BASE_URL}/goals`, {
      headers: this.getHeaders()
    });

    const result = await this.handleResponse(response);
    setCachedData(cacheKey, result, CACHE_CONFIG.goals.ttl);
    return result;
  }

  async updateGoal(id, goalData) {
    if (isDemoMode()) {
      const index = MOCK_DATA.goals.findIndex(g => g.id === id);
      if (index !== -1) {
        MOCK_DATA.goals[index] = { ...MOCK_DATA.goals[index], ...goalData };
        saveDemoData();
        return { success: true, data: MOCK_DATA.goals[index] };
      }
      return { success: false, message: 'Goal not found' };
    }
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(goalData)
    });

    return await this.handleResponse(response);
  }

  // REPORTS ENDPOINTS

  async getMonthlyReport(month = null) {
    if (isDemoMode()) {
      const total = MOCK_DATA.expenses.reduce((sum, e) => sum + e.amount, 0);
      const income = MOCK_DATA.income.reduce((sum, i) => sum + i.amount, 0);
      return { success: true, data: { total_expenses: total, total_income: income, net_savings: income - total } };
    }
    const url = month 
      ? `${API_BASE_URL}/reports/monthly?month=${month}`
      : `${API_BASE_URL}/reports/monthly`;
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  async getFinancialHealthScore() {
    if (isDemoMode()) {
      return { success: true, data: { score: 75, rating: 'Good', tips: ['Keep tracking your expenses!'] } };
    }
    const response = await fetch(`${API_BASE_URL}/reports/health-score`, {
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  async getSpendingTrends() {
    if (isDemoMode()) {
      return { success: true, data: { trends: [{ month: 'Jan', amount: 450 }, { month: 'Feb', amount: 310 }] } };
    }
    const response = await fetch(`${API_BASE_URL}/reports/trends`, {
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  // GAMIFICATION ENDPOINTS

  async getBadges() {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.badges };
    }
    const response = await fetch(`${API_BASE_URL}/gamification/badges`, {
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  async getStreak() {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.streak };
    }
    const response = await fetch(`${API_BASE_URL}/gamification/streak`, {
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  async getXP() {
    if (isDemoMode()) {
      return { success: true, data: MOCK_DATA.xp };
    }
    const response = await fetch(`${API_BASE_URL}/gamification/xp`, {
      headers: this.getHeaders()
    });

    return await this.handleResponse(response);
  }

  // Generic HTTP methods for flexible API calls
  async get(endpoint) {
    // Demo mode: return mock data for known endpoints
    if (isDemoMode()) {
      if (endpoint.includes('/comparisons/insights')) {
        return { success: true, data: this._getDemoInsights() };
      }
      return { success: true, data: [] };
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return await this.handleResponse(response);
  }

  async post(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return await this.handleResponse(response);
  }

  async put(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return await this.handleResponse(response);
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return await this.handleResponse(response);
  }

  // Generate demo insights from mock data
  _getDemoInsights() {
    const expenses = MOCK_DATA.expenses || [];
    const income = MOCK_DATA.income || [];
    const goals = MOCK_DATA.goals || [];
    const budget = MOCK_DATA.budget || {};
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = income.reduce((s, i) => s + i.amount, 0);
    const topCategory = expenses.length > 0 ? expenses.reduce((a, b) => a.amount > b.amount ? a : b).category : 'Food / Chop Bar';
    const savingsRate = totalIncome > 0 ? Math.round((1 - totalSpent / totalIncome) * 100) : 0;

    const insights = [
      { type: 'positive', icon: 'party-popper', priority: 1, mood: 'celebrate', title: 'Welcome to KudiSave! \uD83C\uDF89', message: `You're exploring demo mode! This is where your personalized money insights will appear. Add real expenses to unlock 30 smart insights!`, tip: 'Sign up and start logging expenses to see YOUR money story!', source: 'Demo Mode' },
      { type: 'info', icon: 'tag', priority: 2, mood: 'chill', title: `#1 Spending: ${topCategory}`, message: `In demo mode, ${topCategory} is your top category at \u20B5${expenses.length > 0 ? expenses.reduce((a, b) => a.amount > b.amount ? a : b).amount.toFixed(2) : '0'}. Your real data will show YOUR actual top category!`, tip: 'Track every expense to see which category really rules your wallet!', source: 'Demo Expenses' },
      { type: 'positive', icon: 'trophy', priority: 2, mood: 'celebrate', title: `${savingsRate}% Savings Rate!`, message: `Demo shows you'd save ${savingsRate}% of your income. That's ${savingsRate >= 20 ? 'amazing! Keep it up!' : 'a start! You can do better!'}`, tip: 'Aim for at least 20% savings rate for financial health!', source: 'Demo Income vs Expenses' },
      { type: 'info', icon: 'target', priority: 3, mood: 'chill', title: `${goals.length} Goals Tracking!`, message: `You have ${goals.filter(g => g.status === 'in_progress').length} active goals in demo mode. Real goals will show your actual progress with motivating updates!`, tip: 'Set specific, measurable goals with deadlines for best results!', source: 'Demo Goals' },
      { type: 'warning', icon: 'zap', priority: 2, mood: 'nudge', title: 'Biggest Expense Alert!', message: `Your largest demo expense is \u20B5${Math.max(...expenses.map(e => e.amount), 0).toFixed(2)}. With real data, we'll track your actual monster expenses!`, tip: 'Review big expenses weekly — small changes add up to big savings!', source: 'Demo Expenses' },
      { type: 'info', icon: 'bar-chart-3', priority: 3, mood: 'chill', title: `\u20B5${totalSpent > 0 ? (totalSpent / 7).toFixed(0) : '0'}/Day Life!`, message: `Demo daily average is \u20B5${totalSpent > 0 ? (totalSpent / 7).toFixed(2) : '0'}. Connect your real expenses to see your actual daily burn rate!`, tip: 'Knowing your daily spend helps you make better daily choices!', source: 'Demo Daily Average' },
      { type: 'positive', icon: 'sparkles', priority: 3, mood: 'celebrate', title: '30 Insights Awaiting!', message: 'KudiSave can generate up to 30 personalized insights based on YOUR real spending patterns, income, goals, and budgets!', tip: 'The more data you log, the smarter and more fun your insights become!', source: 'Insights Engine' },
      { type: 'info', icon: 'wallet', priority: 4, mood: 'chill', title: 'Budget Power!', message: `Demo budget: \u20B5${budget.total_budget || 0} with \u20B5${budget.remaining || 0} remaining. Set a real budget to get alerts when you're close to the limit!`, tip: 'A budget isn\'t a restriction — it\'s a plan to spend on what matters!', source: 'Demo Budget' },
      { type: 'info', icon: 'brain', priority: 4, mood: 'chill', title: 'AI-Powered Tips!', message: 'Each insight comes with a personalized tip based on your data. The more you use KudiSave, the smarter it gets!', tip: 'Check back daily for fresh insights — they update with your spending!', source: 'Insights Engine' },
      { type: 'positive', icon: 'flame', priority: 3, mood: 'celebrate', title: 'Streak System!', message: `Current demo streak: ${MOCK_DATA.streak?.current_streak || 0} days! Log expenses daily to build your real streak and earn XP!`, tip: 'A 7-day streak unlocks the Consistency Champ badge!', source: 'Demo Streaks' }
    ];

    return insights;
  }
}

// Create global API instance
const api = new APIService();
