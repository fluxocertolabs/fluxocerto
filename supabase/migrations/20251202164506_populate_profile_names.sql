-- Migration: 006_populate_profile_names
-- Feature: 017-account-owner
-- Date: 2025-11-28
-- Description: Populate profile names from email addresses for existing profiles

-- ============================================================================
-- POPULATE PROFILE NAMES FROM EMAILS
-- ============================================================================
-- Extract name from email (part before @) and capitalize first letter
-- This handles existing profiles that were migrated from allowed_emails

UPDATE profiles
SET name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE name = '' AND email IS NOT NULL;

-- ============================================================================
-- ENSURE BOTH PROFILES EXIST
-- ============================================================================
-- Insert profiles if they don't exist (in case allowed_emails was empty)

INSERT INTO profiles (name, email)
SELECT 'Daniel', 'delucca@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE email = 'delucca@gmail.com'
);

INSERT INTO profiles (name, email)
SELECT 'Aryane', 'aryanefr@gmail.com'  
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE email = 'aryanefr@gmail.com'
);

-- Update names in case they were auto-generated incorrectly
UPDATE profiles SET name = 'Daniel' WHERE email = 'delucca@gmail.com';
UPDATE profiles SET name = 'Aryane' WHERE email = 'aryanefr@gmail.com';

