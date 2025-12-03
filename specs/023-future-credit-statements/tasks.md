# Tasks: Future Credit Card Statements

**Input**: Design documents from `/specs/023-future-credit-statements/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: REQUIRED per TR-001 through TR-004 (unit, visual regression, E2E tests)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization - minimal setup required as this extends an existing codebase

- [ ] T001 Create feature branch `023-future-credit-statements` from main
- [ ] T002 [P] Copy type contract from `specs/023-future-credit-statements/contracts/future-statement.schema.ts` to `src/types/future-statement.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create database migration in `supabase/migrations/20251202000000_future_statements.sql` with table, indexes, RLS policies, and Realtime per data-model.md
- [ ] T004 Run migration locally and verify table exists in Supabase dashboard
- [ ] T005 [P] Add FutureStatement type exports to `src/types/index.ts` by importing from `src/types/future-statement.ts`
- [ ] T006 [P] Add `futureStatements` state and setter to finance store interface in `src/stores/finance-store.ts`
- [ ] T007 Implement `addFutureStatement` store action in `src/stores/finance-store.ts` following existing CRUD patterns
- [ ] T008 Implement `updateFutureStatement` store action in `src/stores/finance-store.ts`
- [ ] T009 Implement `deleteFutureStatement` store action in `src/stores/finance-store.ts`
- [ ] T010 Add future statements query to `src/hooks/use-finance-data.ts` with Supabase subscription
- [ ] T011 Add Realtime subscription for `future_statements` table in `src/hooks/use-finance-data.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add Future Statement to Credit Card (Priority: P1) 🎯 MVP

**Goal**: Users can add pre-defined credit card statement balances for upcoming months, with values reflected in cashflow projections.

**Independent Test**: Add a future statement for January 2025 with R$ 3.200 to an existing credit card and verify it appears in the UI and updates the cashflow chart for that month.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Create unit test for `addFutureStatement` store action in `tests/unit/future-statement.test.ts`
- [ ] T013 [P] [US1] Create unit test for 12-month rolling window validation in `tests/unit/future-statement.test.ts`
- [ ] T014 [P] [US1] Create unit test for duplicate month/year prevention in `tests/unit/future-statement.test.ts`
- [ ] T015 [P] [US1] Create unit test for cashflow calculation with future statements in `tests/unit/cashflow-future-statements.test.ts`
- [ ] T016 [P] [US1] Create integration test for adding future statement and verifying cashflow update in `tests/integration/cashflow-with-future-statements.test.ts`
- [ ] T017 [P] [US1] Create E2E test for "Add Future Statement" flow in `tests/e2e/future-statements.spec.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Modify `CashflowEngineInput` interface to accept `futureStatements` parameter in `src/lib/cashflow/calculate.ts`
- [ ] T019 [US1] Implement `getCreditCardAmountForDate` helper function in `src/lib/cashflow/calculate.ts` per research.md logic
- [ ] T020 [US1] Modify `createCreditCardEvents` to use future statement lookup (return 0 if not defined per FR-006) in `src/lib/cashflow/calculate.ts`
- [ ] T021 [US1] Update `useCashflowProjection` hook to pass `futureStatements` to calculation in `src/hooks/use-cashflow-projection.ts`
- [ ] T022 [P] [US1] Create `FutureStatementForm` component with month/year selector and amount input in `src/components/manage/credit-cards/future-statement-form.tsx`
- [ ] T023 [P] [US1] Create `FutureStatementList` component with empty state CTA in `src/components/manage/credit-cards/future-statement-list.tsx`
- [ ] T024 [US1] Add collapsible "Próximas Faturas" section to `src/components/manage/credit-cards/credit-card-card.tsx`
- [ ] T025 [US1] Implement pre-fill logic for next logical month in `FutureStatementForm` component
- [ ] T026 [US1] Add current month warning dialog (FR-011) to `FutureStatementForm` in `src/components/manage/credit-cards/future-statement-form.tsx`
- [ ] T027 [P] [US1] Create visual regression test for credit card card with future statements section in `tests/visual/credit-card-future-statements.test.ts`
- [ ] T028 [P] [US1] Create visual regression test for empty state CTA in `tests/visual/credit-card-future-statements.test.ts`

**Checkpoint**: User Story 1 complete - users can add future statements and see them in cashflow

---

## Phase 4: User Story 2 - Edit or Delete Future Statement (Priority: P2)

**Goal**: Users can update or remove future statement values they previously defined.

**Independent Test**: Edit a future statement amount from R$ 3.200 to R$ 2.800 and verify the cashflow updates accordingly.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T029 [P] [US2] Create unit test for `updateFutureStatement` store action in `tests/unit/future-statement.test.ts`
- [ ] T030 [P] [US2] Create unit test for `deleteFutureStatement` store action in `tests/unit/future-statement.test.ts`
- [ ] T031 [P] [US2] Create unit test for preventing edit of past-month statements in `tests/unit/future-statement.test.ts`
- [ ] T032 [P] [US2] Create E2E test for "Edit Future Statement" flow in `tests/e2e/future-statements.spec.ts`
- [ ] T033 [P] [US2] Create E2E test for "Delete Future Statement" flow in `tests/e2e/future-statements.spec.ts`

### Implementation for User Story 2

- [ ] T034 [US2] Add edit mode to `FutureStatementForm` component in `src/components/manage/credit-cards/future-statement-form.tsx`
- [ ] T035 [US2] Add edit button to each statement item in `FutureStatementList` in `src/components/manage/credit-cards/future-statement-list.tsx`
- [ ] T036 [US2] Add delete button with confirmation dialog to each statement item in `FutureStatementList`
- [ ] T037 [US2] Implement `isEditable` check based on month/year in `FutureStatementList` to disable edit for past months
- [ ] T038 [US2] Wire edit/delete handlers in `credit-card-card.tsx` to store actions
- [ ] T039 [P] [US2] Create visual regression test for edit mode in `tests/visual/credit-card-future-statements.test.ts`
- [ ] T040 [P] [US2] Create visual regression test for delete confirmation dialog in `tests/visual/credit-card-future-statements.test.ts`

**Checkpoint**: User Story 2 complete - users can edit and delete future statements

---

## Phase 5: User Story 3 - Automatic Statement Progression (Priority: P3)

**Goal**: When a new month arrives, the system automatically promotes the pre-defined future statement to become the current statement.

**Independent Test**: Simulate a month change (or use test date) and verify the current statement value updates to the pre-defined future value.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T041 [P] [US3] Create unit test for month progression with defined future statement in `tests/unit/month-progression.test.ts`
- [ ] T042 [P] [US3] Create unit test for month progression without defined future statement (keep current) in `tests/unit/month-progression.test.ts`
- [ ] T043 [P] [US3] Create unit test for multiple months passed scenario in `tests/unit/month-progression.test.ts`
- [ ] T044 [P] [US3] Create unit test for cleanup of past-month statements (FR-012) in `tests/unit/month-progression.test.ts`
- [ ] T045 [P] [US3] Create integration test for month progression in `tests/integration/month-progression.test.ts`
- [ ] T046 [P] [US3] Create E2E test for automatic progression on app launch in `tests/e2e/future-statements.spec.ts`

### Implementation for User Story 3

- [ ] T047 [US3] Create `performMonthProgression` function in `src/lib/cashflow/month-progression.ts`
- [ ] T048 [US3] Implement `checkAndProgressMonth` function with `last_progression_check` preference check in `src/lib/cashflow/month-progression.ts`
- [ ] T049 [US3] Create `useMonthProgression` hook in `src/hooks/use-month-progression.ts`
- [ ] T050 [US3] Add `getUserPreference` and `setUserPreference` helpers for `last_progression_check` in `src/stores/finance-store.ts`
- [ ] T051 [US3] Integrate `useMonthProgression` hook at app launch in appropriate component (e.g., `src/App.tsx` or dashboard)
- [ ] T052 [US3] Implement cleanup of past-month future statements during progression (FR-012)

**Checkpoint**: User Story 3 complete - automatic month progression working

---

## Phase 6: User Story 4 - View Upcoming Statement Schedule (Priority: P4)

**Goal**: Users can see at a glance all their upcoming credit card obligations across all their cards.

**Independent Test**: Add multiple future statements to multiple cards and verify they all appear in chronological order within each card.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T053 [P] [US4] Create unit test for chronological ordering of future statements in `tests/unit/future-statement.test.ts`
- [ ] T054 [P] [US4] Create E2E test for viewing multiple cards with future statements in `tests/e2e/future-statements.spec.ts`

### Implementation for User Story 4

- [ ] T055 [US4] Ensure future statements are sorted by target_year, target_month (nearest first) in `src/hooks/use-finance-data.ts`
- [ ] T056 [US4] Add statement count badge to collapsible trigger in `src/components/manage/credit-cards/credit-card-card.tsx`
- [ ] T057 [US4] Add month/year labels with proper formatting (e.g., "Janeiro/2025") to `FutureStatementList` items
- [ ] T058 [P] [US4] Create visual regression test for multi-statement display in `tests/visual/credit-card-future-statements.test.ts`

**Checkpoint**: User Story 4 complete - all user stories implemented

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, code cleanup, and cross-cutting improvements

- [ ] T059 Run all unit tests with `pnpm test` and fix any failures
- [ ] T060 Run all E2E tests with `pnpm test:e2e` and fix any failures
- [ ] T061 Run visual regression tests and update baselines if needed
- [ ] T062 [P] Verify all lint checks pass with `pnpm lint`
- [ ] T063 [P] Verify TypeScript compilation with `pnpm typecheck`
- [ ] T064 Run quickstart.md validation checklist manually
- [ ] T065 Run CodeRabbit review with `coderabbit --prompt-only -t uncommitted`
- [ ] T066 Fix any CodeRabbit findings and re-run (max 3 iterations)
- [ ] T067 Final manual testing in browser covering all acceptance scenarios
- [ ] T068 Create PR with descriptive summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (builds on add functionality)
- **User Story 3 (Phase 5)**: Depends on Foundational phase only (can parallel with US2)
- **User Story 4 (Phase 6)**: Depends on User Story 1 (needs list display)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
              ┌─────────────────┐
              │  Foundational   │
              │   (Phase 2)     │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             │
    ┌─────────┐   ┌─────────┐       │
    │ US1 P1  │   │ US3 P3  │       │
    │ (Add)   │   │(Progress)│       │
    └────┬────┘   └─────────┘       │
         │                          │
    ┌────┴────┐                     │
    │         │                     │
    ▼         ▼                     │
┌─────────┐ ┌─────────┐             │
│ US2 P2  │ │ US4 P4  │◄────────────┘
│(Edit/Del)│ │ (View)  │
└─────────┘ └─────────┘
```

- **User Story 1 (P1)**: After Foundational - **MVP, must complete first**
- **User Story 2 (P2)**: After User Story 1 - extends edit/delete functionality
- **User Story 3 (P3)**: After Foundational - independent of UI stories, can run in parallel with US2/US4
- **User Story 4 (P4)**: After User Story 1 - enhances display functionality

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Cashflow logic before UI components
- Core functionality before polish
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase:**
- T001 and T002 are sequential (branch first)

**Foundational Phase:**
- T005, T006 can run in parallel (different files)
- T007, T008, T009 are sequential (same file, build on each other)
- T010, T011 are sequential (same file)

**User Story 1:**
- All tests (T012-T017) can run in parallel
- T022, T023 can run in parallel (different component files)
- T027, T028 can run in parallel (different test scenarios)

**User Story 2:**
- All tests (T029-T033) can run in parallel
- T039, T040 can run in parallel

**User Story 3:**
- All tests (T041-T046) can run in parallel

**User Story 4:**
- T053, T054 can run in parallel

**Cross-Story Parallelism:**
- Once Foundational completes: US1 must complete first (MVP)
- After US1: US2, US3, US4 can be worked in parallel by different developers

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together:
Task T012: "Unit test for addFutureStatement in tests/unit/future-statement.test.ts"
Task T013: "Unit test for 12-month rolling window in tests/unit/future-statement.test.ts"
Task T014: "Unit test for duplicate prevention in tests/unit/future-statement.test.ts"
Task T015: "Unit test for cashflow calculation in tests/unit/cashflow-future-statements.test.ts"
Task T016: "Integration test in tests/integration/cashflow-with-future-statements.test.ts"
Task T017: "E2E test in tests/e2e/future-statements.spec.ts"

# Launch parallel UI components:
Task T022: "FutureStatementForm in src/components/manage/credit-cards/future-statement-form.tsx"
Task T023: "FutureStatementList in src/components/manage/credit-cards/future-statement-list.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - users can now add future statements and see them in cashflow

### Incremental Delivery

1. **Setup + Foundational** → Database, types, store ready
2. **+ User Story 1** → Users can add future statements (MVP!)
3. **+ User Story 2** → Users can edit/delete
4. **+ User Story 3** → Automatic progression on month change
5. **+ User Story 4** → Better visibility into scheduled statements
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 2+ developers after Foundational:

- **Developer A**: User Story 1 → User Story 2
- **Developer B**: User Story 3 (independent of UI) → Help with US4

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 68 |
| **Setup Tasks** | 2 |
| **Foundational Tasks** | 9 |
| **User Story 1 Tasks** | 17 |
| **User Story 2 Tasks** | 12 |
| **User Story 3 Tasks** | 12 |
| **User Story 4 Tasks** | 6 |
| **Polish Tasks** | 10 |
| **Parallelizable Tasks** | 31 (marked with [P]) |

### MVP Scope
- **Phase 1 + 2 + 3** = 28 tasks
- Delivers: Add future statements, cashflow integration, basic UI

### Test Distribution
- Unit tests: 13 tasks
- Integration tests: 2 tasks
- E2E tests: 5 tasks
- Visual regression tests: 5 tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `coderabbit --prompt-only -t uncommitted` before final PR

