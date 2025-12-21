-- Migration: rename_household_to_group
-- Feature: Rename household concept to group for broader appeal
-- Date: 2025-12-20
-- Description: Rename households table to groups, household_id columns to group_id,
--              and update all RLS policies and functions accordingly.
--
-- This migration:
-- 1. Drops existing RLS policies that reference household
-- 2. Drops the get_user_household_id() function
-- 3. Renames households table to groups
-- 4. Renames household_id columns to group_id on all tables
-- 5. Renames indexes
-- 6. Creates new get_user_group_id() function
-- 7. Creates new RLS policies with updated names

-- ============================================================================
-- DROP EXISTING RLS POLICIES
-- ============================================================================

-- households table
DROP POLICY IF EXISTS "Users can read own household" ON households;

-- profiles table
DROP POLICY IF EXISTS "Users can read household profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles in own household" ON profiles;

-- accounts table
DROP POLICY IF EXISTS "Users can read household accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert household accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update household accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete household accounts" ON accounts;

-- projects table
DROP POLICY IF EXISTS "Users can read household projects" ON projects;
DROP POLICY IF EXISTS "Users can insert household projects" ON projects;
DROP POLICY IF EXISTS "Users can update household projects" ON projects;
DROP POLICY IF EXISTS "Users can delete household projects" ON projects;

-- expenses table
DROP POLICY IF EXISTS "Users can read household expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert household expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update household expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete household expenses" ON expenses;

-- credit_cards table
DROP POLICY IF EXISTS "Users can read household credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert household credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update household credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete household credit_cards" ON credit_cards;

-- user_preferences table
DROP POLICY IF EXISTS "Users can read household user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert household user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update household user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete household user_preferences" ON user_preferences;

-- future_statements table
DROP POLICY IF EXISTS "Users can read household future_statements" ON future_statements;
DROP POLICY IF EXISTS "Users can insert household future_statements" ON future_statements;
DROP POLICY IF EXISTS "Users can update household future_statements" ON future_statements;
DROP POLICY IF EXISTS "Users can delete household future_statements" ON future_statements;

-- projection_snapshots table
DROP POLICY IF EXISTS "Users can read household snapshots" ON projection_snapshots;
DROP POLICY IF EXISTS "Users can insert household snapshots" ON projection_snapshots;
DROP POLICY IF EXISTS "Users can delete household snapshots" ON projection_snapshots;

-- ============================================================================
-- DROP OLD FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_household_id();

-- ============================================================================
-- RENAME TABLE: households -> groups
-- ============================================================================

ALTER TABLE households RENAME TO groups;

-- ============================================================================
-- RENAME COLUMNS: household_id -> group_id
-- ============================================================================

ALTER TABLE profiles RENAME COLUMN household_id TO group_id;
ALTER TABLE accounts RENAME COLUMN household_id TO group_id;
ALTER TABLE projects RENAME COLUMN household_id TO group_id;
ALTER TABLE expenses RENAME COLUMN household_id TO group_id;
ALTER TABLE credit_cards RENAME COLUMN household_id TO group_id;
ALTER TABLE user_preferences RENAME COLUMN household_id TO group_id;
ALTER TABLE future_statements RENAME COLUMN household_id TO group_id;
ALTER TABLE projection_snapshots RENAME COLUMN household_id TO group_id;

-- ============================================================================
-- RENAME INDEXES
-- ============================================================================

ALTER INDEX IF EXISTS profiles_household_id_idx RENAME TO profiles_group_id_idx;
ALTER INDEX IF EXISTS accounts_household_id_idx RENAME TO accounts_group_id_idx;
ALTER INDEX IF EXISTS projects_household_id_idx RENAME TO projects_group_id_idx;
ALTER INDEX IF EXISTS expenses_household_id_idx RENAME TO expenses_group_id_idx;
ALTER INDEX IF EXISTS credit_cards_household_id_idx RENAME TO credit_cards_group_id_idx;
ALTER INDEX IF EXISTS user_preferences_household_id_idx RENAME TO user_preferences_group_id_idx;
ALTER INDEX IF EXISTS future_statements_household_id_idx RENAME TO future_statements_group_id_idx;
ALTER INDEX IF EXISTS projection_snapshots_household_created_idx RENAME TO projection_snapshots_group_created_idx;

-- ============================================================================
-- RENAME CONSTRAINTS
-- ============================================================================

ALTER TABLE user_preferences 
  DROP CONSTRAINT IF EXISTS user_preferences_household_key_key;

ALTER TABLE user_preferences 
  ADD CONSTRAINT user_preferences_group_key_key UNIQUE(group_id, key);

-- ============================================================================
-- CREATE NEW FUNCTION: get_user_group_id()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_group_id()
RETURNS UUID AS $$
  SELECT group_id FROM profiles WHERE email = (auth.jwt() ->> 'email')::citext
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- CREATE NEW RLS POLICIES
-- ============================================================================

-- groups table
CREATE POLICY "Users can read own group"
ON groups FOR SELECT
TO authenticated
USING (id = get_user_group_id());

-- profiles table
CREATE POLICY "Users can read group profiles"
ON profiles FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert profiles in own group"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

-- accounts table
CREATE POLICY "Users can read group accounts"
ON accounts FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update group accounts"
ON accounts FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group accounts"
ON accounts FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- projects table (includes both recurring and single_shot income)
CREATE POLICY "Users can read group projects"
ON projects FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update group projects"
ON projects FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group projects"
ON projects FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- expenses table (includes both fixed and single_shot expenses)
CREATE POLICY "Users can read group expenses"
ON expenses FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group expenses"
ON expenses FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update group expenses"
ON expenses FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group expenses"
ON expenses FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- credit_cards table
CREATE POLICY "Users can read group credit_cards"
ON credit_cards FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group credit_cards"
ON credit_cards FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update group credit_cards"
ON credit_cards FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group credit_cards"
ON credit_cards FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- user_preferences table
CREATE POLICY "Users can read group user_preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group user_preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update group user_preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group user_preferences"
ON user_preferences FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- future_statements table
CREATE POLICY "Users can read group future_statements"
ON future_statements FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group future_statements"
ON future_statements FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update group future_statements"
ON future_statements FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group future_statements"
ON future_statements FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- projection_snapshots table
CREATE POLICY "Users can read group snapshots"
ON projection_snapshots FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert group snapshots"
ON projection_snapshots FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can delete group snapshots"
ON projection_snapshots FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());
