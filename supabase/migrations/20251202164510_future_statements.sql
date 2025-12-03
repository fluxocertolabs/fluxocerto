-- Migration: 20251202000000_future_statements
-- Feature: 023-future-credit-statements
-- Date: 2025-12-02
-- Description: Create future_statements table for pre-defined credit card statement balances

-- =============================================================================
-- TABLE CREATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS future_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  target_month SMALLINT NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  target_year SMALLINT NOT NULL CHECK (target_year >= 2020),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, target_month, target_year)
);

-- Add table comment
COMMENT ON TABLE future_statements IS 'Pre-defined credit card statement balances for future months';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX future_statements_credit_card_id_idx ON future_statements(credit_card_id);
CREATE INDEX future_statements_household_id_idx ON future_statements(household_id);
CREATE INDEX future_statements_target_date_idx ON future_statements(target_year, target_month);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE future_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (household-scoped)
CREATE POLICY "Users can read household future_statements"
ON future_statements FOR SELECT TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household future_statements"
ON future_statements FOR INSERT TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household future_statements"
ON future_statements FOR UPDATE TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household future_statements"
ON future_statements FOR DELETE TO authenticated
USING (household_id = get_user_household_id());

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE future_statements;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger (reuses existing function from initial_schema)
CREATE TRIGGER update_future_statements_updated_at
  BEFORE UPDATE ON future_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

