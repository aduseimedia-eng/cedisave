-- Migration: Add Google OAuth support
-- Make phone and password_hash nullable for Google Sign-In users

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add Google auth columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Unique index on google_id (NULLs are excluded so multiple NULLs are fine)
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx
  ON users(google_id)
  WHERE google_id IS NOT NULL;
