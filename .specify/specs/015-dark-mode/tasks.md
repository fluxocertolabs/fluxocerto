# Tasks: Dark Mode

**Input**: Design documents from `/specs/015-dark-mode/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not explicitly requested in specification. Skipping test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single SPA**: `src/` at repository root (per plan.md)
- **Migrations**: `supabase/migrations/`
- **Specs**: `specs/015-dark-mode/`

---

## Phase 1: Setup

**Purpose**: Install dependencies and prepare project for dark mode implementation

- [x] T001 Install lucide-react@0.468.0 exactly with `pnpm add lucide-react@0.468.0`
- [x] T002 Copy migration file from specs/015-dark-mode/contracts/004_user_preferences.sql to supabase/migrations/004_user_preferences.sql
- [ ] T003 Run database migration via Supabase CLI or dashboard to create user_preferences table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create theme type definitions in src/types/theme.ts (ThemeValue, ResolvedTheme, ThemeState, Zod schemas)
- [x] T005 [P] Add dark mode CSS variables to src/index.css with @custom-variant and .dark class overrides
- [x] T006 Add smooth transition CSS rules (200ms) for background-color, border-color, and color in src/index.css (depends on T005 - same file)
- [x] T007 Add FOUC prevention inline script to index.html inside `<head>` tag
- [x] T008 Create theme store with Zustand persist middleware in src/stores/theme-store.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Toggle Between Light and Dark Themes (Priority: P1) 🎯 MVP

**Goal**: Users can click a theme toggle in the header to switch between light and dark themes instantly

**Independent Test**: Click the theme toggle in the header and observe the entire UI change to dark colors. Toggle again to return to light mode.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create barrel export file in src/components/theme/index.ts
- [x] T010 [US1] Create ThemeToggle component with Sun/Moon icons in src/components/theme/theme-toggle.tsx
- [x] T011 [US1] Add ThemeToggle to header component in src/components/layout/header.tsx
- [x] T012 [US1] Verify theme toggle switches between light ↔ dark correctly (2-way toggle per FR-002)
- [x] T013 [US1] Verify all UI components (cards, forms, buttons, dialogs) adapt colors correctly in both themes

**Checkpoint**: User Story 1 complete - users can toggle themes and see immediate visual changes

---

## Phase 4: User Story 2 - Theme Preference Syncs Across Devices (Priority: P2)

**Goal**: Theme preference persists in Supabase and syncs when user logs in on different devices

**Independent Test**: Set theme preference on one device, log out, log in on another device and verify theme is automatically applied

### Implementation for User Story 2

- [x] T014 [US2] Create theme service with Supabase operations in src/lib/theme-service.ts (getThemePreference, saveThemePreference, deleteThemePreference)
- [x] T015 [US2] Add useTheme hook with Supabase sync in src/hooks/use-theme.ts
- [x] T016 [US2] Integrate theme sync with auth state changes (fetch preference on login, sync on toggle)
- [x] T017 [US2] Implement optimistic localStorage update with background Supabase sync
- [x] T018 [US2] Add error handling with retry strategy for failed Supabase syncs

**Checkpoint**: User Story 2 complete - theme preferences persist across devices via Supabase

---

## Phase 5: User Story 3 - System Theme Detection for New Users (Priority: P3)

**Goal**: New users without saved preferences see the app in their system's preferred theme

**Independent Test**: Set OS to dark mode, log in as new user (no saved preference), verify app automatically uses dark mode

### Implementation for User Story 3

- [x] T019 [US3] Add system theme detection utility function in src/lib/theme.ts (getSystemTheme)
- [x] T020 [US3] Update theme store to use system preference as initial value when no localStorage exists in src/stores/theme-store.ts
- [x] T021 [US3] Ensure saved preference takes precedence over system preference in initial load logic
- [x] T022 [US3] Verify FOUC prevention script correctly detects system preference

**Checkpoint**: User Story 3 complete - new users see system-appropriate theme on first load

---

## Phase 6: User Story 4 - Smooth Visual Transition (Priority: P4)

**Goal**: Theme transitions are smooth and polished, not jarring

**Independent Test**: Toggle theme and observe colors transition smoothly over ~200ms rather than changing instantly

### Implementation for User Story 4

- [x] T023 [US4] Verify CSS transitions are applied to all relevant properties (background-color, border-color, color)
- [x] T024 [US4] Add .no-transitions class handling to prevent animation on initial page load
- [x] T025 [US4] Ensure rapid theme toggling doesn't cause visual glitches
- [x] T026 [US4] Verify animated elements (loading spinners, charts) continue smoothly during theme transition

**Checkpoint**: User Story 4 complete - theme transitions feel polished and professional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [x] T027 Verify WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text) in both themes
- [x] T028 Verify focus states are clearly visible in both themes
- [x] T029 Ensure theme toggle has proper aria-label in Brazilian Portuguese
- [x] T030 Add INFO level logging for theme changes (per FR-013)
- [x] T031 Run quickstart.md verification checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3 → P4)
  - Or in parallel if team capacity allows
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 toggle component but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances initial load logic, independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - CSS transitions mostly in Foundational, verification tasks

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 2**: T004 and T005 can run in parallel (different files); T006 depends on T005 (same file)
- **Phase 3**: T009 can run in parallel with other prep work
- **Different user stories**: Can be worked on in parallel by different team members after Phase 2

---

## Parallel Example: Foundational Phase

```bash
# Launch parallel tasks:
Task T004: "Create theme type definitions in src/types/theme.ts"
Task T005: "Add dark mode CSS variables to src/index.css"

# Then sequentially:
Task T006: "Add smooth transition CSS rules in src/index.css" (depends on T005 - same file)
Task T007: "Add FOUC prevention script to index.html" (depends on CSS being ready)
Task T008: "Create theme store in src/stores/theme-store.ts" (depends on types T004)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, run migration)
2. Complete Phase 2: Foundational (types, CSS, FOUC script, store)
3. Complete Phase 3: User Story 1 (toggle component, header integration)
4. **STOP and VALIDATE**: Test theme toggle independently
5. Deploy/demo if ready - users can now toggle themes!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test toggle → Deploy (MVP!)
3. Add User Story 2 → Test cross-device sync → Deploy
4. Add User Story 3 → Test system detection → Deploy
5. Add User Story 4 → Test transitions → Deploy
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- lucide-react version 0.468.0 must be pinned exactly per project conventions

