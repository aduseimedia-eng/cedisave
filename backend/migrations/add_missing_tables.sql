-- ==========================================
-- ADDITIONAL TABLES MIGRATION
-- Tables for Bills, Challenges, and References
-- ==========================================

-- ==========================================
-- BILL REMINDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS bill_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'GHS',
    category VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly')),
    reminder_days_before INT DEFAULT 3,
    auto_create_expense BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON bill_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_active ON bill_reminders(user_id, is_active);

-- ==========================================
-- CHALLENGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('spending', 'saving', 'tracking', 'streak', 'budget', 'goal')),
    target_value DECIMAL(12, 2),
    xp_reward INT DEFAULT 50,
    badge_reward VARCHAR(50),
    duration_days INT DEFAULT 7,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);

-- ==========================================
-- USER CHALLENGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    progress DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);

-- ==========================================
-- EXPENSE CATEGORIES REFERENCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20)
);

-- Insert Ghana-specific categories if not exists
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
    ('Miscellaneous', '📦', '#74B9FF')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- PAYMENT METHODS REFERENCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO payment_methods (name) VALUES
    ('Cash'),
    ('MTN MoMo'),
    ('Telecel Cash'),
    ('Bank Transfer'),
    ('AirtelTigo Money')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- INCOME SOURCES REFERENCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS income_sources (
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
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- BUDGET ALERTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    alert_threshold INT NOT NULL CHECK (alert_threshold IN (50, 75, 90, 100)),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_budget_alert UNIQUE (budget_id, alert_threshold)
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON budget_alerts(budget_id);

-- ==========================================
-- ADD CURRENCY COLUMN TO EXPENSES IF NOT EXISTS
-- ==========================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS';

-- ==========================================
-- SEED DEFAULT CHALLENGES
-- ==========================================
INSERT INTO challenges (title, description, type, target_value, xp_reward, badge_reward, duration_days, difficulty) VALUES
    ('First Steps', 'Log your first expense', 'tracking', 1, 50, 'First Timer', 7, 'easy'),
    ('Week Warrior', 'Log expenses for 7 consecutive days', 'streak', 7, 100, 'Consistent', 7, 'medium'),
    ('Budget Master', 'Stay within budget for a month', 'budget', 100, 200, 'Budget Boss', 30, 'hard'),
    ('Savings Champion', 'Save GHS 500 this month', 'saving', 500, 150, 'Saver', 30, 'medium'),
    ('Transport Tracker', 'Log 10 transport expenses', 'tracking', 10, 75, NULL, 14, 'easy'),
    ('No Betting Week', 'Avoid betting expenses for 7 days', 'spending', 0, 100, 'Disciplined', 7, 'medium'),
    ('Goal Getter', 'Complete one savings goal', 'goal', 1, 250, 'Achiever', 90, 'hard'),
    ('Daily Logger', 'Log expenses for 30 days', 'streak', 30, 300, 'Dedicated', 30, 'legendary')
ON CONFLICT DO NOTHING;

-- ==========================================
-- TRIGGERS FOR NEW TABLES
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bill_reminders_updated_at ON bill_reminders;
CREATE TRIGGER update_bill_reminders_updated_at BEFORE UPDATE ON bill_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- NOTIFICATION SETTINGS COLUMN
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"weekly": true, "bills": true, "goals": true, "challenges": true, "budget": true, "tips": false}';

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON TABLE bill_reminders IS 'Recurring bill reminders and payments';
COMMENT ON TABLE challenges IS 'Available financial challenges for gamification';
COMMENT ON TABLE user_challenges IS 'User progress on challenges';
