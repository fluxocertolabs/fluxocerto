-- Migration: 002_invite_auth
-- Feature: 010-invite-auth
-- Date: 2025-11-27
-- Description: Invite-only Magic Link authentication with shared family data access
--
-- ⚠️ DESTRUCTIVE: Removes user_id column from all tables.
-- This migration is ONLY safe for fresh deployments.
-- Existing user data will be lost or become shared.
-- Run a backup before proceeding.

-- ============================================================================
-- ENABLE CITEXT EXTENSION
-- ============================================================================
-- Required for case-insensitive email comparison

CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================================================
-- ALLOWED_EMAILS TABLE
-- ============================================================================
-- Pre-approved email addresses for invite-only access control

CREATE TABLE IF NOT EXISTS allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT -- Optional audit field
);

-- Enable Row Level Security
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- No public access - admin-only via Supabase dashboard or service role
-- Service role can read (for Edge Function)

-- ============================================================================
-- DROP EXISTING USER_ID-BASED RLS POLICIES
-- ============================================================================

-- Accounts table
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;

-- Projects table
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;

-- Expenses table
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;

-- Credit cards table
DROP POLICY IF EXISTS "Users can manage own credit_cards" ON credit_cards;

-- ============================================================================
-- REMOVE USER_ID COLUMNS
-- ============================================================================
-- All data becomes shared among authenticated family members

-- Drop indexes first
DROP INDEX IF EXISTS accounts_user_id_idx;
DROP INDEX IF EXISTS projects_user_id_idx;
DROP INDEX IF EXISTS expenses_user_id_idx;
DROP INDEX IF EXISTS credit_cards_user_id_idx;

-- Remove user_id columns
ALTER TABLE accounts DROP COLUMN IF EXISTS user_id;
ALTER TABLE projects DROP COLUMN IF EXISTS user_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS user_id;
ALTER TABLE credit_cards DROP COLUMN IF EXISTS user_id;

-- ============================================================================
-- CREATE NEW AUTHENTICATED-ONLY RLS POLICIES
-- ============================================================================
-- All authenticated users can manage all data (family sharing model)

-- Accounts table policies
CREATE POLICY "Authenticated users can read all accounts"
ON accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update accounts"
ON accounts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete accounts"
ON accounts FOR DELETE
TO authenticated
USING (true);

-- Projects table policies
CREATE POLICY "Authenticated users can read all projects"
ON projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
ON projects FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
ON projects FOR DELETE
TO authenticated
USING (true);

-- Expenses table policies
CREATE POLICY "Authenticated users can read all expenses"
ON expenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert expenses"
ON expenses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses"
ON expenses FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expenses"
ON expenses FOR DELETE
TO authenticated
USING (true);

-- Credit cards table policies
CREATE POLICY "Authenticated users can read all credit_cards"
ON credit_cards FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert credit_cards"
ON credit_cards FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update credit_cards"
ON credit_cards FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete credit_cards"
ON credit_cards FOR DELETE
TO authenticated
USING (true);

