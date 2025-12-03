# Tasks: Historical Projection Snapshots

**Input**: Design documents from `/specs/025-projection-snapshots/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: E2E tests included in Polish phase (per plan.md testing requirements).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths assume single SPA structure per plan.md

---

## Phase 1: Setup (Database & Types)

**Purpose**: Database schema and TypeScript type definitions

- [ ] T001 Create database migration in `supabase/migrations/20251203000000_projection_snapshots.sql` with table, index, and RLS policies per data-model.md
- [ ] T002 Apply migration to local Supabase (`pnpm db:reset` or `pnpm db:push`)
- [ ] T003 [P] Create TypeScript types in `src/types/snapshot.ts` per data-model.md (ProjectionSnapshot, SnapshotInputState, SnapshotData, SnapshotListItem, SnapshotSummaryMetrics, SnapshotInputSchema)
- [ ] T004 [P] Export snapshot types from `src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create schema version utility in `src/lib/snapshots/schema-version.ts` that re-exports `CURRENT_SCHEMA_VERSION` from `src/types/snapshot.ts` (constant defined there per data-model.md)
- [ ] T006 [P] Create barrel export in `src/lib/snapshots/index.ts`
- [ ] T007 Implement snapshots Zustand store in `src/stores/snapshots-store.ts` per contracts/snapshots-store.md (state: snapshots, currentSnapshot, isLoading, error; actions: fetchSnapshots, fetchSnapshot, createSnapshot, deleteSnapshot, clearError)
- [ ] T007b [P] Write unit tests in `tests/unit/stores/snapshots-store.test.ts` covering fetchSnapshots, fetchSnapshot, createSnapshot, deleteSnapshot with mocked Supabase client
- [ ] T008 Export helper functions from `src/hooks/use-cashflow-projection.ts`: transformToChartData, getDangerRanges, and add transformToSummaryStats export (verify function exists; create if missing)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Save Current Projection as Snapshot (Priority: P1) 🎯 MVP

**Goal**: Enable users to save the current projection state with a name for later comparison

**Independent Test**: Navigate to dashboard → Click "Salvar Snapshot" → Enter name → Verify toast success and snapshot appears in history

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create snapshots component barrel export in `src/components/snapshots/index.ts`
- [ ] T010 [US1] Create SaveSnapshotDialog component in `src/components/snapshots/save-snapshot-dialog.tsx` with name input (default: current date in Portuguese format), save/cancel buttons, loading state, and `SnapshotInputSchema` Zod validation from `src/types/snapshot.ts`
- [ ] T011 [US1] Add "Salvar Snapshot" button to dashboard in `src/pages/dashboard.tsx` that opens SaveSnapshotDialog and passes current projection + finance data to createSnapshot
- [ ] T012 [US1] Add toast notifications for save success/error in SaveSnapshotDialog

**Checkpoint**: User Story 1 complete - users can save snapshots from dashboard

---

## Phase 4: User Story 2 - View Snapshot History (Priority: P2)

**Goal**: Display list of all saved snapshots with summary metrics

**Independent Test**: Navigate to /history → Verify saved snapshots appear sorted by date (newest first) with name, date, starting balance, end balance, danger days

### Implementation for User Story 2

- [ ] T013 [P] [US2] Create SnapshotCard component in `src/components/snapshots/snapshot-card.tsx` displaying name, createdAt, and summaryMetrics (startingBalance, endBalanceOptimistic, dangerDayCount)
- [ ] T014 [P] [US2] Create SnapshotEmptyState component in `src/components/snapshots/snapshot-empty-state.tsx` explaining how to save snapshots
- [ ] T015 [US2] Create SnapshotList component in `src/components/snapshots/snapshot-list.tsx` using SnapshotCard and SnapshotEmptyState
- [ ] T016 [US2] Create History page in `src/pages/history.tsx` using SnapshotList and calling fetchSnapshots on mount
- [ ] T017 [US2] Add routes for `/history` and `/history/:snapshotId` in `src/App.tsx` following existing protected route pattern from research.md
- [ ] T018 [US2] Add "Histórico" navigation link to header in `src/components/layout/header.tsx`

**Checkpoint**: User Story 2 complete - users can browse snapshot history

---

## Phase 5: User Story 3 - View Individual Snapshot Details (Priority: P3)

**Goal**: Render full projection chart and summary cards from frozen snapshot data

**Independent Test**: Click snapshot from history → Verify chart and summary panels render with frozen data → Verify "Historical Snapshot" read-only indicator → Verify back navigation works

### Implementation for User Story 3

- [ ] T019 [US3] Create useSnapshotProjection hook in `src/hooks/use-snapshot-projection.ts` that transforms frozen snapshot data using exported helpers (transformToChartData, getDangerRanges, transformToSummaryStats). Handle schema version checks per research.md: render current version directly, older versions with best-effort/defaults.
- [ ] T020 [US3] Create SnapshotDetailPage in `src/pages/snapshot-detail.tsx` using useSnapshotProjection, CashflowChart, and SummaryPanel. Include "Snapshot Histórico" banner at page top with snapshot name and formatted createdAt date. Visual treatment: muted background color + info icon to clearly indicate read-only historical data.
- [ ] T021 [US3] Add "Voltar" back navigation button to SnapshotDetailPage
- [ ] T022 [US3] Handle Date serialization in useSnapshotProjection (JSON stores dates as strings, need parsing)

**Checkpoint**: User Story 3 complete - users can view full snapshot details with chart visualization

---

## Phase 6: User Story 4 - Delete Snapshot (Priority: P4)

**Goal**: Allow users to delete snapshots with confirmation

**Independent Test**: Click delete on snapshot → Confirm in dialog → Verify snapshot removed from list

### Implementation for User Story 4

- [ ] T023 [US4] Add delete button with confirmation dialog to SnapshotCard in `src/components/snapshots/snapshot-card.tsx`
- [ ] T024 [US4] Add delete button with confirmation dialog to SnapshotDetailPage in `src/pages/snapshot-detail.tsx`
- [ ] T025 [US4] Add toast notifications for delete success/error

**Checkpoint**: User Story 4 complete - users can manage their snapshot history

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end testing and final validation

- [ ] T026 [P] Create E2E test file in `tests/e2e/snapshots.spec.ts` testing: save snapshot from dashboard, view history list, open snapshot detail, delete snapshot
- [ ] T026b [P] Add E2E test case for 365-day projection snapshot (save, load, verify data integrity) per SC-006
- [ ] T027 Run all E2E tests and fix any failures
- [ ] T028 Run quickstart.md verification checklist (migration, RLS, performance, navigation)
- [ ] T028b Performance validation per success criteria: measure save operation (<3s per SC-001), history page load with 50 snapshots (<2s per SC-002), detail view render (<2s per SC-003). Use browser DevTools or Playwright timing assertions.
- [ ] T029 Manual testing of complete flow per quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3 → P4)
  - US2 slightly depends on US1 (needs snapshots to display)
  - US3 depends on US2 (navigates from history)
  - US4 can run in parallel with US3 (different functionality)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies
- **User Story 2 (P2)**: Can start after US1 - needs saved snapshots to display (though empty state works without)
- **User Story 3 (P3)**: Can start after US2 - needs history page navigation
- **User Story 4 (P4)**: Can start after US2 - adds delete to existing components

### Within Each User Story

- Components before pages
- Pages before route integration
- Core implementation before polish (toasts, edge cases)

### Parallel Opportunities

- T003, T004 can run in parallel (different type files)
- T005, T006 can run in parallel (different lib files)
- T007, T007b can run in parallel (store implementation + tests)
- T009, T010 can run in parallel with setup
- T013, T014 can run in parallel (different components)
- T023, T024 can run in parallel (different files for delete)
- T026, T026b can run in parallel (different E2E test scenarios)
- T028, T028b can run in parallel (different verification types)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch these together after T001, T002:
Task T003: "Create TypeScript types in src/types/snapshot.ts"
Task T004: "Export snapshot types from src/types/index.ts"
```

## Parallel Example: User Story 2

```bash
# Launch these together:
Task T013: "Create SnapshotCard component in src/components/snapshots/snapshot-card.tsx"
Task T014: "Create SnapshotEmptyState component in src/components/snapshots/snapshot-empty-state.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database + types)
2. Complete Phase 2: Foundational (store + helpers)
3. Complete Phase 3: User Story 1 (save snapshot)
4. **STOP and VALIDATE**: Test save functionality independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test save → Deploy (MVP!)
3. Add User Story 2 → Test history list → Deploy
4. Add User Story 3 → Test detail view → Deploy
5. Add User Story 4 → Test delete → Deploy
6. Polish phase → Full E2E coverage

### Recommended Single Developer Flow

1. Phase 1: Setup (~1 hour)
2. Phase 2: Foundational (~2 hours)
3. Phase 3: US1 Save (~2 hours) → **MVP checkpoint**
4. Phase 4: US2 History (~3 hours)
5. Phase 5: US3 Details (~2 hours)
6. Phase 6: US4 Delete (~1 hour)
7. Phase 7: Polish (~2 hours)

**Total estimated time**: 2-3 days (per quickstart.md)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Toast messages in Portuguese per existing app convention (e.g., "Snapshot salvo com sucesso!")
- Date default format should be user-friendly Portuguese (e.g., "3 de dezembro de 2025")

