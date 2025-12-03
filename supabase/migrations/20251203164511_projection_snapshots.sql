-- Migration: projection_snapshots
-- Feature: 025-projection-snapshots
-- Date: 2025-12-03
-- Description: Create projection_snapshots table for historical snapshot storage

-- ============================================================================
-- PROJECTION_SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS projection_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  schema_version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient list queries (household + date ordering)
CREATE INDEX IF NOT EXISTS projection_snapshots_household_created_idx 
ON projection_snapshots(household_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE projection_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can read household snapshots"
ON projection_snapshots FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household snapshots"
ON projection_snapshots FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household snapshots"
ON projection_snapshots FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());

