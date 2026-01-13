# Quickstart: Notifications & Profile Settings

**Spec**: [spec.md](./spec.md)  
**Branch**: `028-notifications-profile`

This guide describes how to verify the feature end-to-end **after implementation**.

## Prerequisites

- Node (>= 20) + pnpm
- Supabase CLI (used via `npx supabase`)

## Local setup (recommended)

From repo root:

```bash
pnpm install
pnpm db:start
pnpm run gen:token
pnpm dev:app
```

Notes:
- `pnpm run gen:token` writes `VITE_DEV_ACCESS_TOKEN` + `VITE_DEV_REFRESH_TOKEN` into `.env` for the **dev auth bypass** (DEV-only).
- Supabase local includes **Mailpit** (email capture UI) at `http://localhost:54324`.

## Scenario verification (P1)

### 1) In-app inbox exists + welcome notification created once

- **Navigate**: open the notifications inbox from the primary nav (desktop + mobile).
- **Expected**:
  - A welcome notification exists (if eligible) and is **unread**.
  - Refresh the page multiple times → the welcome notification **does not duplicate** (DB idempotency via `dedupe_key = "welcome-v1"`).

### 2) Mark as read persists across refresh

- **Action**: mark the welcome notification as read.
- **Expected**:
  - Unread indicator updates within ~2s.
  - Refresh the page → notification remains read.

### 3) Live updates across sessions (best-effort realtime)

- Open two sessions for the same user (two browsers or incognito + normal).
- In session A, trigger creation of a new notification (e.g. by calling the “ensure welcome” RPC for a fresh user).
- **Expected**: session B updates inbox + unread indicator without a full reload.

## Scenario verification (P1) — Profile settings

### 4) Display name update

- **Navigate**: Profile settings from primary nav.
- **Action**: update display name and save.
- **Expected**: name persists and appears elsewhere in the app (e.g. group members list / header badge surfaces that show profile names).

### 5) Email address read-only

- **Expected**: authenticated email is shown but disabled (non-editable) with explanatory hint (pt-BR).

### 6) Email notifications toggle (opt-out)

- Toggle “emails de notificações” off and save.
- **Expected**: preference persists across refresh.

## Scenario verification (P2) — Welcome email delivery

### 7) Default enabled behavior

- For a user without an explicit preference row, treat email notifications as **enabled**.

### 8) Opt-out enforced at send time

- Disable email notifications.
- Trigger welcome notification creation.
- Attempt to send welcome email.
- **Expected**: send is skipped (server decision honors current preference).

### 9) Dev/test email behavior (FR-013)

In local/dev environments:
- Use **Mailpit** (`http://localhost:54324`) to inspect captured emails when using local SMTP-based flows.
- If the welcome email sender is implemented via provider API and credentials are not set, the Edge Function should return a **safe preview** (subject + HTML) and must not attempt external delivery.

## Contracts

See `contracts/openapi.yaml` for the planned endpoints and payload shapes.


