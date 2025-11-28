# Tasks: Investment-Inclusive Balance Line

**Input**: Design documents from `/specs/016-investment-balance-line/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Unit tests added for investment calculation logic per constitution requirements (T008a, T008b).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and shared constants needed by all user stories

- [ ] T001 [P] Add `investmentInclusiveBalance` field to `ChartDataPoint` interface in `src/components/cashflow/types.ts`
- [ ] T002 [P] Add `LineVisibility` interface and `DEFAULT_LINE_VISIBILITY` constant in `src/components/cashflow/types.ts`
- [ ] T003 [P] Add `LegendItem` interface for legend rendering configuration in `src/components/cashflow/types.ts`
- [ ] T004 [P] Add `investmentInclusive` color (exact hex: #06b6d4 - Tailwind cyan-500) to COLORS constant in `src/components/cashflow/cashflow-chart.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core calculation logic that MUST be complete before chart rendering can work

**⚠️ CRITICAL**: User Story 1 depends on this phase being complete

- [ ] T005 Calculate investment total from accounts in `src/hooks/use-cashflow-projection.ts` (filter type='investment', sum balances)
- [ ] T006 Update `transformToChartData()` function to accept `investmentTotal` parameter in `src/hooks/use-cashflow-projection.ts`
- [ ] T007 Add `investmentInclusiveBalance` calculation (pessimisticBalance + investmentTotal) to chart data transformation in `src/hooks/use-cashflow-projection.ts`
- [ ] T008 Update `useCashflowProjection` hook to pass `investmentTotal` to `transformToChartData()` in `src/hooks/use-cashflow-projection.ts`
- [ ] T008a [P] Add unit test for investment total calculation (filter type='investment', sum balances) in `src/hooks/use-cashflow-projection.test.ts`
- [ ] T008b [P] Add unit test for `investmentInclusiveBalance` transformation (pessimisticBalance + investmentTotal) in `src/hooks/use-cashflow-projection.test.ts`

**Checkpoint**: Investment balance calculation ready with test coverage - chart rendering can now proceed

---

## Phase 3: User Story 1 - View Total Balance Including Investments (Priority: P1) 🎯 MVP

**Goal**: Display a third line on the cashflow chart showing total balance including investment accounts (pessimistic + investment totals)

**Independent Test**: View the cashflow chart with at least one investment account and verify a third cyan line appears showing pessimistic balance plus investment totals.

### Implementation for User Story 1

- [ ] T009 [US1] Import `Line` component from recharts in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T010 [US1] Update Y-axis domain calculation to include `investmentInclusiveBalance` for fixed scale in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T011 [US1] Add `Line` component for investment-inclusive balance (cyan stroke-only, no fill) in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T012 [US1] Add investment-inclusive legend item to static legend in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T013 [US1] Add investment-inclusive balance display to tooltip in `src/components/cashflow/chart-tooltip.tsx`

**Checkpoint**: User Story 1 complete - third line visible with legend and tooltip support

---

## Phase 4: User Story 2 - Toggle Chart Line Visibility (Priority: P2)

**Goal**: Allow users to click legend items to hide/show specific chart elements with visual feedback

**Independent Test**: Click any legend item and verify the corresponding chart element toggles visibility with 150ms fade animation.

### Implementation for User Story 2

- [ ] T014 [US2] Create `ChartLegend` component with click handlers in `src/components/cashflow/chart-legend.tsx`
- [ ] T015 [US2] Add `visibility` state using `useState<LineVisibility>` in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T016 [US2] Add `handleToggle` callback function for visibility state updates in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T017 [US2] Replace static legend with `ChartLegend` component in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T018 [US2] Add conditional opacity props to optimistic `Area` component (fillOpacity/strokeOpacity based on visibility) in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T019 [US2] Add conditional opacity props to pessimistic `Area` component in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T020 [US2] Add conditional opacity prop to investment-inclusive `Line` component in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T021 [US2] Add conditional rendering for danger zone `ReferenceLine` and `ReferenceArea` components in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T022 [US2] Add 150ms CSS transition for opacity changes on all chart elements in `src/components/cashflow/cashflow-chart.tsx`
- [ ] T023 [US2] Add visual muting styles (reduced opacity, strikethrough) for hidden items in `src/components/cashflow/chart-legend.tsx`
- [ ] T024 [US2] Update `ChartTooltip` to accept `visibility` prop in `src/components/cashflow/chart-tooltip.tsx`
- [ ] T025 [US2] Add conditional rendering in tooltip based on visibility state in `src/components/cashflow/chart-tooltip.tsx`
- [ ] T026 [US2] Pass `visibility` prop to `ChartTooltip` in `src/components/cashflow/cashflow-chart.tsx`

**Checkpoint**: User Story 2 complete - all legend items toggle visibility with fade animation

---

## Phase 5: User Story 3 - Understand Legend Interactivity (Priority: P3)

**Goal**: Provide clear visual cues that legend items are interactive through cursor changes and tooltips

**Independent Test**: Hover over legend items and observe cursor change to pointer and tooltip appearing with "Clique para ocultar/mostrar".

### Implementation for User Story 3

- [ ] T027 [US3] Add `cursor-pointer` class to legend item buttons in `src/components/cashflow/chart-legend.tsx`
- [ ] T028 [US3] Add hover opacity transition effect to legend items in `src/components/cashflow/chart-legend.tsx`
- [ ] T029 [US3] Add `title` attribute with "Clique para ocultar/mostrar" tooltip in `src/components/cashflow/chart-legend.tsx`

**Checkpoint**: User Story 3 complete - legend interactivity is discoverable through standard UI affordances

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T030 Verify mobile tap-to-toggle functionality at 375px viewport width (Chrome DevTools mobile simulation), confirm tap triggers handleToggle callback and visibility state updates correctly
- [ ] T031 Verify Y-axis scale remains fixed when toggling visibility: toggle all lines off one by one, confirm Y-axis domain min/max values remain unchanged throughout (FR-010)
- [ ] T032 Run quickstart.md manual testing checklist validation
- [ ] T032a Verify investment account balance updates propagate to chart via existing Supabase subscriptions (modify investment account balance in Settings, confirm chart updates without page refresh)
- [ ] T032b Verify toggle state resets on page refresh (FR-008): hide some lines, refresh page, confirm all lines visible again
- [ ] T033 Code cleanup - remove any console.logs or debug code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (needs investment line to exist)
- **User Story 3 (Phase 5)**: Depends on User Story 2 completion (needs legend component to exist)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core feature, MVP
- **User Story 2 (P2)**: Can start after User Story 1 - Requires chart elements to exist for toggling
- **User Story 3 (P3)**: Can start after User Story 2 - Requires legend component to exist for hover states

### Within Each Phase

- Tasks marked [P] can run in parallel (different files)
- Sequential tasks within a phase depend on previous tasks in that phase
- Commit after each task or logical group

### Parallel Opportunities

**Phase 1 - All tasks parallel:**
```
T001 (types.ts - ChartDataPoint)
T002 (types.ts - LineVisibility)
T003 (types.ts - LegendItem)
T004 (cashflow-chart.tsx - COLORS)
```

**Phase 2 - Sequential (same file):**
```
T005 → T006 → T007 → T008 (all in use-cashflow-projection.ts)
```

**Phase 3 - Mostly sequential:**
```
T009 → T010 → T011 → T012 (cashflow-chart.tsx)
T013 (chart-tooltip.tsx - can run parallel after T011)
```

**Phase 4 - Mixed:**
```
T014 (chart-legend.tsx - can start immediately)
T015 → T016 → T017 (cashflow-chart.tsx state setup)
T018, T019, T020, T021, T022 (cashflow-chart.tsx - sequential, same file)
T023 (chart-legend.tsx - after T014)
T024 → T025 (chart-tooltip.tsx - parallel to chart work)
T026 (cashflow-chart.tsx - after T017 and T024)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types and constants)
2. Complete Phase 2: Foundational (investment calculation)
3. Complete Phase 3: User Story 1 (investment line display)
4. **STOP and VALIDATE**: Test with investment accounts, verify third line appears
5. Deploy/demo if ready - core value delivered

### Incremental Delivery

1. Complete Setup + Foundational → Calculation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Interactive legend)
4. Add User Story 3 → Test independently → Deploy/Demo (Discoverability)
5. Each story adds value without breaking previous stories

### Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Setup | 4 | 15 min |
| Foundational | 6 | 45 min |
| User Story 1 | 5 | 45 min |
| User Story 2 | 13 | 90 min |
| User Story 3 | 3 | 15 min |
| Polish | 7 | 45 min |
| **Total** | **38** | **~4.5 hours** |

---

## Files Modified Summary

| File | Phase(s) | Changes |
|------|----------|---------|
| `src/components/cashflow/types.ts` | 1 | Add `investmentInclusiveBalance`, `LineVisibility`, `LegendItem` |
| `src/hooks/use-cashflow-projection.ts` | 2 | Add investment total calculation, update `transformToChartData` |
| `src/components/cashflow/cashflow-chart.tsx` | 1, 3, 4 | Add Line import, COLORS, visibility state, interactive legend |
| `src/components/cashflow/chart-tooltip.tsx` | 3, 4 | Add investment balance display, visibility-based filtering |
| `src/components/cashflow/chart-legend.tsx` | 4, 5 | **NEW FILE**: Interactive legend component |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Y-axis must remain fixed regardless of visibility state (FR-010)
- Use CSS opacity transitions (150ms) for smooth fade animations
- Visibility state is session-only (React useState, not Zustand)

