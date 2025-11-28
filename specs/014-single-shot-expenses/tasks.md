# Tasks: Single-Shot Expenses

**Input**: Design documents from `/specs/014-single-shot-expenses/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/store-api.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are NOT included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and type system foundation

- [X] T001 Create database migration file `supabase/migrations/003_single_shot_expenses.sql` with type discriminator column, date column, nullable due_day, constraints, and indexes
- [ ] T002 Apply migration to local Supabase instance, verify schema changes, and confirm existing RLS policies apply to single-shot expenses (user isolation)
- [X] T003 [P] Add expense type discriminator enum and schemas to `src/types/index.ts` (ExpenseTypeSchema, FixedExpenseInputSchema, FixedExpenseSchema)
- [X] T004 [P] Add single-shot expense Zod schemas to `src/types/index.ts` (SingleShotExpenseInputSchema, SingleShotExpenseSchema)
- [X] T005 Add discriminated union expense schemas to `src/types/index.ts` (ExpenseInputSchema, ExpenseSchema, type guards)
- [X] T006 Update ExpenseRow interface in `src/lib/supabase.ts` to include type, date, and nullable due_day fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Update `mapExpenseFromDb` function in `src/hooks/use-finance-data.ts` to handle both fixed and single-shot expense types via discriminator
- [X] T008 Add filtered properties `fixedExpenses` and `singleShotExpenses` to `UseFinanceDataReturn` interface in `src/hooks/use-finance-data.ts`
- [X] T009 Implement filtering logic in `use-finance-data.ts` hook to derive `fixedExpenses` and `singleShotExpenses` from unified expenses array
- [X] T010 Update existing `addExpense` action in `src/stores/finance-store.ts` to explicitly set `type: 'fixed'` and `date: null` in database insert
- [X] T011 Add `addSingleShotExpense` action to `src/stores/finance-store.ts` per store-api.md contract
- [X] T012 [P] Add `updateSingleShotExpense` action to `src/stores/finance-store.ts` per store-api.md contract
- [X] T013 [P] Add `deleteSingleShotExpense` action to `src/stores/finance-store.ts` per store-api.md contract

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add a Single-Shot Expense (Priority: P1) 🎯 MVP

**Goal**: Users can create one-time expenses with name, amount, and specific calendar date

**Independent Test**: Create a new single-shot expense with name "IPVA 2025", amount R$ 2.500, date "2025-01-20" and verify it appears in the list and persists after page refresh

### Implementation for User Story 1

- [X] T014 [US1] Create `src/components/manage/expenses/single-shot-expense-form.tsx` with name, amount (currency input), and date (date picker) fields per quickstart.md
- [X] T015 [US1] Add form validation for name (1-100 chars required), amount (positive integer required), and date (required) with pt-BR error messages
- [X] T016 [US1] Create `src/components/manage/expenses/single-shot-expense-list.tsx` component with empty state illustration, message "Nenhuma despesa pontual cadastrada", and "Adicionar Despesa Pontual" CTA
- [X] T017 [US1] Create `src/components/manage/expenses/expense-section.tsx` with sub-tabs "Fixas" and "Pontuais" using existing Tabs component
- [X] T018 [US1] Update manage page to replace direct ExpenseList usage with new ExpenseSection component
- [X] T019 [US1] Wire up addSingleShotExpense store action to single-shot expense form submission
- [X] T020 [US1] Add dialog state management for single-shot expense add form in manage page

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View Single-Shot Expenses in Cashflow (Priority: P1)

**Goal**: Single-shot expenses appear in cashflow projection on their exact scheduled date in both scenarios

**Independent Test**: Create a single-shot expense for a date within the projection period and verify it appears as an expense event on that date in the cashflow chart tooltip

### Implementation for User Story 2

- [X] T021 [US2] Update `ValidatedInput` interface in `src/lib/cashflow/validators.ts` to include `singleShotExpenses: SingleShotExpense[]` property
- [X] T022 [US2] Update `validateAndFilterInput` function in `src/lib/cashflow/validators.ts` to separate expenses by type and include all single-shot expenses (always active)
- [X] T023 [US2] Update `createExpenseEvents` function signature in `src/lib/cashflow/calculate.ts` to accept `singleShotExpenses` parameter
- [X] T024 [US2] Implement single-shot expense event generation in `createExpenseEvents` using `isSameDay` from date-fns for exact date matching
- [X] T025 [US2] Update all callsites of `createExpenseEvents` in `src/lib/cashflow/calculate.ts` to pass single-shot expenses
- [X] T026 [US2] Verify single-shot expenses appear in both optimistic and pessimistic scenarios (certain expenses per spec)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Edit a Single-Shot Expense (Priority: P2)

**Goal**: Users can edit existing single-shot expenses (name, amount, date)

**Independent Test**: Edit an existing single-shot expense's amount and date, then verify the changes persist and reflect in the cashflow

### Implementation for User Story 3

- [X] T027 [US3] Add edit mode support to `single-shot-expense-form.tsx` with pre-populated values from existing expense
- [X] T028 [US3] Create `src/components/manage/expenses/single-shot-expense-list-item.tsx` with edit button, expense details display, and date formatting per quickstart.md
- [X] T029 [US3] Wire up updateSingleShotExpense store action to form submission in edit mode
- [X] T030 [US3] Add dialog state management for single-shot expense edit form in manage page

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Delete a Single-Shot Expense (Priority: P2)

**Goal**: Users can delete single-shot expenses with confirmation

**Independent Test**: Delete an existing single-shot expense and verify it no longer appears in the list or cashflow

### Implementation for User Story 4

- [X] T031 [US4] Add delete button to `single-shot-expense-list-item.tsx` component
- [X] T032 [US4] Add confirmation dialog for single-shot expense deletion (consistent with existing delete patterns)
- [X] T033 [US4] Wire up deleteSingleShotExpense store action to delete confirmation

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - View Upcoming Single-Shot Expenses (Priority: P3)

**Goal**: Users see chronological list with visual distinction for past/today/future expenses

**Independent Test**: Add several single-shot expenses with different dates and verify the list displays them in chronological order with past expenses visually distinguished

### Implementation for User Story 5

- [X] T034 [US5] Add `getExpenseStatus` helper function in `single-shot-expense-list-item.tsx` returning 'past' | 'today' | 'future' based on date comparison
- [X] T035 [US5] Implement chronological sorting in `single-shot-expense-list.tsx` (sort by date ascending)
- [X] T036 [US5] Add visual styling for past expenses (muted opacity, "Vencido" badge) in `single-shot-expense-list-item.tsx`
- [X] T037 [US5] Add "Hoje" badge with accent styling for today's expenses in `single-shot-expense-list-item.tsx`
- [X] T038 [US5] Add formatted date display using date-fns `format` with pt-BR locale ("d 'de' MMMM 'de' yyyy")

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T039 [P] Run quickstart.md verification steps (database, typecheck, lint)
- [ ] T040 [P] Verify realtime updates work for single-shot expenses (insert, update, delete) - covers edge case "deleted while viewing cashflow"
- [X] T041 Verify existing fixed expenses still work correctly after migration (backward compatibility)
- [ ] T042 [P] Verify single-shot expenses appear in cashflow chart tooltip with correct name and amount formatting (FR-013)
- [ ] T043 Manual end-to-end testing of all user stories per spec acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and can proceed in parallel
  - US3 and US4 are P2 priority and can proceed after US1
  - US5 is P3 priority and can proceed after US1
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1 (uses same data but different UI)
- **User Story 3 (P2)**: Depends on US1 (needs form component to add edit mode)
- **User Story 4 (P2)**: Depends on US1 (needs list item component to add delete)
- **User Story 5 (P3)**: Depends on US1 (needs list component to add sorting/styling)

### Within Each User Story

- Models/types before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T004 can run in parallel (different type definitions)
- T012, T013 can run in parallel (different store actions)
- T039, T040 can run in parallel (different verification steps)
- US1 and US2 can be worked on in parallel after Foundational phase
- US3, US4, US5 can be worked on in parallel after US1 completes

---

## Parallel Example: Setup Phase

```bash
# Launch type schema tasks in parallel:
Task T003: "Add expense type discriminator enum and schemas to src/types/index.ts"
Task T004: "Add single-shot expense Zod schemas to src/types/index.ts"
```

## Parallel Example: Foundational Phase

```bash
# Launch store action tasks in parallel:
Task T012: "Add updateSingleShotExpense action to src/stores/finance-store.ts"
Task T013: "Add deleteSingleShotExpense action to src/stores/finance-store.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (database + types)
2. Complete Phase 2: Foundational (data mapping + store actions)
3. Complete Phase 3: User Story 1 (create expense UI)
4. Complete Phase 4: User Story 2 (cashflow integration)
5. **STOP and VALIDATE**: Test creating expenses and viewing in cashflow
6. Deploy/demo if ready - users can now track one-time expenses!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo (edit capability)
4. Add User Story 4 → Test independently → Deploy/Demo (delete capability)
5. Add User Story 5 → Test independently → Deploy/Demo (improved UX)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (create UI)
   - Developer B: User Story 2 (cashflow integration)
3. After US1 completes:
   - Developer A: User Story 3 (edit)
   - Developer C: User Story 4 (delete)
   - Developer D: User Story 5 (list UX)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All monetary values stored in cents (integer) per constitution
- UI language is Brazilian Portuguese (pt-BR)
- Date handling: Date objects in TypeScript, ISO strings in database
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 43 |
| **Setup Phase** | 6 tasks |
| **Foundational Phase** | 7 tasks |
| **User Story 1** | 7 tasks |
| **User Story 2** | 6 tasks |
| **User Story 3** | 4 tasks |
| **User Story 4** | 3 tasks |
| **User Story 5** | 5 tasks |
| **Polish Phase** | 5 tasks |
| **Parallel Opportunities** | 8 task groups marked [P] |
| **Suggested MVP Scope** | User Stories 1 + 2 (both P1 priority) |

