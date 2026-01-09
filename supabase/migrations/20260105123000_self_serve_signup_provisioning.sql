-- Migration: self_serve_signup_provisioning
-- Feature: 027-signup-onboarding-tours
-- Date: 2026-01-05
-- Description: Implement self-serve signup provisioning to ensure new users always have
--              a valid group and profile membership. Prevents "orphaned first login" errors.
--
-- This migration:
-- 1. Creates ensure_current_user_group() RPC function (SECURITY DEFINER, idempotent)
-- 2. Creates trigger on auth.users to call provisioning on user creation (best-effort)
--
-- Invariants:
-- - After authentication, user always has a profiles row with valid group_id
-- - For self-serve signups, group_id = auth.uid() (deterministic, avoids orphaned groups)
-- - Existing invited users keep their current group membership

-- ============================================================================
-- FUNCTION: ensure_current_user_group()
-- ============================================================================
-- Idempotent RPC that ensures the current authenticated user has a valid
-- profile and group membership. Safe to call multiple times.
--
-- Returns: { group_id: uuid, created: boolean }
-- - group_id: The user's group ID (existing or newly created)
-- - created: true if a new group was created, false if existing

CREATE OR REPLACE FUNCTION ensure_current_user_group()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email CITEXT;
  v_existing_profile RECORD;
  v_group_id UUID;
  v_created BOOLEAN := false;
  v_name TEXT;
  v_xmax xid;
BEGIN
  -- Get current user context
  v_user_id := auth.uid();
  v_email := (auth.jwt() ->> 'email')::citext;
  
  -- Guard: Require authenticated user with email
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;
  
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email not found in authentication context' USING ERRCODE = 'P0002';
  END IF;
  
  -- Check for existing profile by email
  SELECT id, group_id, name INTO v_existing_profile
  FROM profiles
  WHERE email = v_email;
  
  IF v_existing_profile.id IS NOT NULL THEN
    -- User has existing profile (invited or previously provisioned)
    v_group_id := v_existing_profile.group_id;
    
    -- Ensure the group still exists (edge case: group was deleted).
    -- Use INSERT as the source of truth (avoids SELECT-then-INSERT race).
    INSERT INTO groups (id, name, created_at, updated_at)
    VALUES (v_group_id, 'Meu Grupo', now(), now())
    ON CONFLICT (id) DO NOTHING;
    v_created := FOUND;
    
    RETURN jsonb_build_object('group_id', v_group_id, 'created', v_created);
  END IF;
  
  -- New self-serve user: create group with deterministic ID = auth.uid()
  -- This ensures idempotency and prevents orphaned groups from race conditions
  v_group_id := v_user_id;
  
  -- Create the group (ON CONFLICT handles race conditions)
  INSERT INTO groups (id, name, created_at, updated_at)
  VALUES (v_group_id, 'Meu Grupo', now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- Extract display name from email (part before @, cleaned up)
  v_name := split_part(v_email::text, '@', 1);
  v_name := regexp_replace(v_name, '[._-]', ' ', 'g');
  v_name := initcap(v_name);
  
  -- Ensure name is not empty
  IF v_name IS NULL OR v_name = '' THEN
    v_name := 'Usuário';
  END IF;
  
  -- Create the profile (ON CONFLICT handles race conditions)
  INSERT INTO profiles (id, email, group_id, name, created_at)
  VALUES (v_user_id, v_email, v_group_id, v_name, now())
  ON CONFLICT (email) DO UPDATE SET
    -- If profile exists but was created by another process, just update group_id if null
    group_id = COALESCE(profiles.group_id, EXCLUDED.group_id)
  RETURNING group_id, xmax INTO v_group_id, v_xmax;
  
  -- xmax = 0 means this statement inserted a new row (vs conflict update path)
  v_created := (v_xmax = 0);
  
  RETURN jsonb_build_object('group_id', v_group_id, 'created', v_created);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_current_user_group() TO authenticated;

-- ============================================================================
-- TRIGGER: on_auth_user_created
-- ============================================================================
-- Best-effort trigger to provision new users immediately on creation.
-- Client-side recovery (calling ensure_current_user_group RPC) handles failures.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email CITEXT;
  v_group_id UUID;
  v_name TEXT;
  v_existing_profile RECORD;
BEGIN
  -- Get email from the new user
  v_email := NEW.email::citext;
  
  -- Skip if no email (shouldn't happen for Magic Link auth)
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;
  
  -- Check for existing profile (invited user case)
  SELECT id, group_id INTO v_existing_profile
  FROM profiles
  WHERE email = v_email;
  
  IF v_existing_profile.id IS NOT NULL THEN
    -- Profile already exists (invited user), nothing to do
    RETURN NEW;
  END IF;
  
  -- New self-serve user: create group and profile
  v_group_id := NEW.id;
  
  -- Create the group
  INSERT INTO groups (id, name, created_at, updated_at)
  VALUES (v_group_id, 'Meu Grupo', now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- Extract display name from email
  v_name := split_part(v_email::text, '@', 1);
  v_name := regexp_replace(v_name, '[._-]', ' ', 'g');
  v_name := initcap(v_name);
  
  IF v_name IS NULL OR v_name = '' THEN
    v_name := 'Usuário';
  END IF;
  
  -- Create the profile
  INSERT INTO profiles (id, email, group_id, name, created_at)
  VALUES (NEW.id, v_email, v_group_id, v_name, now())
  ON CONFLICT (email) DO UPDATE SET
    -- If profile exists but was created by another process, just update group_id if null
    group_id = COALESCE(profiles.group_id, EXCLUDED.group_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    -- Client-side recovery will handle provisioning
    RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


