-- Migration: 008_single_shot_income
-- Feature: 018-single-shot-income
-- Date: 2025-11-28
-- Description: Add support for single-shot (one-time) income

-- ============================================================================
-- STEP 1: Add type column with default for existing rows
-- ============================================================================

ALTER TABLE projects 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'recurring' 
  CHECK (type IN ('recurring', 'single_shot'));

-- ============================================================================
-- STEP 2: Add date column for single-shot income
-- ============================================================================

ALTER TABLE projects ADD COLUMN date DATE;

-- ============================================================================
-- STEP 3: Make recurring-specific fields nullable (required only for recurring)
-- ============================================================================

ALTER TABLE projects ALTER COLUMN frequency DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN payment_schedule DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN is_active DROP NOT NULL;

-- ============================================================================
-- STEP 4: Add constraint to enforce type-specific field requirements
-- ============================================================================

ALTER TABLE projects ADD CONSTRAINT project_type_fields CHECK (
  (type = 'recurring' AND frequency IS NOT NULL AND payment_schedule IS NOT NULL AND is_active IS NOT NULL) OR
  (type = 'single_shot' AND date IS NOT NULL)
);

-- ============================================================================
-- STEP 5: Add index for date-based queries on single-shot income
-- ============================================================================

CREATE INDEX IF NOT EXISTS projects_date_idx 
  ON projects(date) 
  WHERE type = 'single_shot';

-- ============================================================================
-- STEP 6: Add index for type-based filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS projects_type_idx ON projects(type);

