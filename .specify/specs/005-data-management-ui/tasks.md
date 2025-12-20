# Tasks: Data Management UI

**Input**: Design documents from `/specs/005-data-management-ui/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/components.md, quickstart.md

**Tests**: Not explicitly requested - test tasks omitted per template guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure routing foundation

- [X] T001 Install react-router-dom@7.9.6 via `pnpm add react-router-dom@7.9.6`
- [X] T002 Install shadcn/ui components via `pnpm dlx shadcn@latest add button card dialog input label select switch tabs alert-dialog`
- [X] T003 [P] Create directory structure for manage components at `src/components/manage/`
- [X] T004 [P] Create directory structure for layout components at `src/components/layout/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update `src/App.tsx` with BrowserRouter, Routes, and route definitions for `/` and `/manage`
- [X] T006 Create `src/pages/manage.tsx` with basic page shell and tabbed interface structure
- [X] T007 Create `src/components/layout/header.tsx` with navigation links to Dashboard and Manage
- [X] T008 Create `src/hooks/use-finance-data.ts` hook using useLiveQuery from dexie-react-hooks
- [X] T009 [P] Create `src/components/manage/shared/entity-empty-state.tsx` for empty list states
- [X] T010 [P] Create `src/components/manage/shared/delete-confirmation.tsx` using AlertDialog
- [X] T011 [P] Create `src/components/manage/shared/inline-edit-input.tsx` for quick balance updates
- [X] T012-pre [P] Create `src/components/manage/shared/storage-error-toast.tsx` for IndexedDB error handling with retry option

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Initial Financial Setup (Priority: P1) 🎯 MVP

**Goal**: Enable first-time users to add bank accounts, projects, expenses, and credit cards through intuitive forms

**Independent Test**: Open app → see empty state → click CTA → navigate to /manage → add one of each entity type → verify they appear in lists → return to dashboard and see projection

### Implementation for User Story 1

- [X] T012 [US1] Update `src/components/cashflow/empty-state.tsx` to add CTA Link button navigating to /manage
- [X] T013 [P] [US1] Create `src/components/manage/accounts/account-form.tsx` with name, type, balance fields and Zod validation
- [X] T014 [P] [US1] Create `src/components/manage/projects/project-form.tsx` with name, amount, paymentDay, frequency, certainty fields and Zod validation
- [X] T015 [P] [US1] Create `src/components/manage/expenses/expense-form.tsx` with name, amount, dueDay fields and Zod validation
- [X] T016 [P] [US1] Create `src/components/manage/credit-cards/credit-card-form.tsx` with name, statementBalance, dueDay fields and Zod validation
- [X] T017 [P] [US1] Create `src/components/manage/accounts/account-list.tsx` container component
- [X] T018 [P] [US1] Create `src/components/manage/projects/project-list.tsx` container component
- [X] T019 [P] [US1] Create `src/components/manage/expenses/expense-list.tsx` container component
- [X] T020 [P] [US1] Create `src/components/manage/credit-cards/credit-card-list.tsx` container component
- [X] T021 [US1] Wire up account form to addAccount store action in `src/pages/manage.tsx`
- [X] T022 [US1] Wire up project form to addProject store action in `src/pages/manage.tsx`
- [X] T023 [US1] Wire up expense form to addExpense store action in `src/pages/manage.tsx`
- [X] T024 [US1] Wire up credit card form to addCreditCard store action in `src/pages/manage.tsx`
- [X] T025 [US1] Integrate all list components into tabbed interface in `src/pages/manage.tsx`

**Checkpoint**: User Story 1 complete - users can add all entity types and see them in lists

---

## Phase 4: User Story 2 - Monthly Balance Updates (Priority: P2)

**Goal**: Enable quick inline editing of bank account and credit card balances for efficient monthly updates

**Independent Test**: Have existing data → view accounts list → click balance → edit inline → verify change persists → repeat for credit cards → check dashboard reflects changes

### Implementation for User Story 2

- [X] T026 [P] [US2] Create `src/components/manage/accounts/account-list-item.tsx` with inline balance editing using InlineEditInput
- [X] T027 [P] [US2] Create `src/components/manage/credit-cards/credit-card-list-item.tsx` with inline balance editing using InlineEditInput
- [X] T028 [US2] Wire account-list-item inline edit to updateAccount store action
- [X] T029 [US2] Wire credit-card-list-item inline edit to updateCreditCard store action

**Checkpoint**: User Story 2 complete - users can quickly update balances inline

---

## Phase 5: User Story 3 - View and Organize Financial Data (Priority: P3)

**Goal**: Display organized lists with visual distinction between active and inactive items

**Independent Test**: Have data in all categories → navigate to /manage → verify tabs work → check active/inactive visual distinction → test mobile scrolling

### Implementation for User Story 3

- [X] T030 [P] [US3] Create `src/components/manage/projects/project-list-item.tsx` with active/inactive visual styling and badges
- [X] T031 [P] [US3] Create `src/components/manage/expenses/expense-list-item.tsx` with active/inactive visual styling and badges
- [X] T032 [US3] Add responsive mobile-first styling to all list components using Tailwind responsive classes
- [X] T033 [US3] Implement tab navigation state persistence in `src/pages/manage.tsx` (remember active tab)

**Checkpoint**: User Story 3 complete - users can view organized data with clear visual hierarchy

---

## Phase 6: User Story 4 - Edit Entity Details (Priority: P4)

**Goal**: Allow full editing of all entity fields through edit forms

**Independent Test**: Select existing entity → see pre-filled form → modify fields → save → verify changes persist → test cancel behavior → test validation errors

### Implementation for User Story 4

- [X] T034 [US4] Add edit mode support to AccountForm (pre-fill values when account prop provided)
- [X] T035 [US4] Add edit mode support to ProjectForm (pre-fill values when project prop provided)
- [X] T036 [US4] Add edit mode support to ExpenseForm (pre-fill values when expense prop provided)
- [X] T037 [US4] Add edit mode support to CreditCardForm (pre-fill values when card prop provided)
- [X] T038 [US4] Wire edit buttons in account-list-item to open edit dialog with updateAccount action
- [X] T039 [US4] Wire edit buttons in project-list-item to open edit dialog with updateProject action
- [X] T040 [US4] Wire edit buttons in expense-list-item to open edit dialog with updateExpense action
- [X] T041 [US4] Wire edit buttons in credit-card-list-item to open edit dialog with updateCreditCard action

**Checkpoint**: User Story 4 complete - users can fully edit any entity

---

## Phase 7: User Story 5 - Toggle Active Status (Priority: P5)

**Goal**: Allow toggling active/inactive status for projects and expenses

**Independent Test**: Toggle project inactive → verify visual change → check dashboard excludes it → toggle back active → verify dashboard includes it → repeat for expenses

### Implementation for User Story 5

- [X] T042 [US5] Add Switch toggle to project-list-item and wire to toggleProjectActive store action
- [X] T043 [US5] Add Switch toggle to expense-list-item and wire to toggleExpenseActive store action

**Checkpoint**: User Story 5 complete - users can toggle active status without deleting data

---

## Phase 8: User Story 6 - Delete Entities (Priority: P6)

**Goal**: Allow permanent deletion with confirmation

**Independent Test**: Select entity → click delete → see confirmation → cancel → verify entity unchanged → delete again → confirm → verify removed from list and dashboard

### Implementation for User Story 6

- [X] T044 [US6] Wire delete button in account-list-item to DeleteConfirmation dialog and deleteAccount action
- [X] T045 [US6] Wire delete button in project-list-item to DeleteConfirmation dialog and deleteProject action
- [X] T046 [US6] Wire delete button in expense-list-item to DeleteConfirmation dialog and deleteExpense action
- [X] T047 [US6] Wire delete button in credit-card-list-item to DeleteConfirmation dialog and deleteCreditCard action

**Checkpoint**: User Story 6 complete - users can permanently remove entities with safety confirmation

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [X] T048 [P] Verify responsive design works on 320px viewport for all forms and lists
- [X] T049 [P] Verify keyboard navigation and accessibility (focus states, ARIA labels)
- [X] T050 Run quickstart.md manual testing checklist to validate all functionality
- [X] T051 Clean up any unused imports and ensure consistent code style

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
  - Some user stories have internal dependencies (e.g., US4 edit needs US1 forms)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates base forms and lists
- **User Story 2 (P2)**: Can start after Foundational - Creates list items with inline edit
- **User Story 3 (P3)**: Can start after US2 - Adds styling to list items created in US2
- **User Story 4 (P4)**: Depends on US1 (forms) and US2/US3 (list items) - Adds edit functionality
- **User Story 5 (P5)**: Depends on US3 (list items with visual styling) - Adds toggle
- **User Story 6 (P6)**: Depends on US2/US3 (list items) - Adds delete with confirmation

### Within Each User Story

- Forms before list containers
- List containers before wiring to store actions
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003 and T004 can run in parallel (directory creation)

**Phase 2 (Foundational)**:
- T009, T010, T011 can run in parallel (shared components)

**Phase 3 (User Story 1)**:
- T013, T014, T015, T016 can run in parallel (all forms)
- T017, T018, T019, T020 can run in parallel (all list containers)

**Phase 4 (User Story 2)**:
- T026, T027 can run in parallel (list items)

**Phase 5 (User Story 3)**:
- T030, T031 can run in parallel (list items with styling)

**Phase 9 (Polish)**:
- T048, T049 can run in parallel (verification tasks)

---

## Parallel Example: User Story 1 Forms

```bash
# Launch all forms in parallel:
Task T013: "Create account-form.tsx"
Task T014: "Create project-form.tsx"
Task T015: "Create expense-form.tsx"
Task T016: "Create credit-card-form.tsx"

# Then launch all list containers in parallel:
Task T017: "Create account-list.tsx"
Task T018: "Create project-list.tsx"
Task T019: "Create expense-list.tsx"
Task T020: "Create credit-card-list.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dependencies)
2. Complete Phase 2: Foundational (routing, header, shared components)
3. Complete Phase 3: User Story 1 (forms and basic lists)
4. **STOP and VALIDATE**: Test adding all entity types
5. Deploy/demo if ready - users can now input their financial data!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Inline editing for monthly updates
4. Add User Story 3 → Visual polish and organization
5. Add User Story 4 → Full edit capability
6. Add User Story 5 → Toggle active/inactive
7. Add User Story 6 → Delete with confirmation
8. Polish → Final verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing store actions (addAccount, updateAccount, etc.) are already tested - no store changes needed
- Existing Zod schemas (BankAccountInputSchema, etc.) provide validation - reuse them in forms

