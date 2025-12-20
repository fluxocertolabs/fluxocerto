# Tasks: Household Multi-Tenancy

**Input**: Design documents from `/specs/020-household-multitenancy/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: RLS isolation verification tasks (T028-T031) added per SC-007 requirement. Edge case verification tasks (T054-T056) added for coverage. V1 constraint verification tasks (T057-T060) added for FR-018 to FR-021. Empty household verification (T061) added for edge case coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization - N/A (existing project)

No setup tasks required. Project structure exists and all dependencies are already installed per plan.md (no new npm dependencies).

---

## Phase 2: Foundational (Database Migration)

**Purpose**: Database schema changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Create migration file `supabase/migrations/009_households.sql`
- [X] T002 Add households table with id, name, created_at, updated_at columns in `supabase/migrations/009_households.sql`
- [X] T003 Add `get_user_household_id()` helper function in `supabase/migrations/009_households.sql`
- [X] T004 Insert default household "Fonseca Floriano" in `supabase/migrations/009_households.sql`
- [X] T005 Add `household_id` FK column to `profiles` table with NOT NULL constraint in `supabase/migrations/009_households.sql`
- [X] T006 Add `household_id` FK column to `accounts` table in `supabase/migrations/009_households.sql`
- [X] T007 Add `household_id` FK column to `projects` table in `supabase/migrations/009_households.sql`
- [X] T008 Add `household_id` FK column to `expenses` table in `supabase/migrations/009_households.sql`
- [X] T009 Add `household_id` FK column to `credit_cards` table in `supabase/migrations/009_households.sql`
- [X] T010 Add `household_id` FK column to `user_preferences` table with updated unique constraint in `supabase/migrations/009_households.sql`
- [X] T011 Create indexes on `household_id` for all modified tables in `supabase/migrations/009_households.sql`
- [X] T012 Drop existing RLS policies (USING true) from all tables in `supabase/migrations/009_households.sql`
- [X] T013 Create household-based RLS policies for `households` table in `supabase/migrations/009_households.sql`
- [X] T014 Create household-based RLS policies for `profiles` table in `supabase/migrations/009_households.sql`
- [X] T015 Create household-based RLS policies for `accounts` table in `supabase/migrations/009_households.sql`
- [X] T016 Create household-based RLS policies for `projects` table in `supabase/migrations/009_households.sql`
- [X] T017 Create household-based RLS policies for `expenses` table in `supabase/migrations/009_households.sql`
- [X] T018 Create household-based RLS policies for `credit_cards` table in `supabase/migrations/009_households.sql`
- [X] T019 Create household-based RLS policies for `user_preferences` table in `supabase/migrations/009_households.sql`
- [X] T020 Update existing records to reference default household in `supabase/migrations/009_households.sql`
- [X] T021 Apply migration to database with `supabase db push`
- [X] T022 Verify migration: confirm households table exists and default household created
- [X] T023 Verify migration: confirm all existing data assigned to default household

**Checkpoint**: Database ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Data Isolation Between Households (Priority: P1) 🎯 MVP

**Goal**: Users from different households have 100% data isolation - no cross-household data leakage

**Independent Test**: Create two households with different users, add financial data to each, verify User A cannot see/access/modify User B's data

### Type Definitions (Parallel)

- [X] T024 [P] [US1] Add `HouseholdSchema` Zod schema and `Household` type to `src/types/index.ts`
- [X] T025 [P] [US1] Update `ProfileSchema` to include `householdId` field in `src/types/index.ts`
- [X] T026 [P] [US1] Add `HouseholdRow` interface to `src/lib/supabase.ts`
- [X] T027 [P] [US1] Update `ProfileRow` interface to include `household_id` in `src/lib/supabase.ts`

### RLS Isolation Verification (SC-007)

- [X] T028 [US1] Verify RLS isolation: Create test household B in database
- [X] T029 [US1] Verify RLS isolation: Query accounts as user from household A, confirm zero results from household B
- [X] T030 [US1] Verify RLS isolation: Query projects, expenses, credit_cards, user_preferences with same cross-household test
- [X] T031 [US1] Verify RLS isolation: Attempt INSERT with wrong household_id, confirm RLS rejects

### Data Layer Updates

- [X] T032 [US1] Update `mapProfileFromDb` function to map `household_id` → `householdId` in `src/hooks/use-finance-data.ts`
- [X] T033 [US1] Create `getHouseholdId` helper function to fetch current user's household_id in `src/lib/supabase.ts`
- [X] T034 [US1] Update `addAccount` store method to include `household_id` in `src/stores/finance-store.ts`
- [X] T035 [US1] Update `addProject` store method to include `household_id` in `src/stores/finance-store.ts`
- [X] T036 [US1] Update `addExpense` store method to include `household_id` in `src/stores/finance-store.ts`
- [X] T037 [US1] Update `addCreditCard` store method to include `household_id` in `src/stores/finance-store.ts`
- [X] T038 [US1] Update `updateUserPreference` store method to include `household_id` in `src/stores/finance-store.ts`

**Checkpoint**: Data isolation is enforced - User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Invite New Members to Household (Priority: P2)

**Goal**: Users can invite new members who automatically join the inviter's household

**Independent Test**: Have existing user send invite, new user accepts via magic link, verify new user sees same household data as inviter

### Implementation for User Story 2

- [X] T039 [US2] Update invite function to include `household_id` when creating profile in `src/lib/supabase.ts` (inviteUser function)
- [X] T040 [US2] Add validation to reject invites for emails already in a household in `src/lib/supabase.ts`
- [X] T041 [US2] Add pre-registration validation to verify household assignment is valid before profile creation completes (FR-014) in `src/lib/supabase.ts`
- [X] T042 [US2] Update invite error handling with PT-BR messages ("Este email já pertence a outra residência") in `src/lib/supabase.ts`

**Checkpoint**: Invite flow assigns correct household - User Story 2 is fully functional and testable independently

---

## Phase 5: User Story 3 - View Household Information and Members (Priority: P3)

**Goal**: Users can see their household name in the header and view all household members

**Independent Test**: Log in as any household member, verify household name in header, verify members list shows all correct members with "(Você)" indicator

### Implementation for User Story 3

- [X] T043 [P] [US3] Create household directory `src/components/household/`
- [X] T044 [P] [US3] Create `HouseholdBadge` component in `src/components/household/household-badge.tsx`
- [X] T045 [P] [US3] Create `MembersList` component in `src/components/household/members-list.tsx`
- [X] T046 [P] [US3] Create `UseHouseholdReturn` interface and `useHousehold` hook in `src/hooks/use-household.ts`
- [X] T047 [US3] Update header to display household badge using `useHousehold` hook in `src/components/layout/header.tsx`
- [X] T048 [US3] Add "Membros da Residência" section to manage page using `MembersList` component in `src/pages/manage.tsx`
- [X] T049 [US3] Add orphaned household error state handling ("Sua conta está desassociada. Entre em contato com o administrador.") in `src/hooks/use-household.ts`

**Checkpoint**: Household info visible in UI - User Story 3 is fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, edge case handling, and cleanup

### Core Verification

- [X] T050 Verify all existing functionality works correctly scoped to household context
- [X] T051 Verify TypeScript compiles without errors (`pnpm tsc --noEmit`)
- [ ] T052 Verify no console errors during normal operation
- [ ] T053 Run quickstart.md verification checklist
- [X] T054 Run linting and fix any issues (`pnpm lint`)

### Edge Case Verification

- [ ] T055 Verify orphaned user error: Manually remove user's household_id in DB, confirm error message "Sua conta está desassociada" displays
- [ ] T056 Verify concurrent invite handling: Simulate two invites to same email, confirm second receives "já pertence a outra residência" error
- [ ] T057 Verify invite to existing household member: Attempt to invite email already in a household, confirm rejection with clear error

### V1 Constraint Verification (FR-018 to FR-021)

- [ ] T058 Verify no household switching: Confirm no UI or API endpoint exists for changing household assignment (FR-018)
- [ ] T059 Verify no transfers: Confirm no UI or API endpoint exists for transferring users between households (FR-019)
- [ ] T060 Verify no self-service household creation: Confirm no UI or API endpoint exists for creating new households (FR-020)
- [ ] T061 Verify no member removal UI: Confirm no UI exists for removing members from households (FR-021)

### Additional Edge Case Verification

- [ ] T062 Verify empty household handling: Query an empty household (all members removed via direct DB), confirm system doesn't break or throw errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped - existing project
- **Foundational (Phase 2)**: No dependencies - BLOCKS all user stories (database migration)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion (can run in parallel with US1)
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion (can run in parallel with US1, US2)
- **Polish (Phase 6)**: Depends on all user stories being complete (includes edge case verification T055-T057, V1 constraints T058-T061, empty household T062)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Models/types before services
- Services/hooks before UI components
- Core implementation before integration

### Parallel Opportunities

**Phase 2 (within migration file - conceptual parallelism)**:
- T002-T004: Table structure (sequential in SQL)
- T005-T011: Column additions (can be grouped)
- T012-T019: RLS policies (can be grouped)

**Phase 3 (User Story 1)**:
- T024, T025 (types/index.ts) can run in parallel with T026, T027 (supabase.ts) - all marked [P]
- T028-T031 (RLS verification) must wait for T033 (helper function) and require test household setup
- T034-T038 (store methods) must wait for T033 (helper function)

**Phase 4 (User Story 2)**:
- Sequential - each task builds on previous

**Phase 5 (User Story 3)**:
- T043, T044, T045, T046 can ALL run in parallel (different files)
- T047, T048 must wait for T046 (useHousehold hook)

**Cross-Story Parallelism**:
- Once Phase 2 completes, US1, US2, and US3 can ALL start in parallel
- Different team members could work on different stories simultaneously

---

## Parallel Example: User Story 3

```bash
# Launch all independent component/hook tasks together:
Task: "Create household directory src/components/household/"
Task: "Create HouseholdBadge component in src/components/household/household-badge.tsx"
Task: "Create MembersList component in src/components/household/members-list.tsx"
Task: "Create UseHouseholdReturn interface and useHousehold hook in src/hooks/use-household.ts"

# Then after hook is ready:
Task: "Update header to display household badge..."
Task: "Add Membros da Residência section to manage page..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (database migration)
2. Complete Phase 3: User Story 1 (types + store updates)
3. **STOP and VALIDATE**: Test data isolation between households
4. Deploy/demo if ready - users have secure data isolation

### Incremental Delivery

1. Complete Foundational → Database ready
2. Add User Story 1 → Test data isolation → Deploy (MVP!)
3. Add User Story 2 → Test invite flow → Deploy
4. Add User Story 3 → Test UI → Deploy (Full feature!)
5. Each story adds value without breaking previous stories

### Suggested Sequence for Single Developer

1. T001-T023 (Phase 2: Migration) - ~1-2 hours
2. T024-T038 (Phase 3: US1 - Types, RLS Verification, Data Layer) - ~1.5 hours
3. T039-T042 (Phase 4: US2 - Invite Flow) - ~30 minutes
4. T043-T049 (Phase 5: US3 - UI) - ~1 hour
5. T050-T062 (Phase 6: Polish + Edge Cases + V1 Constraints) - ~1 hour

**Total estimated time**: ~6 hours

---

## Notes

- [P] tasks = different files, no dependencies (can run in parallel)
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All UI text must be in PT-BR ("residência", "membros", "Você")
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- RLS verification tasks (T028-T031) satisfy SC-007 "100% RLS policy tests pass" requirement
- Edge case tasks (T055-T057) verify spec edge cases from spec.md:L62-66
- V1 constraint tasks (T058-T061) verify FR-018 to FR-021 are properly enforced
- Empty household task (T062) verifies system handles edge case gracefully
- Single-shot expenses/income are stored in `expenses`/`projects` tables with type discriminator, not separate tables
