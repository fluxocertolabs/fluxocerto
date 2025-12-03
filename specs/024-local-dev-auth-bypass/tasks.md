# Tasks: Local Development Auth Bypass

**Input**: Design documents from `/specs/024-local-dev-auth-bypass/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓, contracts/ (N/A)

**Tests**: Unit tests (Vitest), E2E tests (Playwright), Visual regression tests included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Web application (SPA with Supabase backend)
- **Structure**: Single project with `src/` at repository root
- **Scripts**: `scripts/` directory at repository root
- **Unit tests**: Co-located with source files (e.g., `src/lib/supabase.test.ts`)
- **E2E tests**: `e2e/tests/` directory
- **Visual tests**: `e2e/tests/visual/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and script directory structure

- [ ] T001 Create `scripts/` directory at repository root
- [ ] T002 Add `tsx` as dev dependency to package.json for TypeScript script execution
- [ ] T003 Add `gen:token` script to package.json scripts section: `"gen:token": "tsx scripts/generate-dev-token.ts"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Phase

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [P] Add unit tests for `injectDevSession()` function in src/lib/supabase.test.ts - test success path, failure path, and DEV mode guard
- [ ] T005 [P] Add unit tests for dev token detection logic in src/lib/supabase.test.ts - test `hasDevTokens()` helper

### Implementation for Foundational Phase

- [ ] T006 Add dev session injection helper function `injectDevSession()` in src/lib/supabase.ts that accepts tokens and calls `setSession()`
- [ ] T007 Add `hasDevTokens()` helper function in src/lib/supabase.ts to check for VITE_DEV_ACCESS_TOKEN presence
- [ ] T008 [P] Add VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN type declarations to src/vite-env.d.ts
- [ ] T009 Modify `bootstrap()` in src/main.tsx to call dev session injection BEFORE `initializeAuth()` when in DEV mode with tokens present
- [ ] T010 Add error toast display for dev session injection failure in src/main.tsx (fallback to normal login)

**Checkpoint**: Foundation ready - unit tests pass, user story implementation can now begin

---

## Phase 3: User Story 1 - Automated Testing Session Initialization (Priority: P1) 🎯 MVP

**Goal**: Enable AI agents and developers to immediately access authenticated application without manual login by generating and auto-injecting session tokens.

**Independent Test**: Run `pnpm run gen:token`, copy tokens to `.env.local`, start app with `pnpm dev:app`, verify dashboard appears immediately without login screen.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US1] Add E2E test for dev auth bypass flow in e2e/tests/dev-auth-bypass.spec.ts - verify dashboard loads without login when tokens present
- [ ] T012 [P] [US1] Add E2E test for fallback behavior in e2e/tests/dev-auth-bypass.spec.ts - verify login screen shows when tokens invalid/missing
- [ ] T013 [P] [US1] Add E2E test for production mode guard in e2e/tests/dev-auth-bypass.spec.ts - verify bypass disabled in prod build

### Implementation for User Story 1

- [ ] T014 [US1] Create token generation script skeleton in scripts/generate-dev-token.ts with main entry point and verbose console output structure
- [ ] T015 [US1] Implement Supabase admin client initialization in scripts/generate-dev-token.ts using service role key from environment or `supabase status`
- [ ] T016 [US1] Implement `findOrCreateDevUser()` function in scripts/generate-dev-token.ts that creates `dev@local` user with confirmed email via admin API
- [ ] T017 [US1] Implement `generateTokens()` function in scripts/generate-dev-token.ts that signs in dev user and outputs VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN
- [ ] T018 [US1] Add connection validation to scripts/generate-dev-token.ts - fail with clear error if Supabase not running at http://127.0.0.1:54321
- [ ] T019 [US1] Format script output for copy-paste to .env.local with instructions

**Checkpoint**: At this point, User Story 1 should be fully functional - E2E tests pass, tokens generated and app auto-logs in

---

## Phase 4: User Story 2 - Dev User Management (Priority: P2)

**Goal**: Ensure `dev@local` user exists with proper configuration for authentication, including allowed_emails entry.

**Independent Test**: Run script on fresh Supabase instance, verify user created. Run again, verify no duplicate created (idempotent).

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T020 [P] [US2] Add E2E test for idempotent user creation in e2e/tests/dev-auth-bypass.spec.ts - run script twice, verify single user exists

### Implementation for User Story 2

- [ ] T021 [US2] Implement idempotent user lookup in scripts/generate-dev-token.ts - use `auth.admin.listUsers()` to find existing `dev@local` before creation
- [ ] T022 [US2] Add `dev@local` to allowed_emails table in scripts/generate-dev-token.ts if not present (required for auth hook)
- [ ] T023 [US2] Add verbose progress output for user management steps: "Creating user...", "✓ User created/found: dev@local"

**Checkpoint**: Dev user management is idempotent - E2E test passes, script can be run multiple times safely

---

## Phase 5: User Story 3 - RLS Policy Verification (Priority: P2)

**Goal**: Create minimal seed data (household, profile, account) that enables immediate RLS verification through the bypassed session.

**Independent Test**: After auto-login, verify Dev Checking account with $10,000 balance appears. Try querying other household data via console - should return empty (RLS active).

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T024 [P] [US3] Add E2E test for seed data visibility in e2e/tests/dev-auth-bypass.spec.ts - verify Dev Checking account appears on dashboard after auto-login
- [ ] T025 [P] [US3] Add E2E test for RLS enforcement in e2e/tests/dev-auth-bypass.spec.ts - verify only dev household data is accessible

### Implementation for User Story 3

- [ ] T026 [US3] Implement `createDevHousehold()` in scripts/generate-dev-token.ts - create "Dev Household" if not exists
- [ ] T027 [US3] Implement `createDevProfile()` in scripts/generate-dev-token.ts - link dev user to household with email match
- [ ] T028 [US3] Implement `createSeedAccount()` in scripts/generate-dev-token.ts - create "Dev Checking" account with 10,000.00 balance (1000000 cents)
- [ ] T029 [US3] Add idempotency checks for all seed data creation (skip if already exists)
- [ ] T030 [US3] Add verbose progress output for seed data steps: "Creating household...", "Creating profile...", "Creating seed account..."

**Checkpoint**: All user stories should now be independently functional - E2E tests pass, full dev environment setup complete

---

## Phase 6: Visual Regression & Integration Tests

**Purpose**: Ensure UI consistency and catch visual regressions

- [ ] T031 [P] Add visual regression test for dev bypass login state in e2e/tests/visual/dev-auth-bypass.visual.spec.ts - capture dashboard immediately after dev auth bypass (should match existing dashboard snapshots)
- [ ] T032 [P] Add visual regression test for bypass failure state in e2e/tests/visual/dev-auth-bypass.visual.spec.ts - capture error toast when bypass fails

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final touches and documentation

- [ ] T033 [P] Add JSDoc comments to `injectDevSession()` in src/lib/supabase.ts explaining DEV-only behavior
- [ ] T034 [P] Add comments to src/main.tsx explaining dev auth bypass flow
- [ ] T035 Update .env.example with VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN placeholders and documentation
- [ ] T036 Run quickstart.md validation - verify all steps work as documented
- [ ] T037 Run full test suite (unit + E2E + visual) - verify all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 can proceed first (core token generation)
  - US2 and US3 can proceed after US1 or in parallel
- **Visual Regression (Phase 6)**: Depends on all user stories being complete
- **Polish (Phase 7)**: Depends on visual regression being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core functionality
- **User Story 2 (P2)**: Builds on US1's script - refines user management
- **User Story 3 (P2)**: Builds on US2's user creation - adds seed data

### Test-First Development

Within each phase:
1. Write tests FIRST (T004-T005, T011-T013, T020, T024-T025)
2. Verify tests FAIL
3. Implement features
4. Verify tests PASS

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different concerns)
- T004, T005 can run in parallel (different test cases)
- T006, T007, T008 can run in parallel (different files)
- T011, T012, T013 can run in parallel (different test cases)
- T020, T024, T025 can run in parallel (different test cases)
- T031, T032 can run in parallel (different visual tests)
- T033, T034 can run in parallel (different files)

---

## Parallel Example: Phase 2 Foundational

```bash
# Step 1: Write tests in parallel (TDD):
Task: T004 "Unit tests for injectDevSession() in src/lib/supabase.test.ts"
Task: T005 "Unit tests for hasDevTokens() in src/lib/supabase.test.ts"

# Step 2: Implement in parallel (different files):
Task: T006 "Add injectDevSession() in src/lib/supabase.ts"
Task: T007 "Add hasDevTokens() in src/lib/supabase.ts"
Task: T008 "Add type declarations in src/vite-env.d.ts"

# Step 3: Sequential integration:
Task: T009 "Modify bootstrap() in src/main.tsx" (depends on T006, T007)
Task: T010 "Add error toast display" (depends on T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T019)
4. **STOP and VALIDATE**: All unit + E2E tests pass, generate tokens, verify auto-login works
5. Deploy/demo if ready - basic dev auth bypass functional

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready, unit tests pass
2. Add User Story 1 → E2E tests pass, token generation works → MVP complete
3. Add User Story 2 → Idempotency E2E tests pass → User management robust
4. Add User Story 3 → RLS E2E tests pass → Full seed data available
5. Add Visual Regression → Visual tests pass → UI consistency verified
6. Add Polish → Documentation complete, full suite green

### Single Developer Strategy

Recommended execution order for single developer:

1. T001 → T002 → T003 (Setup)
2. T004, T005 (parallel, write tests) → T006, T007, T008 (parallel, implement) → T009 → T010 (Foundational)
3. T011, T012, T013 (parallel, write tests) → T014 → T015 → T016 → T017 → T018 → T019 (US1 - MVP)
4. T020 (write test) → T021 → T022 → T023 (US2)
5. T024, T025 (parallel, write tests) → T026 → T027 → T028 → T029 → T030 (US3)
6. T031, T032 (parallel, visual tests)
7. T033, T034 (parallel) → T035 → T036 → T037 (Polish)

---

## Files Summary

| File | Action | Tasks |
|------|--------|-------|
| `scripts/` | Create | T001 |
| `package.json` | Modify | T002, T003 |
| `src/lib/supabase.test.ts` | Modify | T004, T005 |
| `src/lib/supabase.ts` | Modify | T006, T007, T033 |
| `src/vite-env.d.ts` | Modify | T008 |
| `src/main.tsx` | Modify | T009, T010, T034 |
| `e2e/tests/dev-auth-bypass.spec.ts` | Create | T011, T012, T013, T020, T024, T025 |
| `scripts/generate-dev-token.ts` | Create | T014-T019, T021-T023, T026-T030 |
| `e2e/tests/visual/dev-auth-bypass.visual.spec.ts` | Create | T031, T032 |
| `.env.example` | Modify | T035 |

---

## Test Summary

| Test Type | File | Test Cases |
|-----------|------|------------|
| **Unit** | `src/lib/supabase.test.ts` | `injectDevSession()` success/failure, `hasDevTokens()` detection |
| **E2E** | `e2e/tests/dev-auth-bypass.spec.ts` | Auto-login flow, fallback to login, prod mode guard, idempotency, seed data visibility, RLS enforcement |
| **Visual** | `e2e/tests/visual/dev-auth-bypass.visual.spec.ts` | Dashboard after bypass, error toast on failure |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD approach: write tests first, verify they fail, then implement
- Script uses `tsx` for TypeScript execution without build step
- All tokens/data are local-only (dev Supabase instance)
- DEV mode check (`import.meta.env.DEV`) prevents production bypass
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
