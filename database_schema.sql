-- KudiPal Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    -- Gmail OAuth fields
    gmail_tokens TEXT,
    gmail_email VARCHAR(255),
    gmail_connected_at TIMESTAMP,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_gmail_email ON users(gmail_email);

-- ==========================================
-- PHONE VERIFICATION TABLE (OTP)
-- ==========================================
CREATE TABLE phone_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX idx_phone_verification_phone ON phone_verification(phone);
CREATE INDEX idx_phone_verification_expires ON phone_verification(expires_at);

-- ==========================================
-- EMAIL VERIFICATION TABLE (OTP + Links)
-- ==========================================
CREATE TABLE email_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6),
    verification_token VARCHAR(255),
    verification_type VARCHAR(20), -- 'otp' or 'link'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX idx_email_verification_email ON email_verification(email);
CREATE INDEX idx_email_verification_token ON email_verification(verification_token);
CREATE INDEX idx_email_verification_expires ON email_verification(expires_at);

-- ==========================================
-- EXPENSES TABLE
-- ==========================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    note TEXT,
    expense_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);

-- ==========================================
-- INCOME TABLE
-- ==========================================
CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    source VARCHAR(50) NOT NULL,
    note TEXT,
    income_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_income_date ON income(income_date);
CREATE INDEX idx_income_user_date ON income(user_id, income_date);

-- ==========================================
-- BUDGETS TABLE
-- ==========================================
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_budget UNIQUE (user_id, period_type, is_active)
);

-- Indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_active ON budgets(user_id, is_active);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);

-- ==========================================
-- SAVINGS GOALS TABLE
-- ==========================================
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
    deadline DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);

-- ==========================================
-- BADGES TABLE
-- ==========================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_name VARCHAR(50) NOT NULL,
    badge_tier VARCHAR(20) DEFAULT 'bronze' CHECK (badge_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    description TEXT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_name, badge_tier)
);

-- Indexes
CREATE INDEX idx_badges_user_id ON badges(user_id);
CREATE INDEX idx_badges_name ON badges(badge_name);

-- ==========================================
-- STREAKS TABLE
-- ==========================================
CREATE TABLE streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INT DEFAULT 0 CHECK (longest_streak >= 0),
    last_activity_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_streaks_user_id ON streaks(user_id);

-- ==========================================
-- USER XP (EXPERIENCE POINTS) TABLE
-- ==========================================
CREATE TABLE user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_xp INT DEFAULT 0 CHECK (total_xp >= 0),
    level INT DEFAULT 1 CHECK (level > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_user_xp_user_id ON user_xp(user_id);

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- ==========================================
-- BUDGET ALERTS TABLE
-- ==========================================
CREATE TABLE budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    alert_threshold INT NOT NULL CHECK (alert_threshold IN (50, 75, 90, 100)),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_budget_alert UNIQUE (budget_id, alert_threshold)
);

-- Index
CREATE INDEX idx_budget_alerts_budget_id ON budget_alerts(budget_id);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON income
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_xp_updated_at BEFORE UPDATE ON user_xp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEED DATA - GHANA EXPENSE CATEGORIES
-- ==========================================
-- This will be used for validation in the application

-- Create a reference table for valid categories
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20)
);

INSERT INTO expense_categories (name, icon, color) VALUES
    ('Food / Chop Bar', '🍛', '#FF6B6B'),
    ('Transport (Trotro / Bolt)', '🚌', '#4ECDC4'),
    ('Data / Airtime', '📱', '#45B7D1'),
    ('Rent / Hostel', '🏠', '#96CEB4'),
    ('Utilities', '💡', '#FFEAA7'),
    ('Church / Donations', '⛪', '#DFE6E9'),
    ('Betting / Gaming', '🎲', '#FD79A8'),
    ('Entertainment', '🎬', '#A29BFE'),
    ('Shopping', '🛍️', '#FF7675'),
    ('Miscellaneous', '📦', '#74B9FF');

-- Create reference table for payment methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO payment_methods (name) VALUES
    ('Cash'),
    ('MTN MoMo'),
    ('Telecel Cash'),
    ('Bank Transfer'),
    ('AirtelTigo Money');

-- Create reference table for income sources
CREATE TABLE income_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO income_sources (name) VALUES
    ('Allowance'),
    ('Salary'),
    ('Business'),
    ('Gift'),
    ('Hustle'),
    ('Investment'),
    ('Other');

-- ==========================================
-- USEFUL VIEWS
-- ==========================================

-- View for user financial summary
CREATE OR REPLACE VIEW user_financial_summary AS
SELECT 
    u.id as user_id,
    u.name,
    COALESCE(SUM(i.amount), 0) as total_income,
    COALESCE(SUM(e.amount), 0) as total_expenses,
    COALESCE(SUM(i.amount), 0) - COALESCE(SUM(e.amount), 0) as net_balance,
    COUNT(DISTINCT e.id) as expense_count,
    COUNT(DISTINCT i.id) as income_count
FROM users u
LEFT JOIN income i ON u.id = i.user_id
LEFT JOIN expenses e ON u.id = e.user_id
GROUP BY u.id, u.name;

-- View for monthly expenses by category
CREATE OR REPLACE VIEW monthly_expenses_by_category AS
SELECT 
    user_id,
    DATE_TRUNC('month', expense_date) as month,
    category,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM expenses
GROUP BY user_id, DATE_TRUNC('month', expense_date), category;

-- View for active budgets with spending
CREATE OR REPLACE VIEW active_budgets_with_spending AS
SELECT 
    b.id as budget_id,
    b.user_id,
    b.period_type,
    b.amount as budget_amount,
    b.start_date,
    b.end_date,
    COALESCE(SUM(e.amount), 0) as spent_amount,
    b.amount - COALESCE(SUM(e.amount), 0) as remaining,
    ROUND((COALESCE(SUM(e.amount), 0) / b.amount * 100), 2) as usage_percentage
FROM budgets b
LEFT JOIN expenses e ON b.user_id = e.user_id 
    AND e.expense_date BETWEEN b.start_date AND b.end_date
WHERE b.is_active = TRUE
GROUP BY b.id, b.user_id, b.period_type, b.amount, b.start_date, b.end_date;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================
COMMENT ON TABLE users IS 'Core user authentication and profile data';
COMMENT ON TABLE expenses IS 'User expense transactions with Ghana-specific categories';
COMMENT ON TABLE income IS 'User income records';
COMMENT ON TABLE budgets IS 'Weekly or monthly budget settings';
COMMENT ON TABLE goals IS 'Savings goals with progress tracking';
COMMENT ON TABLE badges IS 'Gamification achievements';
COMMENT ON TABLE streaks IS 'Daily activity tracking for gamification';
COMMENT ON TABLE user_xp IS 'User experience points and levels';
COMMENT ON TABLE notifications IS 'In-app notification system';
