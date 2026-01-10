---
description: "Actionable, dependency-ordered task list for implementing Notifications (in-app + email) and Profile settings"
---

# Tasks: Notifications & Profile Settings

**Input**: Design documents from `/.specify/specs/028-notifications-profile/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature artifacts — focus on manual validation via `.specify/specs/028-notifications-profile/quickstart.md` (automated tests can be added later if desired).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single SPA project**: `src/` at repository root
- **Supabase**: `supabase/` at repository root (migrations, functions)
- **Routes**: defined in `src/App.tsx` (React Router)
- **Header navigation**: `src/components/layout/header.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the migration scaffolding required by the plan and data model.

- [ ] T001 Create migration file `supabase/migrations/20260109120000_group_and_user_preferences_split.sql` with header comment and placeholders for renaming `user_preferences` → `group_preferences` and creating the new per-user `user_preferences`
- [ ] T002 Create migration file `supabase/migrations/20260109120100_notifications.sql` with header comment and placeholders for `notifications` table + RLS + `ensure_welcome_notification()` RPC

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema + shared helpers that MUST be in place before implementing the user stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [ ] T003 Implement preference split migration in `supabase/migrations/20260109120000_group_and_user_preferences_split.sql`:
  - rename existing `user_preferences` → `group_preferences` (preserve existing theme rows)
  - ensure `group_preferences` keeps group-scoped uniqueness (e.g., `UNIQUE(group_id, key)`) and appropriate indexes
  - re-create/adjust RLS policies for `group_preferences` (group member access only; follow existing patterns from prior migrations)
  - create new per-user `user_preferences` table with `(user_id, key, value, created_at, updated_at)` and `UNIQUE(user_id, key)`
  - add RLS policies on new `user_preferences` enforcing `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE
  - add `updated_at` trigger for both tables (if project standard) to keep timestamps consistent
- [ ] T004 Implement notifications migration in `supabase/migrations/20260109120100_notifications.sql`:
  - create `notifications` table per `data-model.md` (incl. `read_at`, `dedupe_key`, optional primary action fields, `email_sent_at`)
  - add performance indexes (e.g., `(user_id, created_at desc)`, and optional partial index for unread)
  - enable RLS and create policies restricting access to `user_id = auth.uid()` (SELECT + UPDATE for mark-read)
  - implement `SECURITY DEFINER` RPC `ensure_welcome_notification()` that inserts exactly once per user using `UNIQUE(user_id, dedupe_key)` (welcome uses `dedupe_key = 'welcome-v1'`) and returns `{ created, notification_id }`
  - ensure welcome notification content and UI-facing strings stored in DB are pt-BR (placeholders acceptable)
- [ ] T005 [P] Update group theme persistence to use `group_preferences` in `src/lib/theme-service.ts` (replace `.from('user_preferences')` with `.from('group_preferences')` and keep behavior unchanged)
- [ ] T006 [P] Update E2E schema table list and FK setup for renamed/added tables in `e2e/utils/schema-manager.ts` (add `group_preferences`, new per-user `user_preferences`, and `notifications`)
- [ ] T007 [P] Update E2E DB cleanup utilities for renamed/added tables in `e2e/fixtures/db.ts` (ensure cleanup targets `group_preferences` and the new `user_preferences` separately)
- [ ] T008 [P] Update theme E2E network assertions to match table rename in `e2e/tests/theme.spec.ts` (assert against `group_preferences` instead of `user_preferences`)
- [ ] T009 [P] Add shared types for notifications + user preferences in `src/types/index.ts` (e.g., `NotificationRow`, `NotificationType = 'welcome'`, and the `email_notifications_enabled` preference key)
- [ ] T010 [P] Add shared Supabase helpers in `src/lib/supabase.ts`:
  - notifications: `listNotifications()`, `markNotificationRead()`, and `ensureWelcomeNotification()`
  - email preference: `getEmailNotificationsEnabled()` (default true when missing) and `setEmailNotificationsEnabled(enabled)`
  - (optional) small helpers for `unreadCount` query shape and consistent error handling

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Notifications inbox with unread state (Priority: P1) 🎯 MVP

**Goal**: Provide a persistent inbox (newest-first) with unread/read state, an unread indicator, and a DB-idempotent welcome notification created at most once per user.

**Independent Test**: Sign in, open Notifications, confirm a welcome notification exists as unread, mark it as read, refresh, and confirm read state persists without duplicates.

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create notifications store in `src/stores/notifications-store.ts` (state: `items`, `unreadCount`, `isLoading`, `error`; actions: `initialize()`, `refresh()`, `markAsRead(id)`; uses helpers from `src/lib/supabase.ts`)
- [ ] T012 [P] [US1] Create notifications hook wrapper in `src/hooks/use-notifications.ts` that exposes the store state/actions for UI usage
- [ ] T013 [P] [US1] Implement inbox UI components in `src/components/notifications/notifications-inbox.tsx` and `src/components/notifications/notification-item.tsx`:
  - newest-first list rendering
  - clear unread/read styling based on `read_at`
  - "Marcar como lida" action (pt-BR) that updates DB + local state
  - optional primary action button when `primary_action_label`/`primary_action_href` exist
- [ ] T014 [US1] Add notifications page in `src/pages/notifications.tsx` (loading/empty/error states; render inbox components)
- [ ] T015 [P] [US1] Wire `/notifications` protected route in `src/App.tsx` (import and add `<Route path="notifications" element={<NotificationsPage />} />`)
- [ ] T016 [US1] Add Notifications navigation entry + unread badge in `src/components/layout/header.tsx` (desktop + mobile menu) and ensure it links to `/notifications`
- [ ] T017 [US1] Ensure notifications initialize on authenticated app entry (welcome ensure + initial fetch) by calling store `initialize()` from `src/components/layout/header.tsx` (header mounts on every authenticated route)
- [ ] T018 [US1] Validate US1 scenarios via `.specify/specs/028-notifications-profile/quickstart.md` sections 1–2 (welcome created once; mark read persists across refresh)

**Checkpoint**: User Story 1 complete — inbox is persistent, welcome is idempotent, unread/read state persists.

---

## Phase 4: User Story 2 - Live updates while using the app (Priority: P1)

**Goal**: While actively using the app, inbox + unread indicator update automatically when notifications are inserted/updated from another tab/device.

**Independent Test**: With two sessions for the same user, insert/update a notification row and observe the other session update without full page reload (best-effort realtime + refetch fallback).

### Implementation for User Story 2

- [ ] T019 [US2] Add Supabase Realtime subscription for notifications in `src/stores/notifications-store.ts`:
  - subscribe to `public.notifications` `postgres_changes` filtered by `user_id=eq.<auth.uid>`
  - handle INSERT/UPDATE/DELETE via upsert-by-id (avoid duplicates)
  - ensure updates adjust `unreadCount` correctly and converge to DB truth
- [ ] T020 [US2] Handle subscription lifecycle + reconnect strategy in `src/stores/notifications-store.ts` (unsubscribe on sign-out/unmount; on reconnect, refetch via `refresh()` to converge)
- [ ] T021 [US2] Validate US2 scenario via `.specify/specs/028-notifications-profile/quickstart.md` section 3 (two sessions) and document the exact manual trigger used (e.g., SQL insert into `notifications`) in the same quickstart section if missing

**Checkpoint**: User Story 2 complete — inbox + badge stay in sync across sessions (best-effort realtime, persistence as source of truth).

---

## Phase 5: User Story 3 - Profile settings for display name and email preference (Priority: P1)

**Goal**: Users can update display name, view email read-only, and opt out of notification emails (per-user preference).

**Independent Test**: Navigate to Profile, update display name and save, confirm it appears elsewhere; confirm email is visible but disabled with hint; toggle email notifications off and confirm it persists.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Implement profile data hook in `src/hooks/use-profile.ts`:
  - read display name from `profiles.name` (email-based RLS)
  - read auth email from session (read-only)
  - read/write `email_notifications_enabled` in the new per-user `user_preferences` (default enabled when missing)
- [ ] T023 [P] [US3] Create profile settings form component in `src/components/profile/profile-settings-form.tsx` (pt-BR copy; disabled email input + explanatory hint; toggle for emails; save button and optimistic UX)
- [ ] T024 [US3] Add profile page in `src/pages/profile.tsx` (load hook; render form; handle loading/error states)
- [ ] T025 [P] [US3] Wire `/profile` protected route in `src/App.tsx` (import and add `<Route path="profile" element={<ProfilePage />} />`)
- [ ] T026 [US3] Add Profile navigation entry in `src/components/layout/header.tsx` (desktop + mobile menu) and ensure it links to `/profile`
- [ ] T027 [P] [US3] Add group-data invalidation event helper in `src/lib/group-data-events.ts` and listen for it in `src/hooks/use-group.ts` to trigger a refetch (so updated display name propagates without reload)
- [ ] T028 [US3] Dispatch `notifyGroupDataInvalidated()` after successful display name update in `src/hooks/use-profile.ts` (ensures other UI surfaces refresh)
- [ ] T029 [US3] Validate US3 scenarios via `.specify/specs/028-notifications-profile/quickstart.md` sections 4–6 (name update reflection; email read-only; email toggle persists)

**Checkpoint**: User Story 3 complete — profile edits persist, email is read-only, and email preference is stored per-user.

---

## Phase 6: User Story 4 - Welcome email delivery (Priority: P2)

**Goal**: When a welcome notification is created and email notifications are enabled at send time, a welcome email is sent shortly after; opt-out is enforced at send time.

**Independent Test**: With email enabled, trigger welcome creation and confirm email is sent/previewed; disable email and confirm sending is skipped.

### Implementation for User Story 4

- [ ] T030 [P] [US4] Create Supabase Edge Function `supabase/functions/send-welcome-email/index.ts` that:
  - accepts `{ notification_id }`
  - fetches the notification and verifies it belongs to the authenticated user
  - checks `user_preferences.email_notifications_enabled` at send time (default enabled when missing)
  - enforces idempotency using `notifications.email_sent_at` (skip if already set)
  - sends via provider credentials (server-only) or returns a safe `{ preview: { subject, html } }` when credentials are missing (dev/test), per FR-013
  - updates `notifications.email_sent_at` only after a successful send
- [ ] T031 [US4] Add client-side call flow in `src/stores/notifications-store.ts`:
  - after `ensureWelcomeNotification()` returns `created=true`, call the Edge Function with `notification_id`
  - tolerate failures (log + allow retry by re-invoking the function) without duplicating sends (server idempotency)
- [ ] T032 [US4] Add server-side email template/CTA handling in `supabase/functions/send-welcome-email/index.ts` (pt-BR subject/body; brand-consistent HTML; CTA link back to the app using a configurable app URL env var)
- [ ] T033 [US4] Validate US4 scenarios via `.specify/specs/028-notifications-profile/quickstart.md` sections 7–9 (default enabled; opt-out enforced at send time; dev safe preview or Inbucket strategy)

**Checkpoint**: User Story 4 complete — email sending is trusted-server only, preference-aware, and idempotent.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story quality, privacy, and operational readiness.

- [ ] T034 [P] Audit all new user-facing UI copy for pt-BR compliance (touchpoints: `src/pages/notifications.tsx`, `src/components/notifications/*`, `src/pages/profile.tsx`, `src/components/profile/*`, `supabase/functions/send-welcome-email/index.ts`)
- [ ] T035 Verify privacy/RLS invariants for new tables by reviewing and sanity-checking policies in `supabase/migrations/20260109120000_group_and_user_preferences_split.sql` and `supabase/migrations/20260109120100_notifications.sql` (no cross-user reads/writes; notifications strictly `auth.uid()` scoped)
- [ ] T036 Run the full manual validation flow in `.specify/specs/028-notifications-profile/quickstart.md` (local setup + P1 scenarios + P2 scenarios)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** user stories
- **User Stories (Phase 3–6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies (recommended)

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS ALL)
    ↓
Phase 3: US1 - Inbox + unread/read + idempotent welcome (MVP)
    ↓
Phase 4: US2 - Realtime live updates (builds on US1 store/hook)

Phase 5: US3 - Profile settings (can start after Phase 2; independent of US1/US2)
    ↓
Phase 6: US4 - Welcome email delivery (depends on notifications + per-user preferences)
```

### Parallel Opportunities

- Phase 2: T005–T010 can run in parallel after T003–T004 land (different files)
- US1: T011–T013 can run in parallel; T014–T016 can run in parallel once core store/hook exists
- US2: subscription work (T019–T020) can run in parallel once US1 store exists
- US3: T022–T023 can run in parallel; route wiring (T025) can run in parallel once page exists
- US4: function implementation (T030) can run in parallel with template/CTA work (T032)

---

## Parallel Examples (per User Story)

## Parallel Example: User Story 1

```bash
Task: "Create notifications store in src/stores/notifications-store.ts"              # T011
Task: "Create notifications hook wrapper in src/hooks/use-notifications.ts"          # T012
Task: "Implement inbox UI components in src/components/notifications/*"              # T013
```

## Parallel Example: User Story 2

```bash
Task: "Add realtime subscription logic in src/stores/notifications-store.ts"         # T019
Task: "Handle lifecycle/reconnect in src/stores/notifications-store.ts"              # T020
```

## Parallel Example: User Story 3

```bash
Task: "Implement profile data hook in src/hooks/use-profile.ts"                      # T022
Task: "Create profile settings form in src/components/profile/profile-settings-form.tsx" # T023
```

## Parallel Example: User Story 4

```bash
Task: "Create Edge Function in supabase/functions/send-welcome-email/index.ts"       # T030
Task: "Add template/CTA handling in supabase/functions/send-welcome-email/index.ts"  # T032
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T010)
3. Complete Phase 3: US1 (T011–T018)
4. **STOP and VALIDATE** using `.specify/specs/028-notifications-profile/quickstart.md` (P1 sections 1–2)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate inbox + persistence + idempotent welcome → MVP demo
3. US2 → validate realtime convergence → demo
4. US3 → validate profile + preference persistence → demo
5. US4 → validate trusted email sending + opt-out enforcement → demo
6. Polish → pt-BR audit + RLS review + full quickstart run

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 36 |
| **Setup Tasks** | 2 |
| **Foundational Tasks** | 8 |
| **User Story 1 Tasks** | 8 |
| **User Story 2 Tasks** | 3 |
| **User Story 3 Tasks** | 8 |
| **User Story 4 Tasks** | 4 |
| **Polish Tasks** | 3 |
| **Parallel Opportunities** | 16 tasks marked [P] |
| **Suggested MVP Scope** | User Story 1 (P1) |


