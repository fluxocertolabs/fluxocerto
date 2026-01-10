# Research: Notifications & Profile Settings

**Spec**: [spec.md](./spec.md)  
**Branch**: `028-notifications-profile`  
**Date**: 2026-01-09

This document captures key technical decisions and rationale for implementing **Notifications (in-app + email)** and **Profile settings** in Fluxo Certo, based on existing repo patterns and the feature spec requirements.

## Key repo patterns (high-signal)

- **Supabase-first backend**: client uses Supabase PostgREST/RPC + Realtime as the primary API surface.
- **RLS tenant model**: most domain tables are **group-scoped** via `group_id` and RLS helper `get_user_group_id()` (derived from the JWT email claim → `profiles.email`).
- **Profiles are keyed by email**: `profiles.email` is the stable identity; `profiles.id` may not match `auth.uid()` for invited users. Updates to “my profile” use email-based RLS.
- **Realtime consumption pattern exists**: `src/hooks/use-finance-data.ts` subscribes to `postgres_changes` and treats persistence as source-of-truth, refetching on reconnect/reload.
- **Preferences table is currently group-scoped**: `user_preferences` is used for **theme** and is unique by `(group_id, key)`; it includes `user_id` but uniqueness is per-group.
- **Local email testing exists**: Supabase local runs with **Mailpit** (web UI at `http://localhost:54324`) for capturing emails; E2E uses `InbucketClient` (Mailpit-backed) to read mailbox content.

## Decisions

### D1 — Notification persistence model

- **Decision**: Create a `notifications` table in `public` with **recipient-scoped** rows (`user_id` → `auth.users(id)`), storing message content, optional primary action, read state, and idempotency key.
- **Rationale**:
  - Meets FR-002/FR-003/FR-005/FR-019/FR-020 with a durable source of truth.
  - Aligns with existing per-user state tables (`tour_states`) and supports Realtime (FR-008).
- **Alternatives considered**:
  - **Ephemeral-only notifications** (toasts): rejected (FR-002 requires persistence).
  - **Separate read-state join table** (`notification_reads`): rejected for v1; unnecessary complexity when recipient is a single `user_id`.

### D2 — Read/unread representation

- **Decision**: Use a nullable `read_at TIMESTAMPTZ` on `notifications`; unread = `read_at IS NULL`.
- **Rationale**: supports ordering, auditing, and simple queries for unread counts.
- **Alternatives considered**: boolean `is_read`; rejected because timestamp is more useful and equivalent complexity.

### D3 — Welcome notification creation (idempotent, per-user)

- **Decision**: Add `dedupe_key TEXT NULL` and enforce idempotency with `UNIQUE(user_id, dedupe_key)`. Create a `SECURITY DEFINER` RPC `ensure_welcome_notification()` that inserts the welcome notification with `dedupe_key = 'welcome-v1'` and returns `{ created, notification_id }`.
- **Rationale**:
  - Meets FR-006/FR-006a with a **database-level uniqueness guarantee**.
  - Works for both existing users and new users: call on first authenticated app entry after release.
  - Keeps notification contents system-controlled (vs allowing arbitrary client inserts).
- **Alternatives considered**:
  - Create welcome only via `on_auth_user_created` trigger: rejected (must apply to existing users too).
  - Client-side insert directly into `notifications`: acceptable but rejected for stronger “system-owned” semantics.

### D4 — Live updates (Realtime) strategy

- **Decision**: Use Supabase Realtime `postgres_changes` subscription on `notifications` (schema `public`, table `notifications`) with a row filter:
  - `filter: 'user_id=eq.<auth.uid>'`
  - Subscribe to `event: '*'` and update local state via “upsert-by-id” to avoid duplicates.
  - On disconnect/reconnect, refetch inbox to converge (persistence remains source-of-truth).
- **Rationale**:
  - Matches existing realtime architecture (best-effort live, refetch fallback).
  - Reduces client work while keeping correctness on reload (FR-008, Story 2 scenario 2).
- **Alternatives considered**:
  - No realtime: rejected (FR-008).
  - Subscribe without `filter`: workable (RLS still applies), but filtering reduces noise and makes intent explicit.

### D5 — Preferences split (group vs user)

- **Decision**: Split preferences by scope:
  - Rename existing group-scoped `user_preferences` → `group_preferences`.
  - Create a new per-user `user_preferences` key-value table with `(user_id, key, value, created_at, updated_at)` and `UNIQUE(user_id, key)` (or `PRIMARY KEY (user_id, key)`).
  - Update theme sync code to use `group_preferences` (theme remains group-scoped).
- **Rationale**:
  - Directly follows spec clarifications (“rename/split preferences”).
  - Restores a clean separation between shared group settings and per-user settings (email opt-out).
- **Alternatives considered**:
  - Keep everything in one table with both `group_id` and `user_id` keys: rejected; ambiguity and higher risk of accidental leakage/mis-scoping.

### D6 — Email notification preference semantics

- **Decision**: Store email opt-out in per-user `user_preferences` under key `email_notifications_enabled` with value `'true'`/`'false'`.
  - Default when missing: **enabled** (opt-out), per FR-010a.
- **Rationale**: simple to query, supports future extension to more keys without schema changes.
- **Alternatives considered**:
  - Boolean column table (`user_email_preferences`): rejected (less flexible, more migrations later).

### D7 — Profile settings update model

- **Decision**: Update display name via `profiles.name` using existing RLS policy `"Users can update own profile"` (email-based).
  - Email is displayed read-only from the authenticated user session (`auth.getUser()` / `useAuth()`).
- **Rationale**:
  - Matches onboarding implementation which already updates profile name by `eq('email', user.email.toLowerCase())`.
  - Avoids new schema for “display name”.
- **Alternatives considered**:
  - Store display name in Auth user metadata: rejected; current app uses `profiles` as the canonical profile surface.

### D8 — Welcome email delivery

- **Decision**: Implement welcome email delivery via a **Supabase Edge Function** (trusted environment) using a provider API (Resend recommended given existing SMTP guide).
  - The send handler checks `user_preferences.email_notifications_enabled` at **send time** (FR-010, Story 4 scenario 3).
  - Ensure idempotency by recording send status (e.g., `notifications.email_sent_at` for welcome or a separate delivery log keyed by `(notification_id, channel)`), and skip if already sent.
  - Development/test mode (FR-013): if provider credentials are absent, return a **safe preview payload** (subject + HTML/text) and log it server-side (no external delivery).
- **Rationale**:
  - Meets FR-012: secrets stay server-side.
  - Keeps behavior testable in dev without external inboxes.
- **Alternatives considered**:
  - DB-trigger → HTTP call to function: rejected for v1 (repo doesn’t currently use `pg_net`/HTTP triggers; added operational complexity).
  - Client-side SMTP: rejected (secrets exposure).


