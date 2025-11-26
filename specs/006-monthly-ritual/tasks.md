# Tasks: Monthly Ritual Enhancement

**Input**: Design documents from `/specs/006-monthly-ritual/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (React SPA with Vite)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema migration and type definitions required by all user stories

- [ ] T001 Add `balanceUpdatedAt` optional field to `BankAccountSchema` in src/types/index.ts
- [ ] T002 Add `balanceUpdatedAt` optional field to `CreditCardSchema` in src/types/index.ts
- [ ] T003 Add `ProjectionDays` type (`7 | 14 | 30 | 60 | 90`) to src/types/index.ts
- [ ] T004 Add database version 2 migration for `balanceUpdatedAt` fields in src/db/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core stores and utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create preferences store with `projectionDays` state and localStorage persistence in src/stores/preferences-store.ts
- [ ] T006 [P] Create staleness utility functions (`isStale`, `STALE_THRESHOLD_DAYS`) in src/lib/staleness.ts
- [ ] T007 [P] Add `updateAccountBalance` action (sets balance + balanceUpdatedAt) to src/stores/finance-store.ts
- [ ] T008 [P] Add `updateCreditCardBalance` action (sets statementBalance + balanceUpdatedAt) to src/stores/finance-store.ts
- [ ] T009 Modify `useCashflowProjection` hook to accept optional `projectionDays` parameter in src/hooks/use-cashflow-projection.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Balance Update Mode (Priority: P1) 🎯 MVP

**Goal**: A dedicated focused view showing all bank accounts and credit cards with inline editing, auto-save on blur, and Tab navigation for rapid sequential entry

**Independent Test**: Open Quick Balance Update view, enter new balance values for accounts and credit cards, verify all values are saved correctly with `balanceUpdatedAt` timestamps

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create barrel export file in src/components/quick-update/index.ts
- [ ] T011 [P] [US1] Create `BalanceItem` union type and `BalanceFieldState` interface in src/components/quick-update/types.ts
- [ ] T012 [US1] Create `BalanceListItem` component with inline editing, auto-save on blur, and error display in src/components/quick-update/balance-list-item.tsx
- [ ] T013 [US1] Create `BalanceList` component rendering accounts and credit cards with Tab navigation in src/components/quick-update/balance-list.tsx
- [ ] T014 [P] [US1] Create `QuickUpdateEmptyState` component with link to Manage page in src/components/quick-update/empty-state.tsx
- [ ] T015 [US1] Create `QuickUpdateView` full-screen modal with Done/Cancel buttons and Escape key handling in src/components/quick-update/quick-update-view.tsx
- [ ] T016 [US1] Add "Update Balances" button and quick update modal state to src/pages/dashboard.tsx
- [ ] T017 [US1] Wire up `QuickUpdateView` modal rendering in src/pages/dashboard.tsx

**Checkpoint**: User Story 1 is fully functional - users can complete monthly balance updates in under 2 minutes

---

## Phase 4: User Story 2 - Dashboard Health Indicator (Priority: P2)

**Goal**: At-a-glance health status (Good/Warning/Danger) with stale data detection (30+ days) displayed at the top of the dashboard

**Independent Test**: Set up various financial scenarios (healthy, warning, danger, stale data) and verify correct indicator displays with appropriate colors and messages

### Implementation for User Story 2

- [ ] T018 [US2] Create `useHealthIndicator` hook computing status from projection danger days and staleness in src/hooks/use-health-indicator.ts
- [ ] T019 [US2] Create `HealthIndicator` component with Good/Warning/Danger states and stale data badge in src/components/cashflow/health-indicator.tsx
- [ ] T020 [US2] Integrate `HealthIndicator` at top of dashboard (above chart) in src/pages/dashboard.tsx
- [ ] T021 [US2] Wire up stale data badge click to open Quick Balance Update modal in src/pages/dashboard.tsx

**Checkpoint**: User Story 2 is fully functional - users can identify financial health status within 3 seconds of opening dashboard

---

## Phase 5: User Story 3 - Configurable Projection Length (Priority: P3)

**Goal**: Allow users to select projection periods (7/14/30/60/90 days) with preference persisted to localStorage

**Independent Test**: Change projection period and verify chart, calculations, and summary all update correctly; close and reopen app to verify preference is remembered

### Implementation for User Story 3

- [ ] T022 [US3] Create `ProjectionSelector` dropdown component with 7/14/30/60/90 day options in src/components/cashflow/projection-selector.tsx
- [ ] T023 [US3] Integrate `ProjectionSelector` in dashboard header area in src/pages/dashboard.tsx
- [ ] T024 [US3] Connect projection selector to preferences store and cashflow projection hook in src/pages/dashboard.tsx

**Checkpoint**: User Story 3 is fully functional - users can change projection period and see updated results within 2 seconds

---

## Phase 6: User Story 4 - Surplus/Deficit Summary (Priority: P4)

**Goal**: Display net change (end balance - starting balance) for both optimistic and pessimistic scenarios

**Independent Test**: Set up scenarios with positive and negative end balances and verify correct surplus (green) or deficit (red) display for both scenarios

### Implementation for User Story 4

- [ ] T025 [US4] Add surplus calculation (endBalance - startingBalance) to projection summary in src/hooks/use-cashflow-projection.ts
- [ ] T026 [US4] Create `SurplusDeficit` component displaying surplus (green) or deficit (red) for both scenarios in src/components/cashflow/surplus-deficit.tsx
- [ ] T027 [US4] Integrate `SurplusDeficit` component into summary panel in src/components/cashflow/summary-panel.tsx

**Checkpoint**: User Story 4 is fully functional - users can answer "How much can I save this month?" by viewing surplus/deficit

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T028 [P] Verify keyboard Tab navigation works correctly across all balance fields in Quick Update view
- [ ] T029 [P] Verify mobile responsiveness of ProjectionSelector and Quick Update view
- [ ] T030 Run quickstart.md validation scenarios to confirm all success criteria are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses staleness utilities from Phase 2; optionally integrates with US1 (stale click opens Quick Update)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses preferences store from Phase 2
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Extends cashflow projection hook

### Within Each User Story

- Components before integration
- Hooks/utilities before components that use them
- Core implementation before dashboard integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different type definitions)
- T006, T007, T008 can run in parallel (different files)
- T010, T011, T014 can run in parallel (independent components)
- All user stories can be worked on in parallel by different team members after Phase 2

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch all parallel foundational tasks together:
Task T006: "Create staleness utility functions in src/lib/staleness.ts"
Task T007: "Add updateAccountBalance action to src/stores/finance-store.ts"
Task T008: "Add updateCreditCardBalance action to src/stores/finance-store.ts"
```

## Parallel Example: User Story 1 Components

```bash
# Launch all parallel US1 component tasks together:
Task T010: "Create barrel export file in src/components/quick-update/index.ts"
Task T011: "Create BalanceItem union type in src/components/quick-update/types.ts"
Task T014: "Create QuickUpdateEmptyState component in src/components/quick-update/empty-state.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009)
3. Complete Phase 3: User Story 1 (T010-T017)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - users can already complete monthly updates faster

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (adds health visibility)
4. Add User Story 3 → Test independently → Deploy/Demo (adds flexibility)
5. Add User Story 4 → Test independently → Deploy/Demo (adds actionable insight)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Quick Balance Update)
   - Developer B: User Story 2 (Health Indicator)
   - Developer C: User Story 3 (Projection Selector)
   - Developer D: User Story 4 (Surplus/Deficit)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Currency values are stored in cents - convert to dollars only for display
- `balanceUpdatedAt` is optional - undefined means legacy data (treated as stale)
- Quick Balance Update is a modal overlay, not a separate route
- Tab navigation uses native HTML tab order (no custom key handlers)
- Preferences store uses Zustand persist middleware with localStorage
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

