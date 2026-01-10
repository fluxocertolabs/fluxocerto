---
description: "Actionable, dependency-ordered task list for implementing Notifications (in-app + email) and Profile settings"
---

# Tasks: Notifications & Profile Settings

**Input**: Design documents from `/.specify/specs/028-notifications-profile/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: **Required for this feature**. Create **full automated coverage** for **unit (Vitest)**, **E2E (Playwright desktop + mobile)**, and **visual regression (Playwright screenshots for desktop + mobile)**, covering all **P1** acceptance scenarios and edge cases from `spec.md`. For **P2 welcome email** (US4), automated tests must validate **send decision (opt-out enforced at send time)**, **idempotency**, and the **dev-safe preview/logging path** (FR-013). The **“deliver within 2 minutes in live environments”** aspect is verified manually via `.specify/specs/028-notifications-profile/quickstart.md`. Local email capture uses Supabase local **Mailpit** (configured under `[inbucket]` in `supabase/config.toml`; E2E uses `InbucketClient` + `INBUCKET_URL` for backwards compatibility).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions
- **Note**: Task IDs `T003–T004` are intentionally unused (reserved by the generator). Do not reuse them; keep IDs stable for referencing in PR review/discussion.

## Path Conventions

- **Single SPA project**: `src/` at repository root
- **Supabase**: `supabase/` at repository root (migrations, functions)
- **Routes**: defined in `src/App.tsx` (React Router)
- **Header navigation**: `src/components/layout/header.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Implement the database migrations required by the plan and data model.

- [ ] T001 Create and implement preference split migration in `supabase/migrations/20260109120000_group_and_user_preferences_split.sql`:
  - rename existing `user_preferences` → `group_preferences` (preserve existing theme rows)
  - ensure `group_preferences` keeps group-scoped uniqueness (e.g., `UNIQUE(group_id, key)`) and appropriate indexes
  - re-create/adjust RLS policies for `group_preferences` (group member access only; follow existing patterns from prior migrations)
  - create new per-user `user_preferences` table with `(user_id, key, value, created_at, updated_at)` and `UNIQUE(user_id, key)`
  - add RLS policies on new `user_preferences` enforcing `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE
  - add `updated_at` trigger for both tables (if project standard) to keep timestamps consistent
- [ ] T002 Create and implement notifications migration in `supabase/migrations/20260109120100_notifications.sql`:
  - create `notifications` table per `data-model.md` (incl. `read_at`, `dedupe_key`, optional primary action fields, `email_sent_at`)
  - add performance indexes (e.g., `(user_id, created_at desc)`, and optional partial index for unread)
  - enable RLS and create policies restricting access to `user_id = auth.uid()` for SELECT
  - implement a least-privilege “mark read” path:
    - preferred: `SECURITY DEFINER` RPC `mark_notification_read(notification_id uuid)` that sets `read_at = now()` for the invoker’s row only (and does not allow other field mutation)
    - ensure `email_sent_at` remains **server-controlled** (client cannot set it)
  - enable Realtime for live updates by adding `notifications` to `supabase_realtime` publication (repo standard):
    - `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`
  - implement `SECURITY DEFINER` RPC `ensure_welcome_notification()` that inserts exactly once per user using `UNIQUE(user_id, dedupe_key)` (welcome uses `dedupe_key = 'welcome-v1'`)
  - ensure `ensure_welcome_notification()` returns `{ created, notification_id }`, where `notification_id` is always populated (newly inserted or existing)
  - ensure welcome notification content and UI-facing strings stored in DB are pt-BR (placeholders acceptable)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared code updates and helpers that should be in place before implementing the user stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

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
- [ ] T016 [US1] Add Notifications navigation entry + unread badge in `src/components/layout/header.tsx` (desktop + mobile menu) and ensure it links to `/notifications` (nav label must be pt-BR, e.g. **"Notificações"**)
- [ ] T017 [US1] Ensure notifications initialize on authenticated app entry (welcome ensure + initial fetch) by calling store `initialize()` from `src/components/layout/header.tsx` (mounted by `AuthenticatedLayout` in `src/App.tsx` for all protected routes)
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
- [ ] T020 [US2] Handle subscription lifecycle + reconnect strategy in `src/stores/notifications-store.ts` (unsubscribe on sign-out/unmount; on reconnect, refetch via `refresh()` to converge within the SC-003 window under normal connectivity)
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
- [ ] T026 [US3] Add Profile navigation entry in `src/components/layout/header.tsx` (desktop + mobile menu) and ensure it links to `/profile` (nav label must be pt-BR, e.g. **"Perfil"**)
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
  - call the Edge Function with `notification_id` returned by `ensureWelcomeNotification()` (regardless of `created`), so transient failures can be retried safely on subsequent app entries
  - tolerate failures (log + allow retry by re-invoking the function) without duplicating sends (server idempotency via `email_sent_at`)
- [ ] T032 [US4] Add server-side email template/CTA handling in `supabase/functions/send-welcome-email/index.ts` (pt-BR subject/body; HTML template satisfying FR-011 minimum contract (sufficient branding for v1): subject contains "Fluxo Certo", body includes the notification `title` + `body`, and a CTA link routes to `/notifications` using a configurable base URL env var)
- [ ] T033 [US4] Validate US4 scenarios via `.specify/specs/028-notifications-profile/quickstart.md` sections 7–9 (default enabled; opt-out enforced at send time; dev-safe strategy via Mailpit (Supabase local) and/or safe preview mode)

**Checkpoint**: User Story 4 complete — email sending is trusted-server only, preference-aware, and idempotent.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story quality, privacy, and operational readiness.

- [ ] T034 [P] Audit all new user-facing UI copy for pt-BR compliance (touchpoints: `src/pages/notifications.tsx`, `src/components/notifications/*`, `src/pages/profile.tsx`, `src/components/profile/*`, `supabase/functions/send-welcome-email/index.ts`)
- [ ] T035 Verify privacy/RLS invariants for new tables by reviewing and sanity-checking policies in `supabase/migrations/20260109120000_group_and_user_preferences_split.sql` and `supabase/migrations/20260109120100_notifications.sql` (no cross-user reads/writes; notifications strictly `auth.uid()` scoped)
- [ ] T036 Run the full manual validation flow in `.specify/specs/028-notifications-profile/quickstart.md` (sections 1–9) as a final regression pass (skip if already validated per-story via T018/T021/T029/T033)

---

## Phase 8: Automated Test Coverage (Unit + E2E + Visual) ✅ Required

**Purpose**: Ensure comprehensive automated coverage for all P1/P2 scenarios (including corner cases) across **desktop + mobile**, matching existing repo testing conventions (`vitest.config.ts`, `e2e/playwright.config.ts` projects: `chromium`, `chromium-mobile`, `visual`, `visual-mobile`).

### Shared Test Infrastructure (supporting new tables)

- [ ] T037 [P] Add E2E test DB utilities for new tables:
  - extend `e2e/fixtures/db.ts` with helpers to seed and query `notifications`, `user_preferences`, and `group_preferences` (as needed for tests)
  - add a small factory to `e2e/utils/test-data.ts` for `Notification` rows (pt-BR placeholders + optional primary action)
  - ensure the new helpers respect existing worker/group isolation patterns (use admin client + worker context where appropriate)

### Unit Tests (Vitest)

- [ ] T038 [P] Add unit tests for notifications data layer + state:
  - `src/lib/supabase.test.ts`: cover `ensureWelcomeNotification()`, `listNotifications()`, `markNotificationRead()`, and unread count query behavior (including error handling)
  - `src/stores/notifications-store.test.ts`: cover `initialize()` (welcome ensure + initial fetch), `markAsRead(id)` (unreadCount changes + idempotency), and realtime upsert/dedup logic (INSERT/UPDATE convergence; no duplicates)
  - `src/hooks/use-notifications.test.tsx`: cover hook surface (loading/error states) and that it wires through the store actions correctly

- [ ] T039 [P] Add unit tests for profile settings + email preference:
  - `src/hooks/use-profile.test.tsx`: cover reading `profiles.name`, updating display name, and `email_notifications_enabled` default semantics (missing row ⇒ enabled)
  - `src/components/profile/profile-settings-form.test.tsx`: cover pt-BR labels, disabled email field + hint, validation errors, and save UX
  - update `src/components/layout/header.test.tsx` for new nav entries (Notifications + Profile) and unread badge rendering behavior

### Desktop E2E (Playwright)

- [ ] T040 [US1] Add desktop E2E tests for Notifications inbox in `e2e/tests/notifications.spec.ts`:
  - navigation entry exists and routes to `/notifications`
  - welcome notification appears **exactly once** per user even across **20 reloads** and in a **second independent browser context** for the same user (simulates another device) (covers FR-006/FR-006a, SC-002)
  - unread badge reflects unread count; marking read updates badge and persists across reload **and is reflected in the second independent context after reload/refetch** (covers “across devices” in US1 + FR-005/FR-020)
  - optional primary action renders when present and navigates correctly
  - corner cases: repeated “mark read” is idempotent; offline/online (Playwright offline) converges on reload without duplicates

- [ ] T041 [US2] Add desktop E2E tests for live updates / convergence:
  - create two pages/contexts using the same authenticated storage state (simulates multiple tabs)
  - insert a notification via admin SQL while the second page is open; assert it appears without full refresh within 5s (SC-003)
  - update `read_at` from another page/context and assert unread badge/list converges
  - simulate disconnect/reconnect (e.g., offline toggle) and assert a refetch restores correctness (no missing, no duplicate)

- [ ] T042 [US3] Add desktop E2E tests for Profile settings in `e2e/tests/profile.spec.ts`:
  - `/profile` is reachable from nav; email is shown read-only (disabled) with an explanatory pt-BR hint
  - updating display name persists and reflects in at least one other UI surface (SC-005)
  - toggling email notifications persists across reload and defaults to enabled when no preference row exists (FR-010a)

- [ ] T043 [P] Add security/RLS E2E coverage for new tables:
  - extend `e2e/tests/rls-state-isolation.spec.ts` (or add `e2e/tests/rls-notifications-isolation.spec.ts`) to validate:
    - User B cannot read User A’s `notifications`
    - User B cannot update User A’s `notifications` (mark read) or `user_preferences`
    - per-user `user_preferences` are isolated (missing rows for others; cannot mutate others)

- [ ] T044 [US4] Add E2E coverage for welcome email delivery behavior (dev-safe):
  - validate “send decision” honors `email_notifications_enabled` **at send time** (toggle right before calling)
  - validate idempotency via `notifications.email_sent_at` (second call does not re-send)
  - validate dev strategy (FR-013): when provider credentials are missing, Edge Function returns a safe `{ preview: { subject, html } }` response and does not attempt external delivery (required for CI)
  - validate email content contract (FR-011): subject contains "Fluxo Certo", HTML includes the notification `title` + `body`, and includes a CTA link routing to `/notifications` (base URL configurable)
  - optionally, when local SMTP/Mailpit delivery is configured, assert the email appears in Mailpit (queried via `InbucketClient` using `INBUCKET_URL`)

### Mobile E2E (Playwright)

- [ ] T045 [US1] Add mobile E2E tests in `e2e/tests/mobile/notifications.mobile.spec.ts`:
  - access Notifications from mobile navigation (hamburger) and verify list + unread badge
  - mark read via tap; verify persistence across reload

- [ ] T046 [US3] Add mobile E2E tests in `e2e/tests/mobile/profile.mobile.spec.ts`:
  - access Profile from mobile navigation and verify email is disabled + hint
  - toggle email notifications and update display name; verify persistence

### Visual Regression (Playwright Screenshots)

- [ ] T047 [P] Add desktop visual snapshots for Notifications in `e2e/tests/visual/notifications.visual.spec.ts` using `visualTest`:
  - light + dark: empty state, unread state, read state, and primary-action state
  - ensure worker-specific masks are applied and UI is stabilized via `visual.waitForStableUI()`

- [ ] T048 [P] Add desktop visual snapshots for Profile in `e2e/tests/visual/profile.visual.spec.ts` using `visualTest`:
  - light + dark: default form, validation error state, and “email disabled” state

- [ ] T049 Add mobile visual snapshots by extending `e2e/tests/visual/mobile.visual.spec.ts`:
  - light + dark: Notifications and Profile screens (mobile layouts)
  - ensure snapshots are stable and avoid worker-specific text (mask where needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** user stories
- **User Stories (Phase 3–6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete
- **Automated Test Coverage (Phase 8)**: Depends on implementing the corresponding user stories and DB foundation; should be completed before considering the feature “done”

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

- Phase 2: T005–T010 can run in parallel after T001–T002 land (different files)
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
2. Complete Phase 2: Foundational (T005–T010)
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
| **Total Tasks** | 47 |
| **Setup Tasks** | 2 |
| **Foundational Tasks** | 6 |
| **User Story 1 Tasks** | 8 |
| **User Story 2 Tasks** | 3 |
| **User Story 3 Tasks** | 8 |
| **User Story 4 Tasks** | 4 |
| **Polish Tasks** | 3 |
| **Test Coverage Tasks** | 13 |
| **Parallel Opportunities** | 24+ tasks marked [P] |
| **Suggested MVP Scope** | User Story 1 (P1) |


