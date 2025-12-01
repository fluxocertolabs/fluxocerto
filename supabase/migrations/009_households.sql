-- Migration: 009_households
-- Feature: 020-household-multitenancy
-- Date: 2025-12-01
-- Description: Implement household-based multi-tenancy for data isolation between user groups
--
-- This migration:
-- 1. Creates the households table
-- 2. Adds household_id FK to all existing tables (profiles, accounts, projects, expenses, credit_cards, user_preferences)
-- 3. Creates a helper function for RLS policies
-- 4. Drops existing RLS policies (USING true)
-- 5. Creates new household-based RLS policies
-- 6. Migrates existing data to a default household

-- ============================================================================
-- HOUSEHOLDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INSERT DEFAULT HOUSEHOLD
-- ============================================================================
-- Create the default household for existing data migration.
-- NOTE: 'Fonseca Floriano' is intentionally hardcoded as this is the family
-- that owns this single-tenant application. All existing data belongs to this
-- household. New households can only be created by database administrators.

DO $$
DECLARE
  default_household_id UUID;
BEGIN
  -- Insert default household and capture its ID
  INSERT INTO households (name) VALUES ('Fonseca Floriano')
  RETURNING id INTO default_household_id;

  -- Store the ID in a temporary table for use in subsequent statements
  CREATE TEMP TABLE IF NOT EXISTS _migration_vars (key TEXT PRIMARY KEY, value UUID);
  INSERT INTO _migration_vars (key, value) VALUES ('default_household_id', default_household_id)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END $$;

-- ============================================================================
-- ADD HOUSEHOLD_ID TO PROFILES TABLE
-- ============================================================================

-- Add household_id column (nullable initially for migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE RESTRICT;

-- Update existing profiles to reference default household
UPDATE profiles SET household_id = (SELECT value FROM _migration_vars WHERE key = 'default_household_id')
WHERE household_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE profiles ALTER COLUMN household_id SET NOT NULL;

-- Create index for efficient RLS filtering
CREATE INDEX IF NOT EXISTS profiles_household_id_idx ON profiles(household_id);

-- ============================================================================
-- ADD HOUSEHOLD_ID TO ACCOUNTS TABLE
-- ============================================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE RESTRICT;

-- Update existing accounts to reference default household
UPDATE accounts SET household_id = (SELECT value FROM _migration_vars WHERE key = 'default_household_id')
WHERE household_id IS NULL;

ALTER TABLE accounts ALTER COLUMN household_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS accounts_household_id_idx ON accounts(household_id);

-- ============================================================================
-- ADD HOUSEHOLD_ID TO PROJECTS TABLE
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE RESTRICT;

UPDATE projects SET household_id = (SELECT value FROM _migration_vars WHERE key = 'default_household_id')
WHERE household_id IS NULL;

ALTER TABLE projects ALTER COLUMN household_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS projects_household_id_idx ON projects(household_id);

-- ============================================================================
-- ADD HOUSEHOLD_ID TO EXPENSES TABLE
-- ============================================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE RESTRICT;

UPDATE expenses SET household_id = (SELECT value FROM _migration_vars WHERE key = 'default_household_id')
WHERE household_id IS NULL;

ALTER TABLE expenses ALTER COLUMN household_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS expenses_household_id_idx ON expenses(household_id);

-- ============================================================================
-- ADD HOUSEHOLD_ID TO CREDIT_CARDS TABLE
-- ============================================================================

ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE RESTRICT;

UPDATE credit_cards SET household_id = (SELECT value FROM _migration_vars WHERE key = 'default_household_id')
WHERE household_id IS NULL;

ALTER TABLE credit_cards ALTER COLUMN household_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS credit_cards_household_id_idx ON credit_cards(household_id);

-- ============================================================================
-- ADD HOUSEHOLD_ID TO USER_PREFERENCES TABLE
-- ============================================================================

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE RESTRICT;

UPDATE user_preferences SET household_id = (SELECT value FROM _migration_vars WHERE key = 'default_household_id')
WHERE household_id IS NULL;

ALTER TABLE user_preferences ALTER COLUMN household_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS user_preferences_household_id_idx ON user_preferences(household_id);

-- Update unique constraint to be per-household instead of per-user
-- First drop the existing constraint if it exists
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_key_key;

-- Add new household-scoped unique constraint
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_household_key_key UNIQUE(household_id, key);

-- ============================================================================
-- HELPER FUNCTION FOR RLS POLICIES
-- ============================================================================
-- Efficiently lookup current user's household_id for use in RLS policies
-- Note: Created after household_id column exists on profiles table

CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP EXISTING RLS POLICIES (USING true)
-- ============================================================================

-- households (new table, no existing policies)

-- profiles
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;

-- accounts
DROP POLICY IF EXISTS "Authenticated users can read all accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can insert accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can update accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can delete accounts" ON accounts;

-- projects
DROP POLICY IF EXISTS "Authenticated users can read all projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- expenses
DROP POLICY IF EXISTS "Authenticated users can read all expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON expenses;

-- credit_cards
DROP POLICY IF EXISTS "Authenticated users can read all credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Authenticated users can insert credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Authenticated users can update credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Authenticated users can delete credit_cards" ON credit_cards;

-- user_preferences
DROP POLICY IF EXISTS "Authenticated users can read all user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Authenticated users can update user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Authenticated users can delete user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

-- ============================================================================
-- CREATE HOUSEHOLD-BASED RLS POLICIES
-- ============================================================================

-- households table: Users can only read their own household
CREATE POLICY "Users can read own household"
ON households FOR SELECT
TO authenticated
USING (id = get_user_household_id());

-- No insert/update/delete for households via app (admin-only)

-- profiles table: Users can read profiles in their household
CREATE POLICY "Users can read household profiles"
ON profiles FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

-- profiles insert policy for invite flow (allows creating profiles in own household)
CREATE POLICY "Users can insert profiles in own household"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

-- accounts table
CREATE POLICY "Users can read household accounts"
ON accounts FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household accounts"
ON accounts FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household accounts"
ON accounts FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());

-- projects table
CREATE POLICY "Users can read household projects"
ON projects FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household projects"
ON projects FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household projects"
ON projects FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());

-- expenses table
CREATE POLICY "Users can read household expenses"
ON expenses FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household expenses"
ON expenses FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household expenses"
ON expenses FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household expenses"
ON expenses FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());

-- credit_cards table
CREATE POLICY "Users can read household credit_cards"
ON credit_cards FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household credit_cards"
ON credit_cards FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household credit_cards"
ON credit_cards FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household credit_cards"
ON credit_cards FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());

-- user_preferences table
CREATE POLICY "Users can read household user_preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household user_preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household user_preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household user_preferences"
ON user_preferences FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());

-- ============================================================================
-- CLEANUP
-- ============================================================================

DROP TABLE IF EXISTS _migration_vars;
