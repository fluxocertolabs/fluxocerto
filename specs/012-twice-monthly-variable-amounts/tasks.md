# Tasks: Twice-Monthly Variable Amounts

**Input**: Design documents from `/specs/012-twice-monthly-variable-amounts/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Unit tests included per quickstart.md and research.md (cashflow engine focus per constitution).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Type System Foundation)

**Purpose**: Extend the Zod schema to support optional variable amounts in TwiceMonthlySchedule

- [ ] T001 Extend TwiceMonthlyScheduleSchema with optional firstAmount and secondAmount fields in src/types/index.ts
- [ ] T002 Add Zod refinement to validate both amounts present or both absent in src/types/index.ts

**Checkpoint**: Type system ready - cashflow engine and UI can now use the extended schema

---

## Phase 2: User Story 1 - Configure Variable Amounts (Priority: P1) 🎯 MVP

**Goal**: Users can enable a toggle when configuring twice-monthly projects to set distinct amounts for each payment day

**Independent Test**: Create a new twice-monthly project, enable variable amounts toggle, enter different amounts for each field, save, and verify both amounts are stored correctly in the payment schedule.

### Unit Tests for User Story 1

- [ ] T003 [P] [US1] Add unit test for TwiceMonthlyScheduleSchema validation (both or neither amounts) in src/types/index.test.ts

### Implementation for User Story 1

- [ ] T004 [US1] Add variableAmountsEnabled state and toggle component (visible only for twice-monthly) in src/components/manage/projects/project-form.tsx
- [ ] T005 [US1] Add firstAmount and secondAmount input fields that appear when toggle is enabled in src/components/manage/projects/project-form.tsx
- [ ] T006 [US1] Implement toggle enable behavior: pre-populate firstAmount from existing amount in src/components/manage/projects/project-form.tsx
- [ ] T007 [US1] Implement toggle disable behavior: use firstAmount as single amount in src/components/manage/projects/project-form.tsx
- [ ] T008 [US1] Update buildPaymentSchedule() to include variable amounts when enabled in src/components/manage/projects/project-form.tsx
- [ ] T009 [US1] Add form validation error handling for variable amount fields in src/components/manage/projects/project-form.tsx

**Checkpoint**: Users can create twice-monthly projects with variable amounts through the form UI

---

## Phase 3: User Story 2 - Cashflow Reflects Variable Amounts (Priority: P1)

**Goal**: Cashflow projections show the correct amount on each respective payment day when variable amounts are configured

**Independent Test**: Create a project with firstDay=5 (R$ 3.000) and secondDay=20 (R$ 500), generate cashflow projection, verify R$ 3.000 appears on day 5 and R$ 500 appears on day 20.

### Unit Tests for User Story 2

- [ ] T010 [P] [US2] Add unit test: uses firstAmount on first payment day in src/lib/cashflow/calculate.test.ts
- [ ] T011 [P] [US2] Add unit test: uses secondAmount on second payment day in src/lib/cashflow/calculate.test.ts
- [ ] T012 [P] [US2] Add unit test: falls back to project.amount when no variable amounts in src/lib/cashflow/calculate.test.ts
- [ ] T013 [P] [US2] Add unit test: handles month-end edge cases with variable amounts in src/lib/cashflow/calculate.test.ts

### Implementation for User Story 2

- [ ] T014 [US2] Update createIncomeEvents to resolve correct amount for each payment day in src/lib/cashflow/calculate.ts
- [ ] T015 [US2] Add helper function getAmountForTwiceMonthlyPayment() in src/lib/cashflow/calculate.ts

**Checkpoint**: Cashflow engine correctly calculates income events with variable amounts

---

## Phase 4: User Story 3 - Edit Existing Project (Priority: P2)

**Goal**: Users can edit existing twice-monthly projects to add or modify variable amounts

**Independent Test**: Open an existing twice-monthly project (single amount), enable variable amounts, set different values, save, and verify the project is updated with variable amounts in the cashflow.

### Implementation for User Story 3

- [ ] T016 [US3] Update getInitialScheduleState() to extract firstAmount/secondAmount from existing projects in src/components/manage/projects/project-form.tsx
- [ ] T017 [US3] Initialize variableAmountsEnabled state based on existing project data in src/components/manage/projects/project-form.tsx

**Checkpoint**: Users can edit existing projects to add/modify variable amounts

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Display formatting and final integration

- [ ] T018 [P] Update formatCurrency display to show slash format for variable amounts in src/components/manage/projects/project-list-item.tsx
- [ ] T019 Run manual testing checklist from quickstart.md
- [ ] T020 Verify backward compatibility: existing twice-monthly projects without variable amounts continue to work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (US1)**: Depends on Phase 1 completion
- **Phase 3 (US2)**: Depends on Phase 1 completion (can run in parallel with Phase 2)
- **Phase 4 (US3)**: Depends on Phase 2 completion (extends form functionality)
- **Phase 5 (Polish)**: Depends on Phases 2, 3, 4 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 1 - Independent of US1 (different files)
- **User Story 3 (P2)**: Depends on US1 completion (extends form logic)

### Within Each User Story

- Tests SHOULD be written first (TDD approach per quickstart.md)
- Schema changes before implementation
- Core logic before UI integration

### Parallel Opportunities

- T003, T010, T011, T012, T013 (all unit tests) can run in parallel
- US1 and US2 can be worked on in parallel after Phase 1 (different files: form vs cashflow engine)
- T018 can run in parallel with any Phase 5 task

---

## Parallel Example: User Story 2 Tests

```bash
# Launch all cashflow tests for User Story 2 together:
Task: "Add unit test: uses firstAmount on first payment day in src/lib/cashflow/calculate.test.ts"
Task: "Add unit test: uses secondAmount on second payment day in src/lib/cashflow/calculate.test.ts"
Task: "Add unit test: falls back to project.amount when no variable amounts in src/lib/cashflow/calculate.test.ts"
Task: "Add unit test: handles month-end edge cases with variable amounts in src/lib/cashflow/calculate.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (Type System)
2. Complete Phase 2: User Story 1 (Form UI) - parallel with Phase 3
3. Complete Phase 3: User Story 2 (Cashflow Engine) - parallel with Phase 2
4. **STOP and VALIDATE**: Test both stories independently
5. Deploy/demo if ready (core feature complete)

### Incremental Delivery

1. Complete Setup → Type system ready
2. Add User Story 1 → Test form independently → Can create projects with variable amounts
3. Add User Story 2 → Test cashflow independently → Variable amounts reflected in projections (MVP!)
4. Add User Story 3 → Test edit flow → Can modify existing projects
5. Add Polish → Complete feature with proper display formatting

### Key Files Changed

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add optional firstAmount/secondAmount to TwiceMonthlyScheduleSchema |
| `src/lib/cashflow/calculate.ts` | Update createIncomeEvents for variable amount resolution |
| `src/components/manage/projects/project-form.tsx` | Add toggle, amount fields, state management |
| `src/components/manage/projects/project-list-item.tsx` | Update amount display format |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All amounts are in cents (integer) per constitution
- All UI text in Brazilian Portuguese (pt-BR) per constitution
- No SQL migration required - JSONB schema extension only
- Backward compatible: existing projects work without changes

