# Data Model: Self-Serve Signup, Onboarding & Tours

**Feature**: 027-signup-onboarding-tours  
**Date**: 2026-01-05

## Overview

This feature introduces **persisted onboarding + tour state** and a **first-login provisioning invariant**:

- A newly authenticated self-serve user must always have a valid **group** and **profile membership** before the app loads group-scoped data.
- Onboarding wizard progress is persisted **server-side** per user + group.
- Page tour completion/dismissal is persisted **server-side** per user per page (versioned).

All monetary values remain stored as **integer cents** in existing finance tables.

## Existing Entities (Already in DB)

### `groups` (Group)

Fields (existing):
- `id`: UUID
- `name`: text
- `created_at`, `updated_at`: timestamptz

Notes:
- Existing RLS currently allows **read** of the current user’s group.
- This feature requires **update** permission for users to set/rename the group during onboarding.

### `profiles` (Profile / Membership)

Profiles serve two purposes:
- **Membership anchor**: `profiles.email` + `profiles.group_id` is used by RLS (`get_user_group_id()` reads by email).
- **People**: `profiles.name` is displayed and used for owner assignments (accounts/cards).

Relevant fields (existing):
- `id`: UUID
- `name`: text (non-empty string constraint enforced by app)
- `email`: citext (nullable, unique when present)
- `group_id`: UUID (FK to `groups`)
- `created_at`, `created_by`: timestamps/audit

Notes:
- This feature requires **update** permission for users to set their display name during onboarding.

### Finance entities used for “minimum setup complete”

Minimum setup complete is defined by the spec (FR-009) as:

- ≥ 1 bank account
- ≥ 1 income source
- ≥ 1 expense

In current schema, these map to:

#### `accounts` (BankAccount)

Used for:
- Bank accounts (`type`: `'checking' | 'savings' | 'investment'`)

Minimum setup rule:
- `accounts.count(group_id = current_group) >= 1`

#### `projects` (Income Source)

Used for:
- Recurring income (`type === 'recurring'`)
- Single-shot income (`type === 'single_shot'`)

Minimum setup rule:
- `projects.count(group_id = current_group) >= 1`

#### `expenses` (Expense)

Used for:
- Fixed expenses (`type === 'fixed'`)
- Single-shot expenses (`type === 'single_shot'`)

Minimum setup rule:
- `expenses.count(group_id = current_group) >= 1`

#### `credit_cards` (Optional)

Credit cards are optional in minimum setup. They appear in onboarding as an optional step.

## New Entities (Introduced by this feature)

### `onboarding_states` (Per user + group onboarding progress)

Purpose:
- Store whether onboarding is **in progress**, **dismissed**, or **completed**
- Store enough progress metadata to **resume** after refresh/device switch
- Enforce “auto-show at most once per user per group”

Proposed fields:
- `id`: UUID PK
- `user_id`: UUID FK → `auth.users(id)` (authenticated user)
- `group_id`: UUID FK → `groups(id)` (current group)
- `status`: text enum: `'in_progress' | 'dismissed' | 'completed'`
- `current_step`: text enum: `'profile' | 'group' | 'bank_account' | 'income' | 'expense' | 'credit_card' | 'done'`
- `auto_shown_at`: timestamptz | null (null → eligible for initial auto-show if minimum setup incomplete)
- `dismissed_at`: timestamptz | null
- `completed_at`: timestamptz | null
- `metadata`: jsonb | null (optional; e.g. “credit_card_skipped”: true)
- `created_at`, `updated_at`: timestamptz

Constraints:
- Unique `(user_id, group_id)` — exactly one onboarding state per user+group
- `status` and `current_step` constrained to allowed values

RLS:
- Read/write allowed only when:
  - `user_id = auth.uid()` AND
  - `group_id = get_user_group_id()`

### `tour_states` (Per user tour completion/dismissal, versioned)

Purpose:
- Track per-page tour completion/dismissal server-side (cross-device)
- Support “version bump” to re-trigger tours after meaningful changes

Proposed fields:
- `id`: UUID PK
- `user_id`: UUID FK → `auth.users(id)`
- `tour_key`: text enum: `'dashboard' | 'manage' | 'history'`
- `status`: text enum: `'completed' | 'dismissed'`
- `version`: integer (current tour content version last seen)
- `completed_at`: timestamptz | null
- `dismissed_at`: timestamptz | null
- `created_at`, `updated_at`: timestamptz

Constraints:
- Unique `(user_id, tour_key)` — single state row per tour per user
- `status` constrained

Eligibility rule (client-side):
- Given `CURRENT_TOUR_VERSION[tour_key]`:
  - If no row exists → eligible for auto-show
  - If row exists and `version < CURRENT_TOUR_VERSION` → eligible for auto-show (version bump)
  - If row exists and `version == CURRENT_TOUR_VERSION` → auto-show only if no completion/dismissal exists (should not happen if status always set when stored)

RLS:
- Read/write allowed only when `user_id = auth.uid()`

## State Transitions

### Onboarding wizard state machine

```
not_present
  └── (minimum setup incomplete AND eligible to auto-show) ──> in_progress (auto_shown_at set)

in_progress
  ├── complete ──> completed (completed_at set)
  ├── dismiss/skip ──> dismissed (dismissed_at set)
  └── refresh/reload ──> in_progress (resume current_step)

dismissed
  └── manual “Continue setup” ──> in_progress (does not reset auto_shown_at)

completed
  └── (no auto-show; wizard may be reopened intentionally if product chooses)
```

### Page tours state machine (per page)

```
not_present / version < current
  └── first eligible visit (wizard not active) ──> tour runs
        ├── finish ──> completed (version = current, completed_at set)
        └── skip/close ──> dismissed (version = current, dismissed_at set)

completed/dismissed (version = current)
  ├── revisit page ──> no auto-show
  └── manual “Show tour” ──> tour runs again (state remains completed/dismissed)
```

## Validation Rules

- **Minimum setup** is satisfied strictly via existence checks on `accounts`, `projects`, and `expenses` scoped to the current `group_id`.
- Onboarding and tour state writes must be **server-side persisted** and must not depend on localStorage for correctness.
- All user-facing strings introduced by wizard/tours must be **pt-BR** (FR-019).



