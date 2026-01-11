-- Migration: 20260109120100_notifications
-- Feature: 028-notifications-profile
-- Date: 2026-01-09
-- Description: Create notifications table with RLS and helper RPCs for in-app notifications
--
-- This migration creates:
-- 1. notifications table (per-user, persistent inbox)
-- 2. RLS policies restricting access to user_id = auth.uid()
-- 3. SECURITY DEFINER RPC for marking notifications as read (least-privilege)
-- 4. SECURITY DEFINER RPC for ensuring welcome notification exists (idempotent)
-- 5. Realtime publication for live updates

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('welcome')), -- v1 supports only 'welcome', extensible later
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  primary_action_label TEXT CHECK (primary_action_label IS NULL OR length(primary_action_label) BETWEEN 1 AND 80),
  primary_action_href TEXT CHECK (primary_action_href IS NULL OR length(primary_action_href) BETWEEN 1 AND 500),
  dedupe_key TEXT CHECK (dedupe_key IS NULL OR length(dedupe_key) BETWEEN 1 AND 100),
  read_at TIMESTAMPTZ, -- NULL = unread
  email_sent_at TIMESTAMPTZ, -- NULL = not sent, set by server after successful send
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary index for inbox queries (user_id, created_at desc)
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx 
ON notifications(user_id, created_at DESC);

-- Unique constraint for idempotency (allows multiple NULLs in dedupe_key)
-- PostgreSQL treats NULLs as distinct in unique constraints, so this works correctly
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_id_dedupe_key_idx 
ON notifications(user_id, dedupe_key) 
WHERE dedupe_key IS NOT NULL;

-- Optional: Partial index for fast unread count queries
CREATE INDEX IF NOT EXISTS notifications_user_id_unread_idx 
ON notifications(user_id) 
WHERE read_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Note: No direct INSERT/UPDATE/DELETE policies for clients
-- All mutations go through SECURITY DEFINER RPCs for least-privilege access

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Make the realtime publication change resilient to re-apply.
-- ALTER PUBLICATION ... ADD TABLE ... can fail if the table is already in the publication
-- (depending on Postgres/Supabase behavior). If you frequently re-run migrations in dev,
-- consider guarding it with a DO block check:
--
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_publication_tables
--     WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
--   ) THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
--   END IF;
-- END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- RPC: mark_notification_read
-- ============================================================================
-- SECURITY DEFINER RPC that sets read_at = now() for the invoker's notification only.
-- This is the least-privilege approach - clients cannot update other fields.

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update read_at only for the current user's notification
  -- Idempotent: re-marking as read is safe (just updates timestamp)
  UPDATE notifications
  SET read_at = now()
  WHERE id = notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL; -- Only update if currently unread (optional optimization)
  
  -- No error if notification doesn't exist or doesn't belong to user
  -- This prevents information leakage about other users' notifications
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;

-- ============================================================================
-- RPC: ensure_welcome_notification
-- ============================================================================
-- SECURITY DEFINER RPC that creates exactly one welcome notification per user.
-- Uses dedupe_key = 'welcome-v1' with UNIQUE(user_id, dedupe_key) constraint.
-- Returns { created: boolean, notification_id: uuid }

CREATE OR REPLACE FUNCTION ensure_welcome_notification()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_notification_id UUID;
  v_created BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated' USING ERRCODE = 'P0001';
  END IF;
  
  -- Try to insert the welcome notification
  -- ON CONFLICT handles the case where it already exists
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    primary_action_label,
    primary_action_href,
    dedupe_key
  ) VALUES (
    v_user_id,
    'welcome',
    'Bem-vindo ao Fluxo Certo! 🎉',
    'Estamos felizes em ter você aqui. O Fluxo Certo vai te ajudar a organizar suas finanças pessoais e familiares de forma simples e eficiente. Explore as funcionalidades e comece a ter controle total do seu dinheiro!',
    'Começar a usar',
    '/manage',
    'welcome-v1'
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_notification_id;
  
  -- Check if we actually inserted a new row
  IF v_notification_id IS NOT NULL THEN
    v_created := TRUE;
  ELSE
    -- Row already exists, fetch the existing notification_id
    SELECT id INTO v_notification_id
    FROM notifications
    WHERE user_id = v_user_id
      AND dedupe_key = 'welcome-v1';
  END IF;
  
  RETURN jsonb_build_object(
    'created', v_created,
    'notification_id', v_notification_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_welcome_notification() TO authenticated;

