-- Migration: 007_cleanup_profiles
-- Feature: 017-account-owner
-- Date: 2025-11-28
-- Description: Clean up duplicate profiles and keep only Daniel and Aryane

-- ============================================================================
-- CLEAR owner_id REFERENCES BEFORE CLEANUP
-- ============================================================================
-- Set all owner references to NULL to avoid FK constraint issues

UPDATE accounts SET owner_id = NULL;
UPDATE credit_cards SET owner_id = NULL;

-- ============================================================================
-- DELETE ALL EXISTING PROFILES
-- ============================================================================
-- Start fresh with only the two family members

DELETE FROM profiles;

-- ============================================================================
-- INSERT ONLY DANIEL AND ARYANE
-- ============================================================================

INSERT INTO profiles (name, email) VALUES ('Daniel', 'delucca@gmail.com');
INSERT INTO profiles (name, email) VALUES ('Aryane', 'aryanefr@gmail.com');

