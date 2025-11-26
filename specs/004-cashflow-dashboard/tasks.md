# Tasks: Cashflow Dashboard

**Input**: Design documents from `/specs/004-cashflow-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅ (N/A - UI-only)

**Tests**: Not requested in specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single SPA project**: `src/` at repository root
- Components: `src/components/cashflow/`
- Pages: `src/pages/`
- Hooks: `src/hooks/`
- Utilities: `src/lib/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install Recharts 3.5.0 dependency with `pnpm add recharts@3.5.0`
- [ ] T002 Create cashflow component directory structure at src/components/cashflow/
- [ ] T003 [P] Create view-layer types in src/components/cashflow/types.ts (ChartDataPoint, DangerRange, SummaryStats) [after T002]
- [ ] T004 [P] Create currency/date formatting utilities in src/lib/format.ts (handle edge cases: large numbers with abbreviations, decimal precision for cents, locale-aware formatting) [after T002]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hook and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create useCashflowProjection hook in src/hooks/use-cashflow-projection.ts
- [ ] T006 Create chart data transformation function (transformToChartData) in src/hooks/use-cashflow-projection.ts
- [ ] T007 Create danger range consolidation function (getDangerRanges) in src/hooks/use-cashflow-projection.ts
- [ ] T008 [P] Create loading skeleton component (FR-009a) with shimmer placeholders matching chart and summary panel shapes in src/components/cashflow/loading-skeleton.tsx
- [ ] T009 [P] Create empty state component in src/components/cashflow/empty-state.tsx
- [ ] T010 [P] Create error state component with inline error message and retry button click handler in src/components/cashflow/error-state.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View 30-Day Cashflow Projection (Priority: P1) 🎯 MVP

**Goal**: Display a chart showing 30-day projected balance with optimistic/pessimistic scenarios

**Independent Test**: Load dashboard with sample financial data, verify chart renders with two distinct scenario lines (green for optimistic, amber for pessimistic) with area fills

### Implementation for User Story 1

- [ ] T011 [US1] Create CashflowChart component structure in src/components/cashflow/cashflow-chart.tsx
- [ ] T012 [US1] Implement gradient definitions for optimistic (green) and pessimistic (amber) areas in src/components/cashflow/cashflow-chart.tsx
- [ ] T013 [US1] Implement AreaChart with dual Area components for both scenarios in src/components/cashflow/cashflow-chart.tsx
- [ ] T014 [US1] Add XAxis (dates) and YAxis (currency) with proper formatting in src/components/cashflow/cashflow-chart.tsx
- [ ] T015 [US1] Add ResponsiveContainer wrapper for responsive sizing in src/components/cashflow/cashflow-chart.tsx
- [ ] T016 [US1] Create Dashboard page with chart integration in src/pages/dashboard.tsx
- [ ] T017 [US1] Wire dashboard to useCashflowProjection hook with loading/empty/error states in src/pages/dashboard.tsx

**Checkpoint**: User Story 1 complete - chart displays 30-day projection with both scenarios

---

## Phase 4: User Story 2 - Identify Danger Days (Priority: P1)

**Goal**: Visually highlight days where projected balance goes negative

**Independent Test**: Create financial data that produces negative balances on specific days, verify those days are highlighted with red shading/reference areas on the chart

### Implementation for User Story 2

- [ ] T018 [US2] Add ReferenceLine at y=0 (zero balance line) in src/components/cashflow/cashflow-chart.tsx
- [ ] T019 [US2] Implement ReferenceArea components for danger day ranges in src/components/cashflow/cashflow-chart.tsx
- [ ] T020 [US2] Add conditional danger styling based on scenario (optimistic vs pessimistic) in src/components/cashflow/cashflow-chart.tsx

**Checkpoint**: User Story 2 complete - danger days are visually highlighted on chart

---

## Phase 5: User Story 3 - View Summary Statistics (Priority: P2)

**Goal**: Display summary panel with key financial metrics (starting balance, income, expenses, ending balance, danger day count)

**Independent Test**: Load dashboard with known financial data, verify each summary statistic displays the correct calculated value

### Implementation for User Story 3

- [ ] T021 [US3] Create SummaryPanel component structure in src/components/cashflow/summary-panel.tsx
- [ ] T022 [US3] Implement starting balance card in src/components/cashflow/summary-panel.tsx
- [ ] T023 [US3] Implement income totals cards (optimistic/pessimistic) in src/components/cashflow/summary-panel.tsx
- [ ] T024 [US3] Implement expense totals card in src/components/cashflow/summary-panel.tsx
- [ ] T025 [US3] Implement ending balance cards (optimistic/pessimistic) in src/components/cashflow/summary-panel.tsx
- [ ] T026 [US3] Implement danger day count indicator with warning styling in src/components/cashflow/summary-panel.tsx
- [ ] T027 [US3] Add responsive grid layout (2 cols mobile, 4 cols desktop) in src/components/cashflow/summary-panel.tsx
- [ ] T028 [US3] Integrate SummaryPanel into Dashboard page in src/pages/dashboard.tsx

**Checkpoint**: User Story 3 complete - summary statistics panel displays all metrics

---

## Phase 6: User Story 4 - Explore Daily Details (Priority: P3)

**Goal**: Show day-level details (income/expense events) when user interacts with chart

**Independent Test**: Hover/tap on specific days in the chart, verify tooltip displays correct date, balances, and income/expense events

### Implementation for User Story 4

- [ ] T029 [US4] Create ChartTooltip component structure in src/components/cashflow/chart-tooltip.tsx
- [ ] T030 [US4] Implement date header formatting in tooltip in src/components/cashflow/chart-tooltip.tsx
- [ ] T031 [US4] Implement optimistic/pessimistic balance display in tooltip in src/components/cashflow/chart-tooltip.tsx
- [ ] T032 [US4] Implement income events list in tooltip in src/components/cashflow/chart-tooltip.tsx
- [ ] T033 [US4] Implement expense events list in tooltip in src/components/cashflow/chart-tooltip.tsx
- [ ] T034 [US4] Handle empty events state (no income/expense on day) in src/components/cashflow/chart-tooltip.tsx
- [ ] T035 [US4] Integrate ChartTooltip with CashflowChart Tooltip component in src/components/cashflow/cashflow-chart.tsx (ensure mobile tap triggers tooltip via Recharts click event)

**Checkpoint**: User Story 4 complete - day details accessible via hover/tap

---

## Phase 6.5: Integration Validation

**Purpose**: Verify data flow integrity from engine to display (FR-011, FR-012, SC-006)

- [ ] T035a [Validation] Verify useCashflowProjection hook correctly retrieves data from Dexie.js via existing hooks (FR-011)
- [ ] T035b [Validation] Verify chart data transformation matches cashflow engine output exactly (FR-012, SC-006)

**Checkpoint**: Data integrity validated - engine calculations match displayed values

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, exports, and validation

- [ ] T036 [P] Create barrel export file in src/components/cashflow/index.ts
- [ ] T037 [P] Add mobile-responsive X-axis label interval in src/components/cashflow/cashflow-chart.tsx
- [ ] T038 [P] Add chart height responsiveness (300px mobile, 400px desktop) in src/components/cashflow/cashflow-chart.tsx
- [ ] T039 Add dashboard route to App.tsx router configuration in src/App.tsx
- [ ] T040 Run quickstart.md validation (manual testing checklist)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority but US2 depends on chart from US1
  - US3 can run in parallel with US1/US2 (different component)
  - US4 depends on chart from US1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates the chart (required by US2, US4)
- **User Story 2 (P1)**: Depends on US1 chart being implemented
- **User Story 3 (P2)**: Can start after Foundational - Independent component (summary-panel.tsx)
- **User Story 4 (P3)**: Depends on US1 chart being implemented

### Within Each User Story

- Component structure before implementation details
- Core functionality before styling/polish
- Integration as final step

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# After T002 completes, these can run in parallel:
Task T003: "Create view-layer types in src/components/cashflow/types.ts" [after T002]
Task T004: "Create currency/date formatting utilities in src/lib/format.ts" [after T002]
```

**Phase 2 (Foundational)**:
```bash
# After T005-T007 complete, these can run in parallel:
Task T008: "Create loading skeleton component"
Task T009: "Create empty state component"
Task T010: "Create error state component"
```

**Phase 3-6 (User Stories)**:
```bash
# US1 and US3 can run in parallel (different files):
# Developer A: T011-T017 (CashflowChart + Dashboard)
# Developer B: T021-T028 (SummaryPanel)

# Once US1 chart exists, US2 and US4 can proceed
```

**Phase 7 (Polish)**:
```bash
# These can all run in parallel:
Task T036: "Create barrel export file"
Task T037: "Add mobile-responsive X-axis label interval"
Task T038: "Add chart height responsiveness"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010)
3. Complete Phase 3: User Story 1 (T011-T017)
4. **STOP and VALIDATE**: Test chart renders with sample data
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test chart → Deploy (MVP!)
3. Add User Story 2 → Test danger highlighting → Deploy
4. Add User Story 3 → Test summary panel → Deploy
5. Add User Story 4 → Test tooltips → Deploy
6. Polish phase → Final validation → Deploy

### Recommended Execution Order

For a single developer working sequentially:

1. **Day 1**: T001-T010 (Setup + Foundational)
2. **Day 2**: T011-T017 (US1 - Chart) + T018-T020 (US2 - Danger Days)
3. **Day 3**: T021-T028 (US3 - Summary Panel)
4. **Day 4**: T029-T035 (US4 - Tooltips) + T036-T040 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All monetary values are stored in cents, displayed in dollars (divide by 100)
- Use existing Dexie hooks (useLiveQuery) for data access
- Use existing cashflow engine (calculateCashflow) for projections
- Color scheme: green (#22c55e) optimistic, amber (#f59e0b) pessimistic, red (#ef4444) danger

