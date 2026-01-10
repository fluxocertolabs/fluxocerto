# Data Model: Notifications & Profile Settings

**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)  
**Branch**: `028-notifications-profile`

This document describes the entities, fields, relationships, and constraints needed to implement **in-app notifications**, **email opt-out**, and **profile settings**.

## New / changed tables (overview)

- **New**: `notifications` (per-user, persistent inbox)
- **Change**: rename existing `user_preferences` → `group_preferences` (group-scoped preferences like theme)
- **New**: `user_preferences` (per-user key-value preferences; stores `email_notifications_enabled`)

## Entity: `notifications` (new)

### Purpose
Persistent, user-scoped notifications inbox (source-of-truth) with unread/read state and optional primary action.

### Core fields (proposed)

| Field | Type | Nullable | Notes / Constraints |
|------|------|----------|---------------------|
| `id` | `uuid` | no | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | no | FK → `auth.users(id)` (canonical recipient) |
| `type` | `text` | no | v1 supports `'welcome'`; enforce via `CHECK` or future enum |
| `title` | `text` | no | short heading (pt-BR), length guard (e.g. 1–120) |
| `body` | `text` | no | message body (pt-BR), length guard (e.g. 1–2000) |
| `primary_action_label` | `text` | yes | optional CTA label (pt-BR), length guard (e.g. ≤ 80) |
| `primary_action_href` | `text` | yes | optional destination (relative path like `/manage`) |
| `dedupe_key` | `text` | yes | idempotency key; for welcome use `'welcome-v1'` |
| `read_at` | `timestamptz` | yes | unread if `NULL` |
| `email_sent_at` | `timestamptz` | yes | set by email sender (welcome email v1) to prevent duplicates |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()`, maintained via trigger |

### Indexes / constraints (proposed)

- `INDEX notifications_user_id_created_at_idx (user_id, created_at DESC)` for inbox sorting.
- `UNIQUE (user_id, dedupe_key)` for DB-level idempotency (allows multiple NULLs).
- Optional: `INDEX notifications_user_id_unread_idx (user_id) WHERE read_at IS NULL` for fast unread count.

### RLS (required)

- **SELECT**: `USING (user_id = auth.uid())`
- **UPDATE** (mark read): `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
- **INSERT**: prefer **no direct client insert**; welcome creation via `SECURITY DEFINER` RPC.

### State transitions

- **Unread → Read**: set `read_at = now()` (idempotent; re-marking read is safe).
- **Email status** (P2): `email_sent_at` transitions from `NULL` → timestamp after successful send.

## Entity: `group_preferences` (rename of existing `user_preferences`)

### Purpose
Group-scoped preferences shared across members (currently used for theme sync).

### Notes

- Existing table currently has `group_id` and uniqueness on `(group_id, key)`.
- This feature renames it to avoid confusion with per-user preferences.
- Theme sync code (`src/lib/theme-service.ts`) will move from `user_preferences` → `group_preferences`.

## Entity: `user_preferences` (new per-user table)

### Purpose
Per-user key/value preference store (not shared across group members). v1 stores the **email notifications opt-out**.

### Core fields (as per spec clarification)

| Field | Type | Nullable | Notes / Constraints |
|------|------|----------|---------------------|
| `user_id` | `uuid` | no | FK → `auth.users(id)` |
| `key` | `text` | no | length guard (e.g. 1–50) |
| `value` | `text` | no | length guard (e.g. 1–500) |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` + trigger |

### Constraints

- `UNIQUE (user_id, key)` (or `PRIMARY KEY (user_id, key)` if preferred).
- RLS: users can read/write only their own rows (`user_id = auth.uid()`).

### v1 keys

- `email_notifications_enabled`: `'true' | 'false'`
  - Default semantics: if row missing, treat as **enabled** (opt-out), per FR-010a.

## Entity: `profiles` (existing)

### Purpose
Holds user-facing profile info used throughout the app (group membership + display name).

### Relevant fields

- `profiles.email` (unique, used for membership/RLS helper mapping)
- `profiles.name` (display name; editable by the user)
- `profiles.group_id` (tenant membership)

### Constraints / RLS (existing)

- Users can update their own profile row via email-based RLS:
  - `USING (email = (auth.jwt() ->> 'email')::citext)`


