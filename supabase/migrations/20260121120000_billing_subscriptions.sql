-- Migration: 20260121120000_billing_subscriptions
-- Feature: billing-subscriptions
-- Date: 2026-01-21
-- Description: Add group-level billing subscriptions table for Stripe integration

-- ============================================================================
-- TABLE: billing_subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  group_id UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (length(status) BETWEEN 1 AND 50),
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for group lookup (redundant with PK but helpful for clarity)
CREATE INDEX IF NOT EXISTS billing_subscriptions_group_id_idx ON billing_subscriptions(group_id);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can read their group's billing status
CREATE POLICY "Group members can read billing subscriptions"
ON billing_subscriptions
FOR SELECT
TO authenticated
USING (group_id = get_user_group_id());

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================

CREATE TRIGGER update_billing_subscriptions_updated_at
  BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


