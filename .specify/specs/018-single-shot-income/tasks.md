# Tasks: Single-Shot Income

**Input**: Design documents from `/specs/018-single-shot-income/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/store-api.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested in specification - test tasks NOT included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Database & Types)

**Purpose**: Database migration and core TypeScript types

- [X] T001 Create database migration in supabase/migrations/008_single_shot_income.sql
- [X] T002 [P] Add ProjectType enum and SingleShotIncome types in src/types/index.ts
- [X] T003 [P] Update ProjectRow interface in src/lib/supabase.ts with type and date fields

---

## Phase 2: Foundational (Store & Data Layer)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add singleShotIncome state and CRUD actions to src/stores/finance-store.ts
- [X] T005 Update src/hooks/use-finance-data.ts to map single-shot income from projects table
- [X] T006 [P] Add SingleShotIncome to CashflowEngineInput in src/lib/cashflow/validators.ts
- [X] T007 Add createSingleShotIncomeEvents function in src/lib/cashflow/calculate.ts
- [X] T008 Integrate single-shot income events into daily cashflow loop in src/lib/cashflow/calculate.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add a Single-Shot Income (Priority: P1) 🎯 MVP

**Goal**: Users can create single-shot income entries with name, amount, date, and certainty level

**Independent Test**: Create a new single-shot income with name "Restituição IR 2025", amount R$ 5.000, date "2025-06-15", certainty "guaranteed" and verify it appears in the list and persists after page refresh.

### Implementation for User Story 1

- [X] T009 [P] [US1] Create single-shot-income-form.tsx in src/components/manage/projects/
- [X] T010 [P] [US1] Create single-shot-income-list-item.tsx in src/components/manage/projects/
- [X] T011 [US1] Create single-shot-income-list.tsx in src/components/manage/projects/ (depends on T010)
- [X] T012 [US1] Create project-section.tsx with tabs in src/components/manage/projects/ (depends on T011)
- [X] T013 [US1] Update src/pages/Manage.tsx to use ProjectSection component

**Checkpoint**: User Story 1 complete - users can create and view single-shot income entries

---

## Phase 4: User Story 2 - View Single-Shot Income in Cashflow (Priority: P1)

**Goal**: Single-shot income appears in cashflow projection on exact scheduled date with certainty-based scenario filtering

**Independent Test**: Create a single-shot income for a date within the projection period and verify it appears as an income event on that date in the cashflow chart tooltip.

### Implementation for User Story 2

- [X] T014 [US2] Update src/hooks/use-cashflow-projection.ts to pass singleShotIncome to calculateCashflow
- [X] T015 [US2] Verify certainty filtering and tooltip display: (1) Create guaranteed income for tomorrow → verify appears in both optimistic AND pessimistic scenarios, (2) Create probable income for tomorrow → verify appears ONLY in optimistic scenario, (3) Create uncertain income for tomorrow → verify appears ONLY in optimistic scenario, (4) Hover over cashflow chart date with single-shot income → verify income name and amount appear in tooltip alongside other income events

**Checkpoint**: User Story 2 complete - single-shot income appears correctly in cashflow projections

---

## Phase 5: User Story 3 - Edit a Single-Shot Income (Priority: P2)

**Goal**: Users can edit existing single-shot income entries (name, amount, date, certainty)

**Independent Test**: Edit an existing single-shot income's amount, date, and certainty, then verify the changes persist and reflect in the cashflow.

### Implementation for User Story 3

- [X] T016 [US3] Add edit mode support to single-shot-income-form.tsx in src/components/manage/projects/
- [X] T017 [US3] Add edit button and handler to single-shot-income-list-item.tsx
- [X] T018 [US3] Wire up edit flow in src/pages/Manage.tsx

**Checkpoint**: User Story 3 complete - users can edit single-shot income entries

---

## Phase 6: User Story 4 - Delete a Single-Shot Income (Priority: P2)

**Goal**: Users can delete single-shot income entries with confirmation

**Independent Test**: Delete an existing single-shot income and verify it no longer appears in the list or cashflow.

### Implementation for User Story 4

- [X] T019 [US4] Add delete button with confirmation dialog to single-shot-income-list-item.tsx
- [X] T020 [US4] Wire up delete handler in src/pages/Manage.tsx

**Checkpoint**: User Story 4 complete - users can delete single-shot income entries

---

## Phase 7: User Story 5 - View Upcoming Single-Shot Income (Priority: P3)

**Goal**: Single-shot income list displays entries in chronological order with past entries visually distinguished

**Independent Test**: Add several single-shot income entries with different dates and verify the list displays them in chronological order with past entries showing "Recebido" badge.

### Implementation for User Story 5

- [X] T021 [US5] Add chronological sorting to single-shot-income-list.tsx
- [X] T022 [US5] Add past detection and "Recebido" badge with muted styling to single-shot-income-list-item.tsx
- [X] T023 [US5] Add "Hoje" indicator badge for entries with today's date in single-shot-income-list-item.tsx (per spec US5-AC3: "shows a 'Hoje' indicator")

**Checkpoint**: User Story 5 complete - list shows chronological order with visual distinction for past entries

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Empty state, final integration, and validation

- [X] T024 [P] Add empty state to single-shot-income-list.tsx with spec-defined messaging
- [ ] T025 Run quickstart.md "Testing Checklist" section (Manual Tests subsection) to validate all user-facing functionality
- [X] T026 Final code review and cleanup: (1) Remove any console.log/debug statements, (2) Run `pnpm lint` and fix errors, (3) Run `pnpm typecheck` and fix errors, (4) Verify no TODO comments left in new code, (5) Ensure all new files follow kebab-case naming convention

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and can proceed in parallel
  - US3 and US4 are both P2 priority and depend on US1 UI components
  - US5 is P3 priority and depends on US1 UI components
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Depends on US1 form component being created
- **User Story 4 (P2)**: Depends on US1 list item component being created
- **User Story 5 (P3)**: Depends on US1 list components being created

### Within Each User Story

- Models/Types before services/store
- Store before hooks
- Hooks before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T006 can run in parallel with T004/T005
- T009 and T010 can run in parallel (different files)
- US1 and US2 can be worked on in parallel after Foundational phase
- T024 can run in parallel with other Polish tasks

---

## Parallel Example: Setup Phase

```bash
# After T001 completes, launch in parallel:
Task: T002 "Add ProjectType enum and SingleShotIncome types in src/types/index.ts"
Task: T003 "Update ProjectRow interface in src/lib/supabase.ts"
```

## Parallel Example: User Story 1

```bash
# After Foundational phase, launch in parallel:
Task: T009 "Create single-shot-income-form.tsx"
Task: T010 "Create single-shot-income-list-item.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (database + types)
2. Complete Phase 2: Foundational (store + cashflow integration)
3. Complete Phase 3: User Story 1 (create + view in list)
4. Complete Phase 4: User Story 2 (view in cashflow)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 + 4 → Test independently → Deploy/Demo (CRUD complete)
4. Add User Story 5 → Test independently → Deploy/Demo (polish)
5. Each story adds value without breaking previous stories

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 26 |
| **Setup Tasks** | 3 |
| **Foundational Tasks** | 5 |
| **US1 Tasks** | 5 |
| **US2 Tasks** | 2 |
| **US3 Tasks** | 3 |
| **US4 Tasks** | 2 |
| **US5 Tasks** | 3 |
| **Polish Tasks** | 3 |
| **Parallel Opportunities** | 8 tasks marked [P] |
| **Suggested MVP Scope** | US1 + US2 (P1 stories) |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Migration must be applied before any code changes can be tested
- Follow existing single-shot expense patterns from feature 014

