-- Migration: 20260109120000_group_and_user_preferences_split
-- Feature: 028-notifications-profile
-- Date: 2026-01-09
-- Description: Split preferences into group-scoped (group_preferences) and user-scoped (user_preferences)
--
-- This migration:
-- 1. Renames existing user_preferences → group_preferences (for theme and group-level settings)
-- 2. Adds group_id column and changes uniqueness to (group_id, key)
-- 3. Creates new per-user user_preferences table with (user_id, key) uniqueness
--
-- Background: The existing user_preferences table was designed for theme sync but is actually
-- group-scoped (all group members share the same theme). This migration clarifies the separation
-- between group preferences (shared among members) and user preferences (per-user, like email opt-out).

-- ============================================================================
-- STEP 1: PREPARE EXISTING TABLE FOR RENAME
-- ============================================================================

-- Remove from Realtime publication before renaming (will re-add after rename)
-- Note: Using DO block because ALTER PUBLICATION doesn't support IF EXISTS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE user_preferences;
  END IF;
END $$;

-- Drop existing trigger (will recreate with new name)
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Drop existing RLS policy
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

-- ============================================================================
-- STEP 2: ADD GROUP_ID AND MIGRATE DATA
-- ============================================================================

-- Add group_id column (nullable initially for migration)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS group_id UUID;

-- Populate group_id from profiles table (lookup by user_id → auth.users → profiles.email)
-- This handles the case where profiles.id may not match auth.uid()
UPDATE user_preferences up
SET group_id = p.group_id
FROM auth.users au
JOIN profiles p ON p.email = au.email::citext
WHERE up.user_id = au.id
  AND up.group_id IS NULL;

-- For any remaining rows without group_id (edge case), try direct profile lookup
UPDATE user_preferences up
SET group_id = p.group_id
FROM profiles p
WHERE p.id = up.user_id
  AND up.group_id IS NULL;

-- Make group_id NOT NULL (after migration)
-- First, check for orphaned rows (no matching profile) and fail if any exist
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Count orphaned rows
  SELECT COUNT(*) INTO orphan_count
  FROM user_preferences
  WHERE group_id IS NULL;
  
  IF orphan_count > 0 THEN
    -- Create backup table for manual recovery
    CREATE TABLE IF NOT EXISTS _migration_orphan_user_preferences_backup (
      id UUID,
      user_id UUID,
      key TEXT,
      value TEXT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      backup_timestamp TIMESTAMPTZ DEFAULT now(),
      migration_id TEXT DEFAULT '20260109120000'
    );
    
    -- Backup orphaned rows
    INSERT INTO _migration_orphan_user_preferences_backup (id, user_id, key, value, created_at, updated_at)
    SELECT id, user_id, key, value, created_at, updated_at
    FROM user_preferences
    WHERE group_id IS NULL;
    
    -- Fail loudly - do not silently delete data
    RAISE EXCEPTION 'Migration blocked: % orphaned user_preferences rows found (no matching profile). Rows backed up to _migration_orphan_user_preferences_backup. Please review and manually resolve before re-running migration.', orphan_count;
  END IF;
END $$;

-- Only reached if no orphans exist - safe to proceed
DELETE FROM user_preferences WHERE group_id IS NULL;
ALTER TABLE user_preferences ALTER COLUMN group_id SET NOT NULL;

-- Add foreign key constraint to groups
ALTER TABLE user_preferences
ADD CONSTRAINT user_preferences_group_id_fkey
FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: CHANGE UNIQUENESS CONSTRAINT
-- ============================================================================

-- Drop old unique constraint on (user_id, key)
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_key_key;

-- Add new unique constraint on (group_id, key)
ALTER TABLE user_preferences ADD CONSTRAINT group_preferences_group_id_key_key UNIQUE (group_id, key);

-- ============================================================================
-- STEP 4: RENAME TABLE TO GROUP_PREFERENCES
-- ============================================================================

ALTER TABLE user_preferences RENAME TO group_preferences;

-- Rename index to match new table name
ALTER INDEX IF EXISTS user_preferences_user_id_idx RENAME TO group_preferences_user_id_idx;

-- Add index on group_id for RLS performance
CREATE INDEX IF NOT EXISTS group_preferences_group_id_idx ON group_preferences(group_id);

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES FOR GROUP_PREFERENCES
-- ============================================================================

-- Enable RLS (already enabled, but ensure it's on)
ALTER TABLE group_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can read preferences for their group
CREATE POLICY "Group members can read group preferences"
ON group_preferences
FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

-- Policy: Group members can insert preferences for their group
CREATE POLICY "Group members can insert group preferences"
ON group_preferences
FOR INSERT
TO authenticated
WITH CHECK (group_id = get_user_group_id());

-- Policy: Group members can update preferences for their group
CREATE POLICY "Group members can update group preferences"
ON group_preferences
FOR UPDATE
TO authenticated
USING (group_id = get_user_group_id())
WITH CHECK (group_id = get_user_group_id());

-- Policy: Group members can delete preferences for their group
CREATE POLICY "Group members can delete group preferences"
ON group_preferences
FOR DELETE
TO authenticated
USING (group_id = get_user_group_id());

-- ============================================================================
-- STEP 6: RECREATE TRIGGER FOR GROUP_PREFERENCES
-- ============================================================================

CREATE TRIGGER update_group_preferences_updated_at
  BEFORE UPDATE ON group_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: RE-ADD TO REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE group_preferences;

-- ============================================================================
-- STEP 8: CREATE NEW PER-USER USER_PREFERENCES TABLE
-- ============================================================================

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

-- Index for user lookup
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: RLS POLICIES FOR USER_PREFERENCES
-- ============================================================================

-- Policy: Users can only SELECT their own preferences
CREATE POLICY "Users can read own preferences"
ON user_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can only INSERT their own preferences
CREATE POLICY "Users can insert own preferences"
ON user_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can only UPDATE their own preferences
CREATE POLICY "Users can update own preferences"
ON user_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can only DELETE their own preferences
CREATE POLICY "Users can delete own preferences"
ON user_preferences
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- STEP 10: TRIGGER FOR USER_PREFERENCES
-- ============================================================================

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 11: REALTIME FOR USER_PREFERENCES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

