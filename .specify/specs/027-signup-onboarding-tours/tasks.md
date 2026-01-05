# Tasks: Self-Serve Signup, Onboarding & Tours

**Input**: Design documents from `/specs/027-signup-onboarding-tours/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Repo already has unit + Playwright E2E. Add/update targeted tests for self-serve signup, provisioning recovery, onboarding, and tours (see T040–T042), alongside manual validation in `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- **Supabase**: `supabase/` at repository root (migrations, functions)
- **Auth callback route**: `/auth/confirm` is implemented by `src/pages/auth-callback.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the feature’s schema/migration scaffolding.

- [ ] T001 Create migration file `supabase/migrations/20260105123000_self_serve_signup_provisioning.sql` with header comment and placeholders for `ensure_current_user_group()` + trigger
- [ ] T002 Create migration file `supabase/migrations/20260105123100_onboarding_and_tour_state.sql` with header comment and placeholders for `onboarding_states` + `tour_states` + RLS

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types/helpers used across multiple user stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [ ] T003 [P] Add onboarding/tour domain schemas + types in `src/types/index.ts` (OnboardingStep/Status, TourKey/Status, row shapes)
- [ ] T004 [P] Add shared Supabase helpers in `src/lib/supabase.ts` (RPC wrapper for `ensure_current_user_group`, CRUD helpers for `onboarding_states` + `tour_states`, and update outdated invite-only comments in `signInWithMagicLink`)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Unified Magic Link sign-in/sign-up (Priority: P1) 🎯 MVP

**Goal**: One email → one Magic Link flow that works for both existing and brand-new users without email enumeration.

**Independent Test**: From a logged-out state, request a Magic Link with (a) a known existing email and (b) a brand-new email; in both cases, complete the link flow and reach the app without the login UI ever confirming account existence.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Update self-serve login copy (remove invite-only messaging) in `src/pages/login.tsx`
- [ ] T006 [P] [US1] Remove invite-only wording/comments while preserving generic success state in `src/components/auth/login-form.tsx`
- [ ] T007 [P] [US1] Remove invite-only gating in `supabase/functions/before-user-created/index.ts` so self-serve signups are always allowed (no allowlist checks; no service-role dependency)
- [ ] T008 [US1] Ensure expired/invalid Magic Link recovery UX in `src/pages/auth-callback.tsx` (pt-BR error state with “Solicitar novo link” → `src/pages/login.tsx`; no email enumeration) and validate US1 scenarios via `.specify/specs/027-signup-onboarding-tours/quickstart.md` (existing vs new email + invalid/expired link)
- [ ] T040 [US1] Update Playwright coverage for self-serve signup and no-enumeration in `e2e/tests/auth.spec.ts` (ensure a never-before-seen email can complete Magic Link flow end-to-end)

**Checkpoint**: User Story 1 is functional and privacy-preserving (no email enumeration).

---

## Phase 4: User Story 2 - No “orphaned” first login (Priority: P1)

**Goal**: After first authentication, a brand-new user always has a usable group/profile context; failures are recoverable (“Tentar novamente” + “Sair” + “Ajuda”).

**Independent Test**: Use a never-before-seen email to complete the Magic Link flow, then refresh and navigate across core pages; the app should never error due to missing group/profile membership.

### Implementation for User Story 2

- [ ] T009 [US2] Implement SQL RPC `ensure_current_user_group()` (SECURITY DEFINER, idempotent, deterministic group id = `auth.uid()`) in `supabase/migrations/20260105123000_self_serve_signup_provisioning.sql`
- [ ] T010 [US2] Add trigger `on_auth_user_created` on `auth.users` insert to best-effort call provisioning logic in `supabase/migrations/20260105123000_self_serve_signup_provisioning.sql`
- [ ] T011 [P] [US2] Call `ensure_current_user_group` during callback before redirecting into the app in `src/pages/auth-callback.tsx` (render recoverable error UI with “Tentar novamente” / “Sair” / “Ajuda”; “Ajuda” opens a dialog (pt-BR) with troubleshooting steps + “Copiar detalhes” copying diagnostic payload per `spec.md`)
- [ ] T012 [P] [US2] Add self-heal + explicit retry action when group queries return “no rows” (PGRST116) in `src/hooks/use-group.ts` (uses `ensure_current_user_group` RPC)
- [ ] T013 [US2] Update Manage “Membros do Grupo” error UI to include recovery actions in `src/pages/manage.tsx` (“Tentar novamente” / “Sair” / “Ajuda” dialog with “Copiar detalhes”; reuse the same help dialog behavior as `src/pages/auth-callback.tsx`)
- [ ] T014 [US2] Validate US2 scenarios via `.specify/specs/027-signup-onboarding-tours/quickstart.md` (fresh email signup, immediate refresh, navigate Dashboard/Manage/History; verify recovery UI labels are pt-BR and “Copiar detalhes” copies diagnostic payload)

**Checkpoint**: Brand-new self-serve users never land in a dead-end “missing group/profile” state; recovery is always available.

---

## Phase 5: User Story 3 - First-run onboarding wizard to reach first projection (Priority: P2)

**Goal**: For an unconfigured group, provide a skippable wizard that helps the user reach “minimum setup complete” with server-side persisted progress and re-entry points.

**Independent Test**: Log in as a new user with an unconfigured group, complete onboarding steps, then confirm the dashboard can show a projection. Refresh mid-wizard and confirm progress is retained.

### Implementation for User Story 3

- [ ] T015 [US3] Create `onboarding_states` table + constraints + RLS policies in `supabase/migrations/20260105123100_onboarding_and_tour_state.sql`
- [ ] T016 [US3] Add/update RLS policies to allow onboarding edits of `groups.name` and the current user’s `profiles.name` in `supabase/migrations/20260105123100_onboarding_and_tour_state.sql`
- [ ] T017 [P] [US3] Implement onboarding step constants + state helpers in `src/lib/onboarding/steps.ts` (step IDs, status transitions, “auto-show once” rules)
- [ ] T018 [P] [US3] Implement onboarding state hook in `src/hooks/use-onboarding-state.ts` (minimum setup checks on `accounts` + `projects` + `expenses`, server persistence, resume logic, wizard-active signal for tours)
- [ ] T019 [P] [US3] Implement “Continuar configuração” entry component in `src/components/onboarding/continue-setup-cta.tsx` (opens wizard, does not rely on auto-show)
- [ ] T020 [US3] Implement multi-step wizard UI in `src/components/onboarding/onboarding-wizard.tsx` (pt-BR copy; steps per `contracts/onboarding.md`; reuse existing Manage creation flows for `accounts`/`projects`/`expenses`/`credit_cards` where possible; persist `current_step` after each successful step)
- [ ] T021 [US3] Mount wizard globally for authenticated routes in `src/App.tsx` (inside `AuthenticatedLayout`) and ensure it never blocks navigation
- [ ] T022 [US3] Add header entry point “Continuar configuração” (desktop + mobile) in `src/components/layout/header.tsx` (uses onboarding hook)
- [ ] T023 [P] [US3] Add Dashboard empty-state CTA(s) to open onboarding when minimum setup is incomplete in `src/pages/dashboard.tsx`
- [ ] T024 [US3] Add Manage empty-state CTA(s) to open onboarding when minimum setup is incomplete in `src/pages/manage.tsx`
- [ ] T025 [US3] Validate US3 scenarios from `.specify/specs/027-signup-onboarding-tours/quickstart.md` (auto-show once, skip doesn’t re-auto-show, resume after refresh, entry points work)
- [ ] T041 [US3] Add Playwright E2E for onboarding wizard behaviors (auto-show once, skip doesn’t re-auto-show, resume after refresh, entry points work) in `e2e/tests/onboarding-wizard.spec.ts`

**Checkpoint**: Onboarding is skippable, persisted server-side, resumes correctly, and never blocks core navigation.

---

## Phase 6: User Story 4 - First-time page tours (coachmarks) (Priority: P2)

**Goal**: Auto-start a short tour on first visit to Dashboard/Manage/History, persist completion/dismissal per user, allow manual replay, and defer while onboarding wizard is active.

**Independent Test**: Visit a target page for the first time and complete/skip the tour; revisit the same page to confirm it does not auto-show; trigger the tour again via an explicit “Mostrar tour” action.

### Implementation for User Story 4

- [ ] T026 [US4] Create `tour_states` table + constraints + RLS policies (including `version`) in `supabase/migrations/20260105123100_onboarding_and_tour_state.sql`
- [ ] T027 [P] [US4] Implement tour definitions + versions + selectors (pt-BR copy) in `src/lib/tours/definitions.ts`
- [ ] T028 [P] [US4] Implement tour orchestration hook in `src/hooks/use-page-tour.ts` (eligibility incl. version bump, persistence, replay, defer while onboarding is active)
- [ ] T029 [P] [US4] Implement coachmark runner UI in `src/components/tours/tour-runner.tsx` (Next/Back/Skip/Close; missing targets skip per FR-018)
- [ ] T030 [P] [US4] Implement “Mostrar tour” trigger component in `src/components/tours/tour-trigger.tsx`
- [ ] T031 [P] [US4] Integrate Dashboard tour auto-start in `src/pages/dashboard.tsx` (respect onboarding deferral)
- [ ] T032 [P] [US4] Integrate Manage tour auto-start in `src/pages/manage.tsx` (respect onboarding deferral)
- [ ] T033 [P] [US4] Integrate History tour auto-start in `src/pages/history.tsx` (respect onboarding deferral)
- [ ] T034 [US4] Add header/menu entry point “Mostrar tour” (contextual to current route) in `src/components/layout/header.tsx`
- [ ] T035 [US4] Validate US4 scenarios via `.specify/specs/027-signup-onboarding-tours/quickstart.md` (auto-show once per page per version, replay, defer while onboarding, missing targets)
- [ ] T042 [US4] Add Playwright E2E for page tours (auto-show once per page per version, replay, defer while onboarding active, missing targets) in `e2e/tests/page-tours.spec.ts`

**Checkpoint**: Tours run once per page per user, persist server-side, replay on demand, and never overlap onboarding wizard.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story quality, consistency, and operational readiness.

- [ ] T036 [P] Audit all new user-facing copy for pt-BR compliance (touchpoints: `src/pages/login.tsx`, `src/pages/auth-callback.tsx`, `src/components/onboarding/*`, `src/components/tours/*`)
- [ ] T037 Ensure onboarding/tours do not block dev auth bypass rendering (refs: `src/lib/supabase.ts`, `src/App.tsx`, `.specify/specs/027-signup-onboarding-tours/quickstart.md`)
- [ ] T038 Run cross-story regression from `.specify/specs/027-signup-onboarding-tours/quickstart.md` focused on cross-cutting checks (dev auth bypass, overlay coordination, cross-device persistence per NFR-003, refresh + cross-page navigation). Avoid duplicating per-story validations already completed in T008/T014/T025/T035 unless investigating a regression.
- [ ] T039 Manual Supabase operations: apply migrations and deploy/update the Supabase Auth Hook `before-user-created` so it no longer blocks self-serve signups (remove allowlist checks + service-role dependency). Verify redirects include `<local dev origin>/auth/confirm` (default local dev origin is `http://localhost:5174`; refs: `supabase/config.toml`, `supabase/functions/before-user-created/index.ts`, `.specify/specs/027-signup-onboarding-tours/quickstart.md`)
- [ ] T043 Validate perf sanity: onboarding + tours add ≤2 additional Supabase requests on initial authenticated load (≤1 for onboarding state + ≤1 for tour state; confirm via browser Network filtering `rest/v1` + `rpc`) and overlays remain responsive (basic interaction)
- [ ] T044 Define a lightweight measurement protocol for success criteria SC-001 and SC-002 in `.specify/specs/027-signup-onboarding-tours/quickstart.md` (timed sessions + pass/fail rubric; no new product analytics required)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3–6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies (recommended)

- **US1 (P1)** → enables self-serve Magic Link sign-in/sign-up (no enumeration)
- **US2 (P1)** depends on US1 (auth flow) → ensures no orphaned first login
- **US3 (P2)** depends on US2 (reliable group context) → onboarding wizard persisted per user+group
- **US4 (P2)** depends on US3 (wizard-active deferral) → page tours persisted per user+page

### Parallel Opportunities

- Foundational tasks: T003 and T004 can run in parallel
- US1 implementation: T005, T006, T007 can run in parallel
- US2 client work after DB is in place: T011 and T012 can run in parallel
- US3 scaffolding: T017, T018, T019 can run in parallel
- US4 core pieces: T027, T028, T029, T030 can run in parallel
- US4 page integrations: T031, T032, T033 can run in parallel (different pages/files)

---

## Parallel Examples (per User Story)

## Parallel Example: User Story 1

```bash
Task: "Update self-serve login copy in src/pages/login.tsx"                       # T005
Task: "Update login form copy/comments in src/components/auth/login-form.tsx"     # T006
Task: "Remove invite-only gating in supabase/functions/before-user-created/index.ts" # T007
```

## Parallel Example: User Story 2

```bash
Task: "Provisioning call + recovery UI in src/pages/auth-callback.tsx"            # T011
Task: "Self-heal + retry action in src/hooks/use-group.ts"                        # T012
```

## Parallel Example: User Story 3

```bash
Task: "Onboarding step helpers in src/lib/onboarding/steps.ts"                    # T017
Task: "Onboarding state hook in src/hooks/use-onboarding-state.ts"                # T018
Task: "Continuar configuração CTA in src/components/onboarding/continue-setup-cta.tsx"    # T019
```

## Parallel Example: User Story 4

```bash
Task: "Tour definitions in src/lib/tours/definitions.ts"                          # T027
Task: "Tour orchestration hook in src/hooks/use-page-tour.ts"                     # T028
Task: "Tour runner UI in src/components/tours/tour-runner.tsx"                    # T029
Task: "Tour trigger component in src/components/tours/tour-trigger.tsx"           # T030
```

---

## Implementation Strategy

### MVP First (P1 Stories Only: US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Unified Magic Link sign-in/sign-up)
4. Complete Phase 4: US2 (No orphaned first login)
5. **STOP and VALIDATE** using `.specify/specs/027-signup-onboarding-tours/quickstart.md`

### Incremental Delivery

1. Add US1 → validate login privacy and flows
2. Add US2 → validate provisioning and recovery
3. Add US3 → validate onboarding persistence and “auto-show once”
4. Add US4 → validate tours + deferral + replay
5. Polish → finalize copy + ops steps + regression

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 44 |
| **Setup Tasks** | 2 |
| **Foundational Tasks** | 2 |
| **User Story 1 Tasks** | 5 |
| **User Story 2 Tasks** | 6 |
| **User Story 3 Tasks** | 12 |
| **User Story 4 Tasks** | 11 |
| **Polish Tasks** | 6 |
| **Parallel Opportunities** | 19 tasks marked [P] |
| **Suggested MVP Scope** | User Stories 1–2 (both P1) |


