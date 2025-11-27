# Tasks: Invite-Only Magic Link Authentication

**Input**: Design documents from `/specs/010-invite-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- **Supabase**: `supabase/` at repository root (migrations, functions)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema changes

- [ ] T000 Create migration file supabase/migrations/002_invite_auth.sql with header comment
- [ ] T001 Enable citext extension in supabase/migrations/002_invite_auth.sql
- [ ] T002 Create allowed_emails table with citext email column in supabase/migrations/002_invite_auth.sql
- [ ] T003 [P] Create auth types file in src/types/auth.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Drop existing user_id-based RLS policies on accounts table in supabase/migrations/002_invite_auth.sql
- [ ] T005 [P] Drop existing user_id-based RLS policies on projects table in supabase/migrations/002_invite_auth.sql
- [ ] T006 [P] Drop existing user_id-based RLS policies on expenses table in supabase/migrations/002_invite_auth.sql
- [ ] T007 [P] Drop existing user_id-based RLS policies on credit_cards table in supabase/migrations/002_invite_auth.sql
- [ ] T008 Remove user_id column from accounts table in supabase/migrations/002_invite_auth.sql
- [ ] T009 [P] Remove user_id column from projects table in supabase/migrations/002_invite_auth.sql
- [ ] T010 [P] Remove user_id column from expenses table in supabase/migrations/002_invite_auth.sql
- [ ] T011 [P] Remove user_id column from credit_cards table in supabase/migrations/002_invite_auth.sql
- [ ] T012 Create new authenticated-only RLS policies for accounts table in supabase/migrations/002_invite_auth.sql
- [ ] T013 [P] Create new authenticated-only RLS policies for projects table in supabase/migrations/002_invite_auth.sql
- [ ] T014 [P] Create new authenticated-only RLS policies for expenses table in supabase/migrations/002_invite_auth.sql
- [ ] T015 [P] Create new authenticated-only RLS policies for credit_cards table in supabase/migrations/002_invite_auth.sql
- [ ] T016 Create before-user-created Edge Function in supabase/functions/before-user-created/index.ts
- [ ] T017 Update TypeScript Row types to remove user_id in src/lib/supabase.ts
- [ ] T018 Create useAuth hook for auth state management in src/hooks/use-auth.ts
- [ ] T019 Remove user_id filtering from realtime subscriptions in src/hooks/use-finance-data.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Magic Link Login (Priority: P1) 🎯 MVP

**Goal**: Family members can enter their email, receive a Magic Link, and authenticate to access the dashboard.

**Independent Test**: Enter a pre-approved email on login page → receive Magic Link email → click link → verify successful authentication with dashboard access.

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create LoginForm component in src/components/auth/login-form.tsx
- [ ] T021 [P] [US1] Create Login page in src/pages/login.tsx
- [ ] T022 [US1] Add signInWithOtp wrapper method in src/lib/supabase.ts
- [ ] T023 [US1] Create AuthCallback page for Magic Link handling in src/pages/auth-callback.tsx
- [ ] T024 [US1] Add /login and /auth/confirm routes in src/App.tsx
- [ ] T025 [US1] Add auth guard to protect dashboard route in src/App.tsx
- [ ] T026 [US1] Add auth guard to protect manage route in src/App.tsx
- [ ] T027 [US1] Update auth initialization in src/main.tsx
- [ ] T028 [US1] Add redirect to dashboard for authenticated users on /login route in src/App.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can request Magic Link, click it, and access dashboard

---

## Phase 4: User Story 2 - Invite-Only Access Control (Priority: P1)

**Goal**: Only pre-approved email addresses can create accounts; unauthorized users are silently rejected (no email enumeration).

**Independent Test**: Attempt signup with non-approved email → verify same success message shown → verify no Magic Link received.

### Implementation for User Story 2

> **Note**: T016 (Foundational phase) implements the Edge Function. These tasks are verification checkpoints to confirm the implementation meets US2 requirements.

- [ ] T029 [US2] **VERIFY** before-user-created hook validates email against allowed_emails table (implemented in T016)
- [ ] T030 [US2] **VERIFY** hook returns 400 error for non-approved emails (implemented in T016)
- [ ] T031 [US2] **VERIFY** hook fails closed on system errors with 500 response (implemented in T016)
- [ ] T032 [US2] Ensure LoginForm always shows success message regardless of email approval status in src/components/auth/login-form.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - approved users can login, non-approved users are silently blocked

---

## Phase 5: User Story 3 - Shared Family Data Access (Priority: P1)

**Goal**: All authenticated family members view and edit the same financial data with no per-user isolation.

**Independent Test**: Two family members log in from different devices → one adds expense → other sees it appear in real-time.

### Implementation for User Story 3

> **Note**: T019 (Foundational phase) removes user_id filtering from realtime subscriptions. These tasks complete the CRUD operation changes in the same file.

- [ ] T033 [US3] Remove user_id from insert operations in src/hooks/use-finance-data.ts
- [ ] T034 [US3] Remove user_id from select queries in src/hooks/use-finance-data.ts
- [ ] T035 [US3] Remove user_id from update operations in src/hooks/use-finance-data.ts
- [ ] T036 [US3] Remove user_id from delete operations in src/hooks/use-finance-data.ts
- [ ] T037 [US3] **VERIFY** realtime subscriptions work without user_id filter (implemented in T019)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work - all authenticated users share the same data

---

## Phase 6: User Story 4 - Sign Out (Priority: P2)

**Goal**: Users can sign out, clearing their session and returning to the login page.

**Independent Test**: Click sign-out button → verify redirection to login page → verify session cleared (protected routes redirect to login).

### Implementation for User Story 4

- [ ] T038 [P] [US4] Add signOut wrapper method in src/lib/supabase.ts
- [ ] T039 [US4] Add sign-out button to header component in src/components/layout/header.tsx
- [ ] T040 [US4] Implement sign-out handler with redirect to /login in src/components/layout/header.tsx

**Checkpoint**: At this point, User Stories 1-4 should work - complete auth flow including sign-out

---

## Phase 7: User Story 5 - Authentication Error Handling (Priority: P2)

**Goal**: Users receive clear, actionable feedback for auth issues (expired links, rate limiting, network errors).

**Independent Test**: Use expired Magic Link → verify appropriate error message appears with retry option.

### Implementation for User Story 5

- [ ] T041 [P] [US5] Create auth error message mapping constants in src/lib/auth-errors.ts
- [ ] T042 [US5] Add error handling for expired Magic Links in src/pages/auth-callback.tsx
- [ ] T043 [US5] Add error handling for rate limiting in src/components/auth/login-form.tsx
- [ ] T044 [US5] Add error handling for network errors in src/components/auth/login-form.tsx
- [ ] T045 [US5] Display user-friendly error messages with toast notifications in src/pages/auth-callback.tsx
- [ ] T046 [US5] Add "Request new link" button on expired link error in src/pages/auth-callback.tsx

**Checkpoint**: All user stories should now be independently functional with proper error handling

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and final verification

- [ ] T047 Disable anonymous authentication in Supabase dashboard (manual step)
- [ ] T048 Remove anonymous auth initialization code from src/main.tsx
- [ ] T049 Add allowed_emails seed data for testing via Supabase SQL Editor (manual step)
- [ ] T050 Configure Supabase redirect URLs for /auth/confirm (manual step) — **Verify**: Attempt Magic Link login and confirm redirect works
- [ ] T051 Deploy before-user-created Edge Function to Supabase (manual step) — **Verify**: Run `npx supabase functions logs before-user-created` and confirm deployment; test with non-approved email
- [ ] T052 Run quickstart.md validation tests
- [ ] T053 Update constitution.md security section to reflect Magic Link auth (replace anonymous auth documentation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 (core functionality) - should be completed in order
  - US4, US5 are P2 (secondary) - can proceed after US1-3 are stable
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Builds on US1 (needs login form) - Hook logic is in Foundational phase
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Independent of auth UI
- **User Story 4 (P2)**: Depends on US1 (needs authenticated state and header)
- **User Story 5 (P2)**: Depends on US1 (needs auth callback and login form)

### Within Each User Story

- UI components before pages
- Library methods before consuming components
- Routes after pages exist
- Guards after routes exist
- Story complete before moving to next priority

### Parallel Opportunities

- T003 can run in parallel with T001-T002 (different files)
- T004-T007 can run in parallel (different tables, same migration file but independent sections)
- T008-T011 can run in parallel (different tables)
- T012-T015 can run in parallel (different tables)
- T020-T021 can run in parallel (different components)
- T038 can run in parallel with other US4 tasks (different file)
- T041 can run in parallel with other US5 tasks (different file)

---

## Parallel Example: Foundational Phase

```bash
# Launch all RLS policy drops together:
Task: "Drop existing user_id-based RLS policies on accounts table"
Task: "Drop existing user_id-based RLS policies on projects table"
Task: "Drop existing user_id-based RLS policies on expenses table"
Task: "Drop existing user_id-based RLS policies on credit_cards table"

# Launch all user_id column removals together:
Task: "Remove user_id column from accounts table"
Task: "Remove user_id column from projects table"
Task: "Remove user_id column from expenses table"
Task: "Remove user_id column from credit_cards table"

# Launch all new RLS policy creations together:
Task: "Create new authenticated-only RLS policies for accounts table"
Task: "Create new authenticated-only RLS policies for projects table"
Task: "Create new authenticated-only RLS policies for expenses table"
Task: "Create new authenticated-only RLS policies for credit_cards table"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Magic Link Login)
4. Complete Phase 4: User Story 2 (Invite-Only Access)
5. Complete Phase 5: User Story 3 (Shared Data)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → MVP login works!
3. Add User Story 2 → Test independently → Invite-only enforced!
4. Add User Story 3 → Test independently → Family sharing works!
5. Add User Story 4 → Test independently → Sign-out works!
6. Add User Story 5 → Test independently → Error handling complete!
7. Polish phase → Production ready!

### Single Developer Strategy

Execute phases sequentially in priority order:
1. Setup + Foundational (must complete first)
2. US1 → US2 → US3 (P1 stories in order)
3. US4 → US5 (P2 stories)
4. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Migration file (002_invite_auth.sql) consolidates all schema changes
- Manual Supabase dashboard steps are in Polish phase (T047, T049, T050, T051)
- Edge Function deployment is separate from migration

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 54 |
| **Setup Tasks** | 4 (includes T000) |
| **Foundational Tasks** | 16 |
| **User Story 1 Tasks** | 9 |
| **User Story 2 Tasks** | 4 (3 are verification checkpoints) |
| **User Story 3 Tasks** | 5 (1 is verification checkpoint) |
| **User Story 4 Tasks** | 3 |
| **User Story 5 Tasks** | 6 |
| **Polish Tasks** | 7 (includes T053 constitution update) |
| **Parallel Opportunities** | 20 tasks marked [P] |
| **Suggested MVP Scope** | User Stories 1-3 (P1 priority) |

