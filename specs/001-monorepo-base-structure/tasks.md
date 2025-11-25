# Tasks: Monorepo Base Structure

**Input**: Design documents from `/specs/001-monorepo-base-structure/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested in specification - skipping test tasks.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single SPA project**: All source files in `src/` at repository root
- **Config files**: Repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize package manager and dependencies

- [x] T001 Create package.json with all dependencies, scripts, engines (node >=20), and packageManager (pnpm@10.12.1) in package.json
- [x] T002 Run pnpm install to generate pnpm-lock.yaml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration files required by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create TypeScript configuration with strict mode in tsconfig.json
- [x] T004 [P] Create TypeScript node configuration for build tools in tsconfig.node.json
- [x] T005 Create Vite configuration with React plugin and path aliases in vite.config.ts
- [x] T006 [P] Create Tailwind CSS v4 configuration in tailwind.config.ts
- [x] T007 [P] Create PostCSS configuration in postcss.config.js
- [x] T008 Create shadcn/ui configuration in components.json
- [x] T009 [P] Create Git exclusion patterns in .gitignore
- [x] T010 Create directory structure with .gitkeep files for src/components/ui/, src/pages/, src/stores/, src/db/, src/types/, public/, docs/

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Developer Quick Start (Priority: P1) 🎯 MVP

**Goal**: Enable `pnpm install && pnpm dev` to start a development server immediately after cloning

**Independent Test**: Run `pnpm dev` and verify server starts on http://localhost:5173 showing "Family Finance" heading

### Implementation for User Story 1

- [x] T011 [US1] Create HTML entry point with root div and Vite module script in index.html
- [x] T012 [P] [US1] Create shadcn/ui utility function cn() in src/lib/utils.ts
- [x] T013 [US1] Create global styles with Tailwind imports and CSS variables in src/index.css
- [x] T014 [US1] Create React entry point with StrictMode in src/main.tsx
- [x] T015 [US1] Create root component with "Family Finance" placeholder in src/App.tsx

**Checkpoint**: `pnpm dev` starts server on port 5173, browser shows placeholder page

---

## Phase 4: User Story 2 - Type-Safe Development Environment (Priority: P2)

**Goal**: Enable TypeScript strict mode with working path aliases for clean imports

**Independent Test**: Run `pnpm typecheck` with zero errors, verify `@/lib/utils` import resolves

### Implementation for User Story 2

- [x] T016 [US2] Add @/ path alias import example in src/App.tsx to verify alias configuration

**Checkpoint**: `pnpm typecheck` passes, @/ imports resolve correctly in IDE and build

---

## Phase 5: User Story 3 - Code Quality Tooling (Priority: P3)

**Goal**: Enable linting with ESLint to catch code quality issues

**Independent Test**: Run `pnpm lint` with zero errors, verify `pnpm lint:fix` auto-corrects issues

### Implementation for User Story 3

- [x] T017 [US3] Create ESLint flat configuration with TypeScript and React rules in eslint.config.js

**Checkpoint**: `pnpm lint` runs without errors on all source files

---

## Phase 6: User Story 4 - Build Pipeline (Priority: P4)

**Goal**: Enable production builds that create deployable artifacts

**Independent Test**: Run `pnpm build` successfully creating dist/ directory, `pnpm preview` serves it

### Implementation for User Story 4

*(Build capability is enabled by vite.config.ts created in Foundational phase)*

- [x] T018 [US4] Verify production build succeeds by running pnpm build and checking dist/ output

**Checkpoint**: `pnpm build` creates dist/ directory, `pnpm preview` serves production build

---

## Phase 7: User Story 5 - Test Infrastructure (Priority: P5)

**Goal**: Enable test execution with Vitest for future unit tests

**Independent Test**: Run `pnpm test` and verify Vitest executes (even with no test files)

### Implementation for User Story 5

- [x] T019 [US5] Create Vitest configuration with jsdom environment in vitest.config.ts
- [x] T020 [P] [US5] Create test setup file for React Testing Library in src/test/setup.ts

**Checkpoint**: `pnpm test` runs Vitest successfully

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [x] T021 Run all quickstart.md verification commands to validate complete setup
- [x] T022 Verify all success criteria from spec.md are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 must complete before US2 (US2 modifies App.tsx created in US1)
  - US3, US4, US5 can run in parallel after Foundational
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ─── BLOCKS ALL STORIES
    ↓
Phase 3 (US1: Dev Quick Start) ← Must complete first
    ↓
Phase 4 (US2: Type Safety) ← Depends on US1 (modifies App.tsx)
    
Phase 5 (US3: Code Quality) ← Can start after Foundational
Phase 6 (US4: Build Pipeline) ← Can start after US1 (needs source files)
Phase 7 (US5: Test Infra) ← Can start after Foundational
    ↓
Phase 8 (Polish) ← After all stories complete
```

### Within Each Phase

- Tasks marked [P] can run in parallel within that phase
- Sequential tasks should complete in order (T001 before T002, etc.)

### Parallel Opportunities

**After Foundational (Phase 2) completes:**
- T017 (US3 ESLint) can start immediately
- T019-T020 (US5 Vitest) can start immediately

**After US1 (Phase 3) completes:**
- T016 (US2 path alias) can start
- T018 (US4 build verify) can start

**Within Foundational:**
- T004, T006, T007, T009 can all run in parallel

**Within US1:**
- T012 can run in parallel with T011

**Within US5:**
- T020 can run in parallel with T019

---

## Parallel Example: Foundational Phase

```bash
# After T003 (tsconfig.json) completes, launch in parallel:
Task T004: "Create TypeScript node configuration in tsconfig.node.json"
Task T006: "Create Tailwind CSS v4 configuration in tailwind.config.ts"
Task T007: "Create PostCSS configuration in postcss.config.js"
Task T009: "Create Git exclusion patterns in .gitignore"
```

---

## Parallel Example: After Foundational

```bash
# After Phase 2 completes, these can start in parallel:
Task T011-T015: US1 (Developer Quick Start)
Task T017: US3 (ESLint config)
Task T019-T020: US5 (Vitest config)

# Note: US2 and US4 must wait for US1 to complete
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T010)
3. Complete Phase 3: User Story 1 (T011-T015)
4. **STOP and VALIDATE**: Run `pnpm dev`, verify server works
5. This is a deployable MVP - dev environment is functional

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Dev Quick Start) → `pnpm dev` works → **MVP!**
3. Add US2 (Type Safety) → `pnpm typecheck` works
4. Add US3 (Code Quality) → `pnpm lint` works
5. Add US4 (Build Pipeline) → `pnpm build` works
6. Add US5 (Test Infra) → `pnpm test` works
7. Polish → All success criteria validated

### Suggested MVP Scope

**Minimum viable setup**: Complete through Phase 3 (US1)
- Developer can clone, install, and run dev server
- All other stories add incremental capabilities

---

## Task Summary

| Phase | Tasks | Parallel Tasks | Story |
|-------|-------|----------------|-------|
| 1. Setup | 2 | 0 | — |
| 2. Foundational | 8 | 4 | — |
| 3. US1 Quick Start | 5 | 1 | US1 |
| 4. US2 Type Safety | 1 | 0 | US2 |
| 5. US3 Code Quality | 1 | 0 | US3 |
| 6. US4 Build | 1 | 0 | US4 |
| 7. US5 Testing | 2 | 1 | US5 |
| 8. Polish | 2 | 0 | — |
| **Total** | **22** | **6** | — |

---

## Notes

- All dependency versions MUST be exact (no `^`, `~`, `*`) per constitution
- Follow kebab-case for file names, PascalCase for components
- Path alias `@/` must be configured in BOTH tsconfig.json AND vite.config.ts
- Tailwind v4 uses CSS-first configuration with `@import "tailwindcss"`
- ESLint 9+ requires flat config format (eslint.config.js, not .eslintrc)
- shadcn/ui requires clsx and tailwind-merge dependencies for cn() utility
- AGENTS.md already exists at repository root (pre-existing, not created by this feature)
- public/ will contain vite.svg (default Vite asset, created by Vite init or manually)
- Commit after each task or logical group
- Stop at any checkpoint to validate independently

