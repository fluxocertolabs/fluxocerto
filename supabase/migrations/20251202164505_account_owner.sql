-- Migration: 005_account_owner
-- Feature: 017-account-owner
-- Date: 2025-11-28
-- Description: Add account owner assignment via profiles table

-- ============================================================================
-- RENAME allowed_emails TO profiles
-- ============================================================================

ALTER TABLE allowed_emails RENAME TO profiles;

-- ============================================================================
-- ADD name COLUMN TO profiles
-- ============================================================================

-- Add name column with temporary default
ALTER TABLE profiles ADD COLUMN name TEXT NOT NULL DEFAULT '';

-- Make email nullable (profiles can exist without login capability)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- ============================================================================
-- ADD RLS POLICY FOR profiles SELECT
-- ============================================================================

-- Allow authenticated users to read profiles (for dropdown)
CREATE POLICY "Authenticated users can read profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- ADD owner_id TO accounts
-- ============================================================================

ALTER TABLE accounts 
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX accounts_owner_id_idx ON accounts(owner_id);

-- ============================================================================
-- ADD owner_id TO credit_cards
-- ============================================================================

ALTER TABLE credit_cards
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX credit_cards_owner_id_idx ON credit_cards(owner_id);

