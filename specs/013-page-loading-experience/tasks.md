# Tasks: Page Loading Experience

**Input**: Design documents from `/specs/013-page-loading-experience/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅, contracts/ ✅ (N/A - frontend-only)

**Tests**: No automated test tasks are included in this task list. The "Independent Test" sections below describe manual acceptance criteria for each user story. Implementers should author automated tests as needed based on project standards.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create type definitions and foundational loading infrastructure

- [ ] T001 Create loading state type definitions in `src/types/loading.ts`
- [ ] T002 [P] Create skeleton primitive components in `src/components/loading/skeleton-primitives.tsx`
- [ ] T003 [P] Create `useCoordinatedLoading` hook in `src/hooks/use-coordinated-loading.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core loading wrapper component that ALL pages/modals will use

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create `PageLoadingWrapper` component in `src/components/loading/page-loading-wrapper.tsx`
- [ ] T005 Create `src/components/loading/index.ts` barrel export file

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Smooth Dashboard Loading (Priority: P1) 🎯 MVP

**Goal**: Eliminate flickering on Dashboard page with skeleton placeholders that match the layout exactly, smooth fade transitions, and coordinated loading state management.

**Independent Test**: Navigate to Dashboard page → skeleton appears immediately → data loads → content fades in smoothly without layout shifts or flickering.

### Implementation for User Story 1

- [ ] T006 [US1] Create `DashboardSkeleton` component in `src/components/loading/dashboard-skeleton.tsx`
- [ ] T007 [US1] Integrate `useCoordinatedLoading` and `PageLoadingWrapper` into `src/pages/dashboard.tsx`
- [ ] T008 [US1] Verify Dashboard skeleton matches actual content layout (zero CLS)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Smooth Manage Page Loading (Priority: P2)

**Goal**: Apply the same polished loading experience to the Manage (Gerenciar) page with appropriate skeleton matching the income/expense configuration layout.

**Independent Test**: Navigate to Manage page → skeleton appears immediately → data loads → content fades in smoothly without flickering.

### Implementation for User Story 2

- [ ] T009 [US2] Create `ManageSkeleton` component in `src/components/loading/manage-skeleton.tsx`
- [ ] T010 [US2] Integrate `useCoordinatedLoading` and `PageLoadingWrapper` into `src/pages/manage.tsx`
- [ ] T011 [US2] Verify Manage skeleton matches actual content layout (zero CLS)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Quick Update Modal Loading (Priority: P3)

**Goal**: Provide smooth loading feedback within the Quick Update modal when data is being prepared.

**Independent Test**: Open Quick Update modal → if data is loading, skeleton appears → content fades in smoothly when ready.

### Implementation for User Story 3

- [ ] T012 [US3] Create `ModalSkeleton` component in `src/components/loading/modal-skeleton.tsx`
- [ ] T013 [US3] Integrate loading states into `src/components/quick-update/quick-update-view.tsx`
- [ ] T014 [US3] Verify modal skeleton matches actual modal content layout

**Checkpoint**: User Stories 1, 2, and 3 should all work independently

---

## Phase 6: User Story 4 - Graceful Error Handling (Priority: P4)

**Goal**: Ensure error states only appear after genuine errors or 5-second timeout, never during normal loading periods.

**Independent Test**: Simulate slow network (0-5s) → skeleton continues → simulate timeout (>5s) → error state appears with retry option.

### Implementation for User Story 4

- [ ] T015 [US4] Verify timeout logic in `useCoordinatedLoading` hook (5-second threshold)
- [ ] T016 [US4] Verify error state integration with existing `ErrorState` component in `src/components/cashflow/error-state.tsx`
- [ ] T017 [US4] Test retry mechanism works across all pages and modal

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, consolidation, and validation

- [ ] T018 [P] Evaluate deprecation of existing `src/components/cashflow/loading-skeleton.tsx` (consolidate with new `DashboardSkeleton`)
- [ ] T019 [P] Add development-only console logging for load times (conditional on `import.meta.env.DEV`)
- [ ] T020 Manual CLS testing across all pages with slow network throttling
- [ ] T021 Screen reader testing for ARIA live region announcements
- [ ] T022 Run quickstart.md validation checklist

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P4)**: Depends on at least one page integration (US1, US2, or US3) to test error handling

### Within Each User Story

- Skeleton component before page integration
- Page integration before layout verification
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- Once Foundational phase completes, US1, US2, US3 can start in parallel
- T018 and T019 can run in parallel (different concerns)

---

## Parallel Example: Setup Phase

```bash
# Launch parallel tasks in Setup phase:
Task T002: "Create skeleton primitive components in src/components/loading/skeleton-primitives.tsx"
Task T003: "Create useCoordinatedLoading hook in src/hooks/use-coordinated-loading.ts"
```

## Parallel Example: User Stories (After Foundational)

```bash
# Launch user stories in parallel (if team capacity allows):
Developer A: User Story 1 (T006-T008) - Dashboard
Developer B: User Story 2 (T009-T011) - Manage Page
Developer C: User Story 3 (T012-T014) - Quick Update Modal
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T008)
4. **STOP and VALIDATE**: Test Dashboard loading independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test error handling → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Dashboard)
   - Developer B: User Story 2 (Manage Page)
   - Developer C: User Story 3 (Quick Update Modal)
3. Stories complete and integrate independently
4. Final developer handles User Story 4 (Error Handling) and Polish

---

## File Summary

| File Path | Task(s) | Status |
|-----------|---------|--------|
| `src/types/loading.ts` | T001 | NEW |
| `src/components/loading/skeleton-primitives.tsx` | T002 | NEW |
| `src/hooks/use-coordinated-loading.ts` | T003 | NEW |
| `src/components/loading/page-loading-wrapper.tsx` | T004 | NEW |
| `src/components/loading/index.ts` | T005 | NEW |
| `src/components/loading/dashboard-skeleton.tsx` | T006 | NEW |
| `src/pages/dashboard.tsx` | T007 | MODIFY |
| `src/components/loading/manage-skeleton.tsx` | T009 | NEW |
| `src/pages/manage.tsx` | T010 | MODIFY |
| `src/components/loading/modal-skeleton.tsx` | T012 | NEW |
| `src/components/quick-update/quick-update-view.tsx` | T013 | MODIFY |
| `src/components/cashflow/loading-skeleton.tsx` | T018 | EVALUATE |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- This is a frontend-only feature - no API contracts or database changes
- All transitions use CSS opacity fade (250ms) for GPU-accelerated performance
- ARIA live regions use `polite` announcements to avoid interrupting screen readers

