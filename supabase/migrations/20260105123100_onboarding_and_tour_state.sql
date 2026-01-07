-- Migration: onboarding_and_tour_state
-- Feature: 027-signup-onboarding-tours
-- Date: 2026-01-05
-- Description: Create tables for persisting onboarding wizard and page tour state.
--              Enables server-side persistence for cross-device consistency.
--
-- This migration:
-- 1. Creates onboarding_states table (per user + group)
-- 2. Creates tour_states table (per user + tour)
-- 3. Adds RLS policies for both tables
-- 4. Adds RLS update policies for groups.name and profiles.name (for onboarding edits)

-- ============================================================================
-- TABLE: onboarding_states
-- ============================================================================
-- Tracks onboarding wizard progress per user per group.
-- Supports: auto-show once, resume after refresh, skip/dismiss persistence.

CREATE TABLE IF NOT EXISTS onboarding_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'dismissed', 'completed')),
  current_step TEXT NOT NULL DEFAULT 'profile' CHECK (current_step IN ('profile', 'group', 'bank_account', 'income', 'expense', 'credit_card', 'done')),
  auto_shown_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one onboarding state per user per group
  CONSTRAINT onboarding_states_user_group_key UNIQUE (user_id, group_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS onboarding_states_user_id_idx ON onboarding_states(user_id);
CREATE INDEX IF NOT EXISTS onboarding_states_group_id_idx ON onboarding_states(group_id);

-- Enable RLS
ALTER TABLE onboarding_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own onboarding state for their group
CREATE POLICY "Users can read own onboarding state"
ON onboarding_states FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND group_id = get_user_group_id());

CREATE POLICY "Users can insert own onboarding state"
ON onboarding_states FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND group_id = get_user_group_id());

CREATE POLICY "Users can update own onboarding state"
ON onboarding_states FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND group_id = get_user_group_id())
WITH CHECK (user_id = auth.uid() AND group_id = get_user_group_id());

CREATE POLICY "Users can delete own onboarding state"
ON onboarding_states FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND group_id = get_user_group_id());

-- Updated_at trigger
CREATE TRIGGER update_onboarding_states_updated_at
  BEFORE UPDATE ON onboarding_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: tour_states
-- ============================================================================
-- Tracks page tour completion/dismissal per user per tour.
-- Supports: auto-show once per version, replay, cross-device persistence.

CREATE TABLE IF NOT EXISTS tour_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL CHECK (tour_key IN ('dashboard', 'manage', 'history')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'dismissed')),
  version INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one state per user per tour
  CONSTRAINT tour_states_user_tour_key UNIQUE (user_id, tour_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS tour_states_user_id_idx ON tour_states(user_id);

-- Enable RLS
ALTER TABLE tour_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own tour states
CREATE POLICY "Users can read own tour states"
ON tour_states FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tour states"
ON tour_states FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tour states"
ON tour_states FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tour states"
ON tour_states FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_tour_states_updated_at
  BEFORE UPDATE ON tour_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS UPDATE POLICIES: groups.name and profiles.name
-- ============================================================================
-- Allow users to update their group name and their own profile name during onboarding.

-- Groups: Allow update of name for user's own group
CREATE POLICY "Users can update own group"
ON groups FOR UPDATE
TO authenticated
USING (id = get_user_group_id())
WITH CHECK (id = get_user_group_id());

-- Profiles: Allow users to update their own profile (matched by email)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (email = (auth.jwt() ->> 'email')::citext)
WITH CHECK (email = (auth.jwt() ->> 'email')::citext);

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================
-- Enable Realtime for onboarding and tour state tables

ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_states;
ALTER PUBLICATION supabase_realtime ADD TABLE tour_states;





