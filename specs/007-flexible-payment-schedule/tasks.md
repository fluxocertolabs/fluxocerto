# Tasks: Flexible Payment Schedule

**Input**: Design documents from `/specs/007-flexible-payment-schedule/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested in feature specification - test tasks excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- Paths follow existing project structure from plan.md

---

## Phase 1: Setup (Schema & Type Definitions)

**Purpose**: Define the new data types and update database schema

**File Context**: `src/types/index.ts` currently has 88 lines. Add new types after line 37 (after existing Project types, before FixedExpense).

- [X] T001 Add PaymentSchedule union type schemas (DayOfWeekScheduleSchema, DayOfMonthScheduleSchema, TwiceMonthlyScheduleSchema, PaymentScheduleSchema) in src/types/index.ts — insert after line 37, before FixedExpense section
- [X] T002 Add validateFrequencyScheduleMatch helper function in src/types/index.ts — insert after PaymentSchedule types from T001
- [X] T003 Update FrequencySchema to include 'twice-monthly' option in src/types/index.ts — modify existing ProjectInputSchema.frequency enum at line 25
- [X] T004 Update ProjectInputSchema to use paymentSchedule field with frequency-schedule validation refinement in src/types/index.ts — modify lines 21-28
- [X] T005 Update ProjectSchema to include optional legacy paymentDay field for backward compatibility in src/types/index.ts — modify lines 30-34
- [X] T006 Add Dexie version 3 migration with frequency index in src/db/index.ts — current version is 2, add version(3) after line 30

---

## Phase 2: Foundational (Cashflow Engine Updates)

**Purpose**: Core frequency logic that MUST be complete before form UI can be tested

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create isDayOfWeekPaymentDue function using getISODay from date-fns in src/lib/cashflow/frequencies.ts
- [X] T008 [P] Create isTwiceMonthlyPaymentDue function with month-end handling in src/lib/cashflow/frequencies.ts
- [X] T009 Update createIncomeEvents to read from paymentSchedule instead of paymentDay in src/lib/cashflow/calculate.ts
- [X] T010 Update weekly frequency handler to use isDayOfWeekPaymentDue in src/lib/cashflow/calculate.ts
- [X] T011 Update biweekly frequency handler to use isDayOfWeekPaymentDue in src/lib/cashflow/calculate.ts (FR-008: biweekly uses day-of-week, consistent with weekly)
- [X] T012 Add twice-monthly frequency handler using isTwiceMonthlyPaymentDue in src/lib/cashflow/calculate.ts
- [X] T013 Add backward compatibility fallback for legacy paymentDay field in src/lib/cashflow/calculate.ts

**Checkpoint**: Cashflow engine ready - form implementation can now begin

---

## Phase 3: User Story 4 - Dynamic Form Adaptation Based on Frequency (Priority: P1) 🎯 MVP Core

**Goal**: Form dynamically updates input controls when frequency changes

**Independent Test**: Change frequency dropdown and observe payment day input updating in real-time without page reload

**Why First**: This is the core UX mechanism that enables all other user stories. Without dynamic form adaptation, users cannot configure different frequency types.

### Implementation for User Story 4

- [X] T014 [US4] Create WEEKDAYS constant array with ISO 8601 values (1-7) and labels in src/components/manage/projects/project-form.tsx
- [X] T015 [US4] Create DayOfWeekSelect component for weekly/biweekly frequencies in src/components/manage/projects/project-form.tsx
- [X] T016 [US4] Create TwiceMonthlyInput component with two day-of-month fields in src/components/manage/projects/project-form.tsx
- [X] T017 [US4] Update frequency dropdown to show options in order: Weekly, Biweekly, Twice a month, Monthly in src/components/manage/projects/project-form.tsx
- [X] T018 [US4] Add conditional rendering logic to switch payment day input based on frequency selection in src/components/manage/projects/project-form.tsx
- [X] T019 [US4] Implement schedule clearing when frequency changes to prevent invalid data combinations in src/components/manage/projects/project-form.tsx
- [X] T020 [US4] Update form state to use paymentSchedule object instead of paymentDay number in src/components/manage/projects/project-form.tsx
- [X] T021 [US4] Update form submission to construct correct PaymentSchedule based on frequency in src/components/manage/projects/project-form.tsx

**Checkpoint**: Form dynamically adapts to frequency selection - ready for frequency-specific testing

---

## Phase 4: User Story 1 - Configure Weekly Payment on a Specific Day of Week (Priority: P1)

**Goal**: Users can set payment day as day-of-week for weekly income

**Independent Test**: Create project with weekly frequency, select Friday, verify cashflow shows payments on Fridays

### Implementation for User Story 1

- [X] T022 [US1] Wire DayOfWeekSelect to form state for weekly frequency in src/components/manage/projects/project-form.tsx
- [X] T023 [US1] Add convertLegacyPaymentDay helper for weekly projects with old day-of-month data in src/components/manage/projects/project-form.tsx
- [X] T024 [US1] Implement auto-selection of default weekday when editing legacy weekly project in src/components/manage/projects/project-form.tsx

**Checkpoint**: Weekly payment configuration fully functional — verify in T033

---

## Phase 5: User Story 2 - Configure Monthly Payment on a Specific Day of Month (Priority: P1)

**Goal**: Users can set payment day as day-of-month for monthly income (existing behavior preserved)

**Independent Test**: Create project with monthly frequency, select 15th, verify payments appear on 15th of each month

### Implementation for User Story 2

- [X] T025 [US2] Wire existing DayOfMonthInput to form state for monthly frequency in src/components/manage/projects/project-form.tsx
- [X] T026 [US2] Ensure month-end handling works for day 31 in shorter months (verify existing getEffectiveDay logic)
- [X] T027 [US2] Verify existing monthly projects continue to work without re-configuration (backward compatibility test)

**Checkpoint**: Monthly payment configuration works (existing behavior preserved) — verify in T033

---

## Phase 6: User Story 3 - Configure Twice a Month Payment (Priority: P2)

**Goal**: Users can specify two payment days per month

**Independent Test**: Create project with "Twice a month" frequency, select 1st and 15th, verify both days appear in projections

### Implementation for User Story 3

- [X] T028 [US3] Wire TwiceMonthlyInput to form state for twice-monthly frequency in src/components/manage/projects/project-form.tsx
- [X] T029 [US3] Add inline validation error for same-day selection ("Both payment days must be different") in src/components/manage/projects/project-form.tsx
- [X] T030 [US3] Verify month-end handling for day 31 in shorter months for twice-monthly (February edge case)

**Checkpoint**: All frequency types fully functional — verify in T033

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T031 [P] Verify form input type changes within 100ms of frequency selection (SC-004 performance requirement) — use browser DevTools Performance tab
- [X] T032 [P] Verify all frequency types persist correctly to IndexedDB (FR-009) — create project for each frequency, refresh page, verify data loads
- [X] T033 Verify cashflow recalculates correctly for all frequency types (FR-010) — consolidated verification for weekly/monthly/twice-monthly edge cases
- [X] T034 Run quickstart.md validation checklist
- [X] T035 Final TypeScript compilation check (pnpm typecheck)
- [X] T036 Final lint check (pnpm lint) — pre-existing lint errors in unrelated files, our changes are lint-free

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 4 (Phase 3)**: Depends on Foundational - must be done first as it enables all other stories
- **User Stories 1, 2 (Phases 4, 5)**: Depend on User Story 4 - can proceed in parallel after US4
- **User Story 3 (Phase 6)**: Depends on User Story 4 - can proceed in parallel with US1/US2
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 4 (P1)**: Core mechanism - MUST be completed first
- **User Story 1 (P1)**: Depends on US4 for form infrastructure
- **User Story 2 (P1)**: Depends on US4 for form infrastructure
- **User Story 3 (P2)**: Depends on US4 for form infrastructure

### Within Each User Story

- Form components before wiring to state
- State management before submission logic
- Implementation before manual verification

### Parallel Opportunities

- T007, T008 can run in parallel (different functions in same file)
- T031, T032 can run in parallel (different verification concerns)
- After US4 completion: US1, US2, US3 can theoretically run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch these together (different functions, no dependencies):
Task T007: "Create isDayOfWeekPaymentDue function"
Task T008: "Create isTwiceMonthlyPaymentDue function"
```

## Parallel Example: After User Story 4

```bash
# Once US4 is complete, these can proceed in parallel:
Phase 4 (US1): Weekly payment configuration
Phase 5 (US2): Monthly payment configuration  
Phase 6 (US3): Twice-monthly payment configuration
```

---

## Implementation Strategy

### MVP First (User Stories 4 + 1 + 2)

1. Complete Phase 1: Setup (type definitions)
2. Complete Phase 2: Foundational (cashflow engine)
3. Complete Phase 3: User Story 4 (dynamic form)
4. Complete Phase 4: User Story 1 (weekly)
5. Complete Phase 5: User Story 2 (monthly - mostly verification)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy/demo if ready

### Full Delivery

1. Complete MVP (above)
2. Add Phase 6: User Story 3 (twice-monthly)
3. Complete Phase 7: Polish
4. Final validation against quickstart.md checklist

### Key Files Modified

| File | Changes |
|------|---------|
| `src/types/index.ts` | PaymentSchedule union type, updated Project schema |
| `src/db/index.ts` | Dexie version 3 migration |
| `src/lib/cashflow/frequencies.ts` | New frequency handler functions |
| `src/lib/cashflow/calculate.ts` | Updated to use PaymentSchedule |
| `src/components/manage/projects/project-form.tsx` | Dynamic form inputs |

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No test tasks included (not explicitly requested in spec)
- Biweekly day-of-week support (FR-008) is handled in T011 (Phase 2) alongside weekly
- Total tasks: 36 (T001-T036)

