-- ==========================================
-- GMAIL OAUTH MIGRATION
-- Adds Gmail OAuth columns to users table
-- ==========================================

-- Add Gmail OAuth columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gmail_tokens TEXT,
ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMP;

-- Create index for gmail_email lookups
CREATE INDEX IF NOT EXISTS idx_users_gmail_email ON users(gmail_email);

-- Comment on columns
COMMENT ON COLUMN users.gmail_tokens IS 'JSON string containing OAuth2 tokens (access_token, refresh_token, etc.)';
COMMENT ON COLUMN users.gmail_email IS 'User''s connected Gmail address';
COMMENT ON COLUMN users.gmail_connected_at IS 'Timestamp when Gmail was connected';
