-- Migration: 004_user_preferences
-- Feature: 015-dark-mode
-- Date: 2025-11-28
-- Description: User preferences table with key-value design for theme and future preferences

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================
-- Flexible key-value store for user preferences
-- Initial use case: theme preference (key="theme", value="light"|"dark"|"system")
-- Designed for extension without schema changes

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (length(key) BETWEEN 1 AND 50),
  value TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure each user can only have one preference per key
  UNIQUE(user_id, key)
);

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own preferences
CREATE POLICY "Users can manage own preferences"
ON user_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================
-- Enable Realtime for user_preferences to support live updates across devices

ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically update updated_at timestamp on row updates
-- Note: Uses existing update_updated_at_column() function from 001_initial_schema.sql

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

