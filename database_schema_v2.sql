-- KudiPal Database Schema V2
-- New Features: Bill Reminders, Multi-Currency, Challenges, Achievements, Backup
-- PostgreSQL 14+

-- ==========================================
-- BILL REMINDERS TABLE
-- ==========================================
CREATE TABLE bill_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'GHS',
    category VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
    reminder_days_before INT DEFAULT 3,
    is_paid BOOLEAN DEFAULT FALSE,
    last_paid_date DATE,
    auto_create_expense BOOLEAN DEFAULT FALSE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bill_reminders_user_id ON bill_reminders(user_id);
CREATE INDEX idx_bill_reminders_due_date ON bill_reminders(due_date);
CREATE INDEX idx_bill_reminders_active ON bill_reminders(user_id, is_active);

-- ==========================================
-- CURRENCIES TABLE
-- ==========================================
CREATE TABLE currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO currencies (code, name, symbol) VALUES
    ('GHS', 'Ghanaian Cedi', '₵'),
    ('USD', 'US Dollar', '$'),
    ('EUR', 'Euro', '€'),
    ('GBP', 'British Pound', '£'),
    ('NGN', 'Nigerian Naira', '₦');

-- ==========================================
-- EXCHANGE RATES TABLE
-- ==========================================
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    rate DECIMAL(12, 6) NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_currency_pair UNIQUE (from_currency, to_currency)
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);

-- Default rates (GHS base)
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
    ('USD', 'GHS', 12.50),
    ('EUR', 'GHS', 13.50),
    ('GBP', 'GHS', 15.80),
    ('NGN', 'GHS', 0.0082),
    ('GHS', 'USD', 0.08),
    ('GHS', 'EUR', 0.074),
    ('GHS', 'GBP', 0.063),
    ('GHS', 'NGN', 121.95);

-- ==========================================
-- USER SETTINGS TABLE (Extended)
-- ==========================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_currency VARCHAR(3) DEFAULT 'GHS' REFERENCES currencies(code),
    notification_enabled BOOLEAN DEFAULT TRUE,
    bill_reminder_time TIME DEFAULT '09:00:00',
    weekly_report_day INT DEFAULT 0, -- 0=Sunday, 1=Monday, etc.
    auto_backup_enabled BOOLEAN DEFAULT FALSE,
    last_backup_date TIMESTAMP,
    theme VARCHAR(10) DEFAULT 'dark',
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ==========================================
-- SAVINGS CHALLENGES TABLE
-- ==========================================
CREATE TABLE savings_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN ('no_spend', 'save_amount', 'reduce_category', 'streak', 'custom')),
    target_amount DECIMAL(12, 2),
    target_days INT,
    target_category VARCHAR(50),
    xp_reward INT DEFAULT 100,
    badge_reward VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default challenges
INSERT INTO savings_challenges (title, description, challenge_type, target_amount, target_days, xp_reward, difficulty) VALUES
    ('No-Spend Weekend', 'Spend nothing on Saturday and Sunday', 'no_spend', NULL, 2, 50, 'easy'),
    ('Save ₵50 This Week', 'Save at least ₵50 by the end of the week', 'save_amount', 50, 7, 75, 'easy'),
    ('Save ₵200 This Month', 'Save at least ₵200 this month', 'save_amount', 200, 30, 150, 'medium'),
    ('Cut Transport Costs', 'Reduce transport spending by 30%', 'reduce_category', NULL, 7, 100, 'medium'),
    ('7-Day Streak', 'Log expenses for 7 consecutive days', 'streak', NULL, 7, 100, 'easy'),
    ('No Betting Week', 'No betting/gaming expenses for a week', 'no_spend', NULL, 7, 150, 'hard'),
    ('Frugal Foodie', 'Keep food expenses under ₵100 for a week', 'save_amount', 100, 7, 100, 'medium'),
    ('Data Detox', 'Reduce data/airtime spending by 50%', 'reduce_category', NULL, 7, 120, 'hard'),
    ('30-Day Saver', 'Save something every day for 30 days', 'streak', NULL, 30, 300, 'extreme'),
    ('Budget Master', 'Stay under budget for 4 weeks', 'custom', NULL, 28, 250, 'hard');

-- ==========================================
-- USER CHALLENGES (Progress Tracking)
-- ==========================================
CREATE TABLE user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES savings_challenges(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    current_progress DECIMAL(12, 2) DEFAULT 0,
    target_progress DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
    completed_at TIMESTAMP,
    xp_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_active_challenge UNIQUE (user_id, challenge_id, status)
);

CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_status ON user_challenges(user_id, status);

-- ==========================================
-- ACHIEVEMENTS TABLE (Extended Badges)
-- ==========================================
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(30) CHECK (category IN ('savings', 'spending', 'streak', 'milestone', 'challenge', 'social')),
    requirement_type VARCHAR(30) NOT NULL,
    requirement_value DECIMAL(12, 2),
    xp_reward INT DEFAULT 50,
    is_secret BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default achievements
INSERT INTO achievements (name, title, description, icon, category, requirement_type, requirement_value, xp_reward) VALUES
    ('first_expense', 'First Steps', 'Log your first expense', '🎯', 'milestone', 'expense_count', 1, 10),
    ('expense_10', 'Getting Started', 'Log 10 expenses', '📝', 'milestone', 'expense_count', 10, 25),
    ('expense_50', 'Tracker Pro', 'Log 50 expenses', '📊', 'milestone', 'expense_count', 50, 50),
    ('expense_100', 'Expense Master', 'Log 100 expenses', '🏆', 'milestone', 'expense_count', 100, 100),
    ('expense_500', 'Financial Guru', 'Log 500 expenses', '👑', 'milestone', 'expense_count', 500, 250),
    ('first_budget', 'Budget Beginner', 'Create your first budget', '📋', 'milestone', 'budget_count', 1, 20),
    ('budget_streak_4', 'Budget Champion', 'Stay under budget for 4 weeks', '🎖️', 'spending', 'budget_streak', 4, 100),
    ('first_goal', 'Dream Starter', 'Create your first savings goal', '⭐', 'savings', 'goal_count', 1, 20),
    ('goal_achieved', 'Goal Crusher', 'Complete a savings goal', '🎊', 'savings', 'goals_completed', 1, 75),
    ('goal_achieved_5', 'Goal Master', 'Complete 5 savings goals', '🌟', 'savings', 'goals_completed', 5, 200),
    ('streak_7', 'Week Warrior', '7-day logging streak', '🔥', 'streak', 'streak_days', 7, 50),
    ('streak_30', 'Monthly Master', '30-day logging streak', '💪', 'streak', 'streak_days', 30, 150),
    ('streak_100', 'Centurion', '100-day logging streak', '🏅', 'streak', 'streak_days', 100, 500),
    ('saver_100', 'Penny Pincher', 'Save ₵100 in total', '💰', 'savings', 'total_saved', 100, 30),
    ('saver_1000', 'Smart Saver', 'Save ₵1,000 in total', '💎', 'savings', 'total_saved', 1000, 100),
    ('saver_10000', 'Wealth Builder', 'Save ₵10,000 in total', '🏦', 'savings', 'total_saved', 10000, 300),
    ('challenge_1', 'Challenger', 'Complete your first challenge', '🏁', 'challenge', 'challenges_completed', 1, 50),
    ('challenge_5', 'Challenge Seeker', 'Complete 5 challenges', '⚡', 'challenge', 'challenges_completed', 5, 150),
    ('early_bird', 'Early Bird', 'Log an expense before 7 AM', '🌅', 'milestone', 'special', 1, 25),
    ('night_owl', 'Night Owl', 'Log an expense after 11 PM', '🦉', 'milestone', 'special', 1, 25),
    ('no_spend_day', 'Frugal Day', 'Have a day with no expenses', '✨', 'spending', 'no_spend_days', 1, 20),
    ('no_spend_week', 'Minimalist', 'Have 3 no-spend days in a week', '🧘', 'spending', 'no_spend_days', 3, 75);

-- ==========================================
-- USER ACHIEVEMENTS (Tracking)
-- ==========================================
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- ==========================================
-- DATA BACKUPS TABLE
-- ==========================================
CREATE TABLE data_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('manual', 'auto', 'export')),
    file_name VARCHAR(255),
    file_size INT,
    backup_data JSONB,
    encryption_key_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_data_backups_user_id ON data_backups(user_id);
CREATE INDEX idx_data_backups_created ON data_backups(created_at);

-- ==========================================
-- SPENDING COMPARISONS CACHE
-- ==========================================
CREATE TABLE spending_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comparison_type VARCHAR(30) NOT NULL,
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    previous_period_start DATE NOT NULL,
    previous_period_end DATE NOT NULL,
    current_amount DECIMAL(12, 2) NOT NULL,
    previous_amount DECIMAL(12, 2) NOT NULL,
    change_percentage DECIMAL(5, 2),
    category VARCHAR(50),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spending_comparisons_user_id ON spending_comparisons(user_id);

-- ==========================================
-- ALTER EXISTING TABLES FOR CURRENCY
-- ==========================================
-- Add currency column to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12, 6) DEFAULT 1;

-- Add currency column to income
ALTER TABLE income ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS';
ALTER TABLE income ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);
ALTER TABLE income ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12, 6) DEFAULT 1;

-- Add currency to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS';

-- ==========================================
-- TRIGGERS FOR NEW TABLES
-- ==========================================
CREATE TRIGGER update_bill_reminders_updated_at BEFORE UPDATE ON bill_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_challenges_updated_at BEFORE UPDATE ON user_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEWS FOR NEW FEATURES
-- ==========================================

-- View for upcoming bills
CREATE OR REPLACE VIEW upcoming_bills AS
SELECT 
    br.*,
    CASE 
        WHEN due_date <= CURRENT_DATE THEN 'overdue'
        WHEN due_date <= CURRENT_DATE + reminder_days_before THEN 'due_soon'
        ELSE 'upcoming'
    END as status,
    due_date - CURRENT_DATE as days_until_due
FROM bill_reminders br
WHERE is_active = TRUE AND (is_paid = FALSE OR frequency != 'once')
ORDER BY due_date ASC;

-- View for user challenge progress
CREATE OR REPLACE VIEW user_challenge_progress AS
SELECT 
    uc.*,
    sc.title,
    sc.description,
    sc.challenge_type,
    sc.xp_reward,
    sc.difficulty,
    ROUND((uc.current_progress / NULLIF(uc.target_progress, 0) * 100), 2) as progress_percentage,
    uc.end_date - CURRENT_DATE as days_remaining
FROM user_challenges uc
JOIN savings_challenges sc ON uc.challenge_id = sc.id
WHERE uc.status = 'active';

-- ==========================================
-- FUNCTIONS FOR NEW FEATURES
-- ==========================================

-- Function to convert currency
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(12, 2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_rate DECIMAL(12, 6);
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;
    
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency AND to_currency = p_to_currency;
    
    IF v_rate IS NULL THEN
        RETURN p_amount; -- Return original if no rate found
    END IF;
    
    RETURN ROUND(p_amount * v_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to check and update bill reminders
CREATE OR REPLACE FUNCTION process_recurring_bill(p_bill_id UUID) RETURNS VOID AS $$
DECLARE
    v_bill RECORD;
    v_new_due_date DATE;
BEGIN
    SELECT * INTO v_bill FROM bill_reminders WHERE id = p_bill_id;
    
    IF v_bill.frequency = 'once' THEN
        RETURN;
    END IF;
    
    -- Calculate next due date
    v_new_due_date := CASE v_bill.frequency
        WHEN 'weekly' THEN v_bill.due_date + INTERVAL '7 days'
        WHEN 'monthly' THEN v_bill.due_date + INTERVAL '1 month'
        WHEN 'yearly' THEN v_bill.due_date + INTERVAL '1 year'
    END;
    
    -- Update the bill
    UPDATE bill_reminders
    SET due_date = v_new_due_date,
        is_paid = FALSE,
        last_paid_date = v_bill.due_date
    WHERE id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON TABLE bill_reminders IS 'Recurring bill tracking with reminders';
COMMENT ON TABLE currencies IS 'Supported currencies for multi-currency transactions';
COMMENT ON TABLE exchange_rates IS 'Currency exchange rates (updated periodically)';
COMMENT ON TABLE savings_challenges IS 'Available savings challenges for users';
COMMENT ON TABLE user_challenges IS 'User progress on active challenges';
COMMENT ON TABLE achievements IS 'Gamification achievements/badges';
COMMENT ON TABLE user_achievements IS 'Achievements earned by users';
COMMENT ON TABLE data_backups IS 'User data backup history';
COMMENT ON TABLE spending_comparisons IS 'Cached spending comparison data';
