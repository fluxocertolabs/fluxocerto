# Tasks: Household Multi-Tenancy

**Input**: Design documents from `/specs/020-household-multitenancy/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not requested in spec - no test tasks included.

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

- [ ] T001 Create migration file `supabase/migrations/009_households.sql`
- [ ] T002 Add households table with id, name, created_at, updated_at columns in `supabase/migrations/009_households.sql`
- [ ] T003 Add `get_user_household_id()` helper function in `supabase/migrations/009_households.sql`
- [ ] T004 Insert default household "Fonseca Floriano" in `supabase/migrations/009_households.sql`
- [ ] T005 Add `household_id` FK column to `profiles` table with NOT NULL constraint in `supabase/migrations/009_households.sql`
- [ ] T006 Add `household_id` FK column to `accounts` table in `supabase/migrations/009_households.sql`
- [ ] T007 Add `household_id` FK column to `projects` table in `supabase/migrations/009_households.sql`
- [ ] T008 Add `household_id` FK column to `expenses` table in `supabase/migrations/009_households.sql`
- [ ] T009 Add `household_id` FK column to `credit_cards` table in `supabase/migrations/009_households.sql`
- [ ] T010 Add `household_id` FK column to `user_preferences` table with updated unique constraint in `supabase/migrations/009_households.sql`
- [ ] T011 Create indexes on `household_id` for all modified tables in `supabase/migrations/009_households.sql`
- [ ] T012 Drop existing RLS policies (USING true) from all tables in `supabase/migrations/009_households.sql`
- [ ] T013 Create household-based RLS policies for `households` table in `supabase/migrations/009_households.sql`
- [ ] T014 Create household-based RLS policies for `profiles` table in `supabase/migrations/009_households.sql`
- [ ] T015 Create household-based RLS policies for `accounts` table in `supabase/migrations/009_households.sql`
- [ ] T016 Create household-based RLS policies for `projects` table in `supabase/migrations/009_households.sql`
- [ ] T017 Create household-based RLS policies for `expenses` table in `supabase/migrations/009_households.sql`
- [ ] T018 Create household-based RLS policies for `credit_cards` table in `supabase/migrations/009_households.sql`
- [ ] T019 Create household-based RLS policies for `user_preferences` table in `supabase/migrations/009_households.sql`
- [ ] T020 Update existing records to reference default household in `supabase/migrations/009_households.sql`
- [ ] T021 Apply migration to database with `supabase db push`
- [ ] T022 Verify migration: confirm households table exists and default household created
- [ ] T023 Verify migration: confirm all existing data assigned to default household

**Checkpoint**: Database ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Data Isolation Between Households (Priority: P1) 🎯 MVP

**Goal**: Users from different households have 100% data isolation - no cross-household data leakage

**Independent Test**: Create two households with different users, add financial data to each, verify User A cannot see/access/modify User B's data

### Implementation for User Story 1

- [ ] T024 [P] [US1] Add `HouseholdSchema` Zod schema and `Household` type to `src/types/index.ts`
- [ ] T025 [P] [US1] Update `ProfileSchema` to include `householdId` field in `src/types/index.ts`
- [ ] T026 [P] [US1] Add `HouseholdRow` interface to `src/lib/supabase.ts`
- [ ] T027 [P] [US1] Update `ProfileRow` interface to include `household_id` in `src/lib/supabase.ts`
- [ ] T028 [US1] Update `mapProfileFromDb` function to map `household_id` → `householdId` in `src/hooks/use-finance-data.ts`
- [ ] T029 [US1] Create `getHouseholdId` helper function to fetch current user's household_id in `src/lib/supabase.ts`
- [ ] T030 [US1] Update `addAccount` store method to include `household_id` in `src/stores/finance-store.ts`
- [ ] T031 [US1] Update `addProject` store method to include `household_id` in `src/stores/finance-store.ts`
- [ ] T032 [US1] Update `addExpense` store method to include `household_id` in `src/stores/finance-store.ts`
- [ ] T033 [US1] Update `addCreditCard` store method to include `household_id` in `src/stores/finance-store.ts`
- [ ] T034 [US1] Update `updateUserPreference` store method to include `household_id` in `src/stores/finance-store.ts`

**Checkpoint**: Data isolation is enforced - User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Invite New Members to Household (Priority: P2)

**Goal**: Users can invite new members who automatically join the inviter's household

**Independent Test**: Have existing user send invite, new user accepts via magic link, verify new user sees same household data as inviter

### Implementation for User Story 2

- [ ] T035 [US2] Update invite function to include `household_id` when creating profile in `src/lib/supabase.ts` (inviteUser function)
- [ ] T036 [US2] Add validation to reject invites for emails already in a household in `src/lib/supabase.ts`
- [ ] T037 [US2] Update invite error handling with PT-BR messages ("Este email já pertence a outra residência") in `src/lib/supabase.ts`

**Checkpoint**: Invite flow assigns correct household - User Story 2 is fully functional and testable independently

---

## Phase 5: User Story 3 - View Household Information and Members (Priority: P3)

**Goal**: Users can see their household name in the header and view all household members

**Independent Test**: Log in as any household member, verify household name in header, verify members list shows all correct members with "(Você)" indicator

### Implementation for User Story 3

- [ ] T038 [P] [US3] Create household directory `src/components/household/`
- [ ] T039 [P] [US3] Create `HouseholdBadge` component in `src/components/household/household-badge.tsx`
- [ ] T040 [P] [US3] Create `MembersList` component in `src/components/household/members-list.tsx`
- [ ] T041 [P] [US3] Create `UseHouseholdReturn` interface and `useHousehold` hook in `src/hooks/use-household.ts`
- [ ] T042 [US3] Update header to display household badge using `useHousehold` hook in `src/components/layout/header.tsx`
- [ ] T043 [US3] Add "Membros da Residência" section to manage page using `MembersList` component in `src/pages/manage.tsx`
- [ ] T044 [US3] Add orphaned household error state handling ("Sua conta está desassociada. Entre em contato com o administrador.") in `src/hooks/use-household.ts`

**Checkpoint**: Household info visible in UI - User Story 3 is fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [ ] T045 Verify all existing functionality works correctly scoped to household context
- [ ] T046 Verify TypeScript compiles without errors (`pnpm tsc --noEmit`)
- [ ] T047 Verify no console errors during normal operation
- [ ] T048 Run quickstart.md verification checklist
- [ ] T049 Run linting and fix any issues (`pnpm lint`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped - existing project
- **Foundational (Phase 2)**: No dependencies - BLOCKS all user stories (database migration)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion (can run in parallel with US1)
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion (can run in parallel with US1, US2)
- **Polish (Phase 6)**: Depends on all user stories being complete

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
- T024, T025 (types/index.ts) can run in parallel with T026, T027 (supabase.ts)
- T030-T034 (store methods) must wait for T029 (helper function)

**Phase 4 (User Story 2)**:
- Sequential - each task builds on previous

**Phase 5 (User Story 3)**:
- T038, T039, T040, T041 can ALL run in parallel (different files)
- T042, T043 must wait for T041 (useHousehold hook)

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
2. T024-T034 (Phase 3: US1 - Data Isolation) - ~1 hour
3. T035-T037 (Phase 4: US2 - Invite Flow) - ~30 minutes
4. T038-T044 (Phase 5: US3 - UI) - ~1 hour
5. T045-T049 (Phase 6: Polish) - ~30 minutes

**Total estimated time**: ~4-5 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All UI text must be in PT-BR ("residência", "membros", "Você")
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

