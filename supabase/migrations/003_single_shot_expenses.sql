-- Migration: 003_single_shot_expenses
-- Feature: 014-single-shot-expenses
-- Date: 2025-11-28
-- Description: Add support for single-shot (one-time) expenses

-- ============================================================================
-- STEP 1: Add type column with default for existing rows
-- ============================================================================

ALTER TABLE expenses 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed' 
  CHECK (type IN ('fixed', 'single_shot'));

-- ============================================================================
-- STEP 2: Add date column for single-shot expenses
-- ============================================================================

ALTER TABLE expenses ADD COLUMN date DATE;

-- ============================================================================
-- STEP 3: Make due_day nullable (required only for fixed expenses)
-- ============================================================================

ALTER TABLE expenses ALTER COLUMN due_day DROP NOT NULL;

-- ============================================================================
-- STEP 4: Add constraint to enforce type-specific field requirements
-- ============================================================================

ALTER TABLE expenses ADD CONSTRAINT expense_type_fields CHECK (
  (type = 'fixed' AND due_day IS NOT NULL) OR
  (type = 'single_shot' AND date IS NOT NULL)
);

-- ============================================================================
-- STEP 5: Add index for date-based queries on single-shot expenses
-- ============================================================================

CREATE INDEX IF NOT EXISTS expenses_date_idx 
  ON expenses(date) 
  WHERE type = 'single_shot';

-- ============================================================================
-- STEP 6: Add index for type-based filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS expenses_type_idx ON expenses(type);

