# Tasks: Single-Shot Expenses

**Input**: Design documents from `/specs/014-single-shot-expenses/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/store-api.md ✓, quickstart.md ✓

**Tests**: Not explicitly requested in specification - test tasks are NOT included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Database & Types)

**Purpose**: Database migration and type system foundation

- [X] T001 Create database migration in supabase/migrations/003_single_shot_expenses.sql
- [X] T002 [P] Add ExpenseType enum and discriminated union types in src/types/index.ts
- [X] T003 [P] Add type guards (isFixedExpense, isSingleShotExpense) in src/types/index.ts
- [X] T004 [P] Update existing ExpenseRow interface to add `type`, `date` fields in src/lib/supabase.ts

---

## Phase 2: Foundational (Data Layer)

**Purpose**: Core data mapping and store infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement mapExpenseFromDb function to handle both expense types in src/hooks/use-finance-data.ts
- [X] T006 Add fixedExpenses and singleShotExpenses filtered properties to useFinanceData return in src/hooks/use-finance-data.ts
- [X] T007 [P] Update existing addExpense action to explicitly set type='fixed' in src/stores/finance-store.ts
- [X] T008 [P] Add addSingleShotExpense action per store-api.md contract in src/stores/finance-store.ts
- [X] T009 [P] Add updateSingleShotExpense action per store-api.md contract in src/stores/finance-store.ts
- [X] T010 [P] Add deleteSingleShotExpense action per store-api.md contract in src/stores/finance-store.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add a Single-Shot Expense (Priority: P1) 🎯 MVP

**Goal**: Users can create single-shot expenses with name, amount, and specific calendar date

**Independent Test**: Create a new single-shot expense with name "IPVA 2025", amount R$ 2.500, date "2025-01-20" and verify it appears in the list and persists after page refresh.

### Implementation for User Story 1

- [X] T011 [US1] Create SingleShotExpenseForm component in src/components/manage/expenses/single-shot-expense-form.tsx
- [X] T012 [US1] Create ExpenseSection container with "Fixas"/"Pontuais" tabs in src/components/manage/expenses/expense-section.tsx
- [X] T013 [US1] Create SingleShotExpenseList component with empty state in src/components/manage/expenses/single-shot-expense-list.tsx
- [X] T014 [US1] Update manage page to use ExpenseSection with tab navigation in src/pages/manage.tsx
- [X] T015 [US1] Wire up addSingleShotExpense action to form submission in src/pages/manage.tsx

**Checkpoint**: User Story 1 complete - users can add single-shot expenses via form

---

## Phase 4: User Story 2 - View Single-Shot Expenses in Cashflow (Priority: P1)

**Goal**: Single-shot expenses appear in cashflow projection on their exact scheduled date

**Independent Test**: Create a single-shot expense for a date within the projection period and verify it appears as an expense event on that date in the cashflow chart tooltip.

### Implementation for User Story 2

- [X] T016 [US2] Update ValidatedInput interface to include singleShotExpenses in src/lib/cashflow/validators.ts
- [X] T017 [US2] Update validateAndFilterInput to separate fixed and single-shot expenses in src/lib/cashflow/validators.ts
- [X] T018 [US2] Extend createExpenseEvents to include single-shot expenses with exact date matching in src/lib/cashflow/calculate.ts
- [X] T019 [US2] Update calculateCashflow to pass singleShotExpenses to createExpenseEvents in src/lib/cashflow/calculate.ts

**Checkpoint**: User Story 2 complete - single-shot expenses appear in cashflow on correct dates

---

## Phase 5: User Story 3 - Edit a Single-Shot Expense (Priority: P2)

**Goal**: Users can edit existing single-shot expenses (name, amount, date)

**Independent Test**: Edit an existing single-shot expense's amount and date, then verify the changes persist and reflect in the cashflow.

### Implementation for User Story 3

- [X] T020 [US3] Add edit dialog state and handler for single-shot expenses in src/pages/manage.tsx
- [X] T021 [US3] Update SingleShotExpenseForm to accept optional expense prop for edit mode in src/components/manage/expenses/single-shot-expense-form.tsx
- [X] T022 [US3] Wire up updateSingleShotExpense action to edit form submission in src/pages/manage.tsx

**Checkpoint**: User Story 3 complete - users can edit single-shot expenses

---

## Phase 6: User Story 4 - Delete a Single-Shot Expense (Priority: P2)

**Goal**: Users can delete single-shot expenses with confirmation

**Independent Test**: Delete an existing single-shot expense and verify it no longer appears in the list or cashflow.

### Implementation for User Story 4

- [X] T023 [US4] Add delete confirmation dialog for single-shot expenses in src/pages/manage.tsx
- [X] T024 [US4] Wire up deleteSingleShotExpense action to delete confirmation in src/pages/manage.tsx

**Checkpoint**: User Story 4 complete - users can delete single-shot expenses with confirmation

---

## Phase 7: User Story 5 - View Upcoming Single-Shot Expenses (Priority: P3)

**Goal**: Users see chronological list with visual distinction for past/today/future expenses

**Independent Test**: Add several single-shot expenses with different dates and verify the list displays them in chronological order with past expenses visually distinguished.

### Implementation for User Story 5

- [X] T025 [US5] Create SingleShotExpenseListItem with date status badges (Vencido/Hoje) in src/components/manage/expenses/single-shot-expense-list-item.tsx
- [X] T026 [US5] Implement getExpenseStatus helper returning 'past' | 'today' | 'future' with labels "Vencido" / "Hoje" / null in src/components/manage/expenses/single-shot-expense-list-item.tsx
- [X] T027 [US5] Update SingleShotExpenseList to sort expenses chronologically and use list item component in src/components/manage/expenses/single-shot-expense-list.tsx
- [X] T028 [US5] Apply muted styling for past expenses in list item in src/components/manage/expenses/single-shot-expense-list-item.tsx

**Checkpoint**: User Story 5 complete - expenses sorted chronologically with visual status indicators

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T029 [P] Verify empty state displays correctly with placeholder illustration (use existing app design patterns or simple icon) and CTA in src/components/manage/expenses/single-shot-expense-list.tsx
- [X] T030 [P] Ensure all pt-BR labels are correct across all new components
- [X] T031 Run quickstart.md validation steps to verify full implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and can proceed in parallel
  - US3 and US4 (P2) can proceed after US1 is complete (need UI foundation)
  - US5 (P3) can proceed after US1 is complete (need list component)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories (cashflow is separate from UI)
- **User Story 3 (P2)**: Depends on US1 (needs form component and manage page wiring)
- **User Story 4 (P2)**: Depends on US1 (needs manage page wiring)
- **User Story 5 (P3)**: Depends on US1 (needs list component foundation)

### Within Each User Story

- Models/types before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different files)
- T007, T008, T009, T010 can run in parallel (same file but independent actions)
- US1 and US2 can be worked on in parallel after Foundational phase
- T029, T030 can run in parallel in Polish phase

---

## Parallel Example: Foundational Phase

```bash
# After T005-T006 complete, launch store actions in parallel:
Task: "Update existing addExpense action to explicitly set type='fixed' in src/stores/finance-store.ts"
Task: "Add addSingleShotExpense action per store-api.md contract in src/stores/finance-store.ts"
Task: "Add updateSingleShotExpense action per store-api.md contract in src/stores/finance-store.ts"
Task: "Add deleteSingleShotExpense action per store-api.md contract in src/stores/finance-store.ts"
```

## Parallel Example: User Stories 1 & 2 (Both P1)

```bash
# After Foundational phase, can work on both P1 stories simultaneously:

# Developer A - User Story 1 (UI):
Task: "Create SingleShotExpenseForm component in src/components/manage/expenses/single-shot-expense-form.tsx"
Task: "Create ExpenseSection container with tabs in src/components/manage/expenses/expense-section.tsx"

# Developer B - User Story 2 (Cashflow):
Task: "Update ValidatedInput interface in src/lib/cashflow/validators.ts"
Task: "Extend createExpenseEvents in src/lib/cashflow/calculate.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (database migration + types)
2. Complete Phase 2: Foundational (data mapping + store actions)
3. Complete Phase 3: User Story 1 (add expense UI)
4. Complete Phase 4: User Story 2 (cashflow integration)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo if ready - users can add single-shot expenses and see them in cashflow

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test → Deploy/Demo (MVP!)
3. Add User Story 3 → Test → Deploy (edit capability)
4. Add User Story 4 → Test → Deploy (delete capability)
5. Add User Story 5 → Test → Deploy (enhanced list view)
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database migration (T001) should be applied before any other work
- All UI text must be in Brazilian Portuguese (pt-BR)
- Amount values are stored in cents (integer)
- **Post-implementation**: Update `.specify/memory/constitution.md` Domain Logic section to reflect unified `Expense` type with discriminated union (currently documents `FixedExpense` only)
