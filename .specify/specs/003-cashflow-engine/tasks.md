# Tasks: Cashflow Calculation Engine

**Input**: Design documents from `/specs/003-cashflow-engine/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in feature specification - test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)
- Engine lives in `/src/lib/cashflow/` as a pure module

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [X] T001 Install date-fns@4.1.0 dependency with exact version pinning via `pnpm add date-fns@4.1.0`
- [X] T002 Create cashflow module directory structure at `src/lib/cashflow/`
- [X] T003 [P] Create barrel export file at `src/lib/cashflow/index.ts`
- [X] T004 [P] Create types file at `src/lib/cashflow/types.ts` with engine-specific output types from contracts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement Zod validation schemas in `src/lib/cashflow/validators.ts` for all input entities (BankAccount, Project, FixedExpense, CreditCard, CashflowEngineOptions)
- [X] T006 [P] Implement custom error class `CashflowCalculationError` with error codes in `src/lib/cashflow/types.ts`
- [X] T007 [P] Implement starting balance calculator (sum of checking accounts) in `src/lib/cashflow/calculate.ts` — returns 0 when no accounts exist (edge case from spec.md)
- [X] T008 Implement input validation wrapper function that validates and filters active entities in `src/lib/cashflow/validators.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 & 2 - Basic Projection + Dual Scenarios (Priority: P1) 🎯 MVP

**Goal**: Generate day-by-day cashflow projection with both optimistic and pessimistic scenarios

**Why Combined**: US1 (basic projection) and US2 (dual scenarios) are tightly coupled - the projection inherently calculates both scenarios. Implementing them together is more efficient and produces a more cohesive MVP.

**Independent Test**: Provide sample financial data (accounts, income, expenses) and verify:
1. Engine produces a daily balance array with correct calculations
2. Optimistic scenario includes all active income
3. Pessimistic scenario includes only guaranteed income
4. Both scenarios diverge correctly based on certainty levels

### Implementation for User Stories 1 & 2

- [X] T009 [US1/2] Implement core `calculateCashflow` function signature in `src/lib/cashflow/calculate.ts` that returns `CashflowProjection`
- [X] T010 [US1/2] Implement daily snapshot generation loop (iterate through projection days) in `src/lib/cashflow/calculate.ts`
- [X] T011 [US1/2] Implement income event creation for monthly frequency (day-of-month matching) in `src/lib/cashflow/calculate.ts` — initial implementation, will be refactored in T021 to use frequency module
- [X] T012 [US1/2] Implement expense event creation for FixedExpense (monthly on due day) in `src/lib/cashflow/calculate.ts`
- [X] T013 [US1/2] Implement expense event creation for CreditCard (monthly on due day) in `src/lib/cashflow/calculate.ts`
- [X] T014 [US1/2] Implement dual balance tracking (optimistic includes all active, pessimistic includes only guaranteed) in `src/lib/cashflow/calculate.ts`
- [X] T015 [US1/2] Implement `ScenarioSummary` generation (totalIncome, totalExpenses, endBalance) in `src/lib/cashflow/calculate.ts`
- [X] T016 [US1/2] Wire up main export in `src/lib/cashflow/index.ts` to expose `calculateCashflow`

**Checkpoint**: Basic 30-day projection with dual scenarios works for monthly payments

---

## Phase 4: User Story 3 - Handle Payment Frequencies (Priority: P2)

**Goal**: Correctly calculate weekly, biweekly, and monthly payments so projections accurately reflect actual payment schedules

**Independent Test**: Configure income with each frequency type and verify payments occur on the correct days within a projection period

### Implementation for User Story 3

- [X] T017 [P] [US3] Create frequency handler module at `src/lib/cashflow/frequencies.ts` with type definitions for frequency calculations
- [X] T018 [US3] Implement monthly frequency handler with day-of-month matching in `src/lib/cashflow/frequencies.ts`
- [X] T019 [US3] Implement biweekly frequency handler (every 14 days from first occurrence) in `src/lib/cashflow/frequencies.ts`
- [X] T020 [US3] Implement weekly frequency handler (every 7 days from first occurrence) in `src/lib/cashflow/frequencies.ts`
- [X] T021 [US3] Refactor income event creation to use frequency handlers module (replaces inline monthly logic from T011) in `src/lib/cashflow/calculate.ts`
- [X] T022 [US3] Track first occurrence per income source for biweekly/weekly calculations in `src/lib/cashflow/calculate.ts`

**Checkpoint**: All three frequency types (weekly, biweekly, monthly) work correctly

---

## Phase 5: User Story 4 - Detect Danger Days (Priority: P2)

**Goal**: Identify and flag days when projected balance goes negative

**Independent Test**: Create a scenario where expenses exceed income and verify danger days are correctly identified with dates and deficit amounts for both scenarios

### Implementation for User Story 4

- [X] T023 [US4] Implement danger day detection (balance < 0) in daily snapshot creation in `src/lib/cashflow/calculate.ts`
- [X] T024 [US4] Add `isOptimisticDanger` and `isPessimisticDanger` flags to each `DailySnapshot` in `src/lib/cashflow/calculate.ts`
- [X] T025 [US4] Implement `DangerDay` array collection for each scenario in `src/lib/cashflow/calculate.ts`
- [X] T026 [US4] Add `dangerDays` and `dangerDayCount` to `ScenarioSummary` in `src/lib/cashflow/calculate.ts`

**Checkpoint**: Danger days are tracked separately for optimistic and pessimistic scenarios

---

## Phase 6: User Story 5 - Handle Month-End Edge Cases (Priority: P3)

**Goal**: Correctly handle payments on days 29, 30, 31 for months with fewer days

**Independent Test**: Configure a payment on day 31 and project through February to verify it falls on the last day of that month

### Implementation for User Story 5

- [X] T027 [US5] Implement `getEffectiveDay` helper using `Math.min(paymentDay, daysInMonth)` in `src/lib/cashflow/frequencies.ts`
- [X] T028 [US5] Integrate month-end handling into monthly frequency handler in `src/lib/cashflow/frequencies.ts`
- [X] T029 [US5] Handle leap year edge case for February 29th payments in `src/lib/cashflow/frequencies.ts`
- [X] T030 [US5] Update expense event creation to use effective day calculation in `src/lib/cashflow/calculate.ts`

**Checkpoint**: Month-end edge cases work correctly for all months including February

---

## Phase 7: User Story 6 - Generate Summary Statistics (Priority: P3)

**Goal**: Provide aggregated summary statistics alongside daily projection

**Independent Test**: Generate a projection and verify the summary object contains accurate totals that match the sum of daily events

**Note**: Summary generation is implemented in T015 (`ScenarioSummary` generation). This phase focuses on validation and ensuring correctness.

### Validation for User Story 6

- [X] T031 [US6] [VALIDATE] Write test asserting `ScenarioSummary.totalIncome` accumulates correctly from all income events in `src/lib/cashflow/calculate.test.ts`
- [X] T032 [US6] [VALIDATE] Write test asserting `ScenarioSummary.totalExpenses` accumulates correctly from all expense events in `src/lib/cashflow/calculate.test.ts`
- [X] T033 [US6] [VALIDATE] Write test asserting `ScenarioSummary.endBalance` equals final day's balance in `src/lib/cashflow/calculate.test.ts`
- [X] T034 [US6] [VALIDATE] Add runtime assertion in `calculateCashflow` to verify totals match sum of daily events (debug mode only) in `src/lib/cashflow/calculate.ts`

**Checkpoint**: Summary statistics are accurate and match daily calculations

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T035 Validate all edge cases from spec.md (0 days projection, no accounts, no income, inactive entities) in `src/lib/cashflow/calculate.ts`
- [X] T036 [P] Verify performance target (< 100ms for 100 entities, 30-day projection) with manual testing
- [X] T037 [P] Ensure all functions are pure (no side effects, no input mutation) - code review pass
- [X] T038 Run quickstart.md validation scenarios manually to verify engine works as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1/2 (Phase 3)**: Depends on Foundational - MVP milestone
- **US3 (Phase 4)**: Depends on US1/2 (extends income event creation)
- **US4 (Phase 5)**: Can start after US1/2 (adds danger tracking to existing snapshots)
- **US5 (Phase 6)**: Can start after US3 (extends frequency handlers)
- **US6 (Phase 7)**: Can start after US1/2 (enhances existing summaries)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS ALL)
    ↓
Phase 3: US1/2 - Basic Projection + Dual Scenarios (MVP) ←─────────┐
    ↓                                                              │
    ├──→ Phase 4: US3 - Payment Frequencies                        │
    │        ↓                                                     │
    │    Phase 6: US5 - Month-End Edge Cases                       │
    │                                                              │
    ├──→ Phase 5: US4 - Danger Days (can parallel with US3)        │
    │                                                              │
    └──→ Phase 7: US6 - Summary Statistics (can parallel with US3) │
                                                                   │
Phase 8: Polish ←──────────────────────────────────────────────────┘
```

### Within Each User Story

- Foundational infrastructure before story-specific code
- Core logic before integration
- Validation and error handling integrated throughout
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003 and T004 can run in parallel

**Phase 2 (Foundational)**:
- T006 and T007 can run in parallel

**Phase 3 (US1/2)**:
- T011, T012, T013 can run in parallel (different event types)

**Phase 4 (US3)**:
- T017 can start immediately (creates module)
- T018, T019, T020 can run in parallel (different frequency handlers)

**After Phase 3 completes**:
- Phase 4 (US3), Phase 5 (US4), and Phase 7 (US6) can start in parallel

**Phase 8 (Polish)**:
- T036 and T037 can run in parallel

---

## Parallel Example: After MVP (Phase 3)

```bash
# After US1/2 MVP is complete, these can run in parallel:

# Developer A - Frequency Handlers (US3):
Task T017: "Create frequency handler module at src/lib/cashflow/frequencies.ts"
Task T018: "Implement monthly frequency handler"
Task T019: "Implement biweekly frequency handler"
Task T020: "Implement weekly frequency handler"

# Developer B - Danger Days (US4):
Task T023: "Implement danger day detection in daily snapshot creation"
Task T024: "Add danger flags to DailySnapshot"
Task T025: "Implement DangerDay array collection"

# Developer C - Summary Statistics (US6):
Task T031: "Verify totalIncome accumulates correctly"
Task T032: "Verify totalExpenses accumulates correctly"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Stories 1 & 2
4. **STOP and VALIDATE**: Test basic projection with dual scenarios
5. Deploy/demo if ready - this provides core value

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1/2 → Test independently → **MVP Ready!**
3. Add US3 (Frequencies) → Test independently → Enhanced accuracy
4. Add US4 (Danger Days) → Test independently → Risk visibility
5. Add US5 (Month-End) → Test independently → Edge case reliability
6. Add US6 (Summaries) → Test independently → Better UX
7. Polish → Production ready

### Single Developer Strategy (Recommended)

Execute phases sequentially in priority order:
1. Phase 1 → Phase 2 → Phase 3 (MVP)
2. Phase 4 → Phase 6 (Frequency path)
3. Phase 5 (Danger days)
4. Phase 7 (Summaries)
5. Phase 8 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All monetary values are in cents (integer arithmetic)
- Engine is stateless - pure functions only
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

