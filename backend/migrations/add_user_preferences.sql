-- Add user preferences columns to users table
-- This removes the need for localStorage for user settings

-- Theme preference (dark/light)
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'dark';

-- Currency preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(5) DEFAULT 'GHS';

-- Profile picture URL (base64 or external URL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Low data mode preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS low_data_mode BOOLEAN DEFAULT FALSE;

-- Last visited page (for session continuity)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_visited_page VARCHAR(100) DEFAULT 'pages/dashboard.html';

-- Notification preferences as JSONB
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "budget_alerts": true, "goal_reminders": true, "bill_reminders": true}';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('theme', 'currency', 'profile_picture', 'low_data_mode', 'last_visited_page', 'notification_preferences');
