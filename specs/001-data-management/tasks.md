# Tasks: Core Data Management Layer

**Input**: Design documents from `/specs/001-data-management/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/store-api.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested - test tasks omitted per specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Single-page React application (SPA)
- **Source**: `src/` at repository root
- **Structure**: `src/types/`, `src/db/`, `src/stores/` per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and additional dependencies

- [X] T001 Install dexie-react-hooks@4.2.0 dependency via `pnpm add dexie-react-hooks@4.2.0`
- [X] T002 Verify existing dependencies (dexie@4.2.1, zustand@5.0.8, zod@4.1.13) via `pnpm list dexie zustand zod`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type System (Zod Schemas)

- [X] T003 [P] Create BankAccount Zod schemas (BankAccountInputSchema, BankAccountSchema) and types in src/types/index.ts
- [X] T004 [P] Create Project Zod schemas (ProjectInputSchema, ProjectSchema) and types in src/types/index.ts
- [X] T005 [P] Create FixedExpense Zod schemas (FixedExpenseInputSchema, FixedExpenseSchema) and types in src/types/index.ts
- [X] T006 [P] Create CreditCard Zod schemas (CreditCardInputSchema, CreditCardSchema) and types in src/types/index.ts

### Database Layer (Dexie.js)

- [X] T007 Create FinanceDB class extending Dexie with typed tables (accounts, projects, expenses, creditCards) in src/db/index.ts
- [X] T008 Define version 1 schema with indexes (id, name, type for accounts; id, name, isActive for projects/expenses; id, name for creditCards) in src/db/index.ts
- [X] T009 Export db singleton instance from src/db/index.ts

### Store Layer (Zustand)

- [X] T010 Create Result<T> type for action return values in src/stores/finance-store.ts
- [X] T011 Create FinanceStore interface with all action signatures per store-api.md contract in src/stores/finance-store.ts
- [X] T012 Create useFinanceStore hook skeleton with empty action implementations in src/stores/finance-store.ts
- [X] T013 Create store exports in src/stores/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Initial Financial Setup (Priority: P1) 🎯 MVP

**Goal**: Enable users to add bank accounts, projects (income), fixed expenses, and credit cards for the first time

**Independent Test**: Add one of each entity type, verify they appear in the system and persist after browser refresh

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement addAccount action with Zod validation, UUID generation, timestamps, and Dexie persistence in src/stores/finance-store.ts
- [X] T015 [P] [US1] Implement addProject action with Zod validation, UUID generation, timestamps, isActive default, and Dexie persistence in src/stores/finance-store.ts
- [X] T016 [P] [US1] Implement addExpense action with Zod validation, UUID generation, timestamps, isActive default, and Dexie persistence in src/stores/finance-store.ts
- [X] T017 [P] [US1] Implement addCreditCard action with Zod validation, UUID generation, timestamps, and Dexie persistence in src/stores/finance-store.ts

**Checkpoint**: User Story 1 complete - users can add all entity types and data persists via IndexedDB

---

## Phase 4: User Story 2 - Monthly Balance Updates (Priority: P2)

**Goal**: Enable users to update credit card statement balances and bank account balances

**Independent Test**: Modify existing entity values, verify changes persist and reflect immediately in the UI

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement updateAccount action with partial input validation, existence check, and updatedAt timestamp in src/stores/finance-store.ts
- [X] T019 [P] [US2] Implement updateCreditCard action with partial input validation, existence check, and updatedAt timestamp in src/stores/finance-store.ts

**Checkpoint**: User Story 2 complete - users can update account and credit card balances

---

## Phase 5: User Story 3 - Toggle Income/Expense Active Status (Priority: P3)

**Goal**: Enable users to deactivate/reactivate projects and expenses without deleting them

**Independent Test**: Toggle an item's active status, verify status change persists and is reflected in the UI

### Implementation for User Story 3

- [X] T020 [P] [US3] Implement toggleProjectActive action with existence check, isActive flip, and updatedAt timestamp in src/stores/finance-store.ts
- [X] T021 [P] [US3] Implement toggleExpenseActive action with existence check, isActive flip, and updatedAt timestamp in src/stores/finance-store.ts

**Checkpoint**: User Story 3 complete - users can toggle active status on projects and expenses

---

## Phase 6: User Story 4 - Modify Entity Details (Priority: P4)

**Goal**: Enable users to edit any field of any entity (correct mistakes, update details)

**Independent Test**: Edit various fields of an entity, verify all changes persist correctly

### Implementation for User Story 4

- [X] T022 [P] [US4] Implement updateProject action with partial input validation, existence check, and updatedAt timestamp in src/stores/finance-store.ts
- [X] T023 [P] [US4] Implement updateExpense action with partial input validation, existence check, and updatedAt timestamp in src/stores/finance-store.ts

**Checkpoint**: User Story 4 complete - users can edit all entity fields

---

## Phase 7: User Story 5 - Delete Entities (Priority: P5)

**Goal**: Enable users to permanently remove entities from the system

**Independent Test**: Delete an entity, verify it no longer appears in the system after refresh

### Implementation for User Story 5

- [X] T024 [P] [US5] Implement deleteAccount action with existence check and Dexie removal in src/stores/finance-store.ts
- [X] T025 [P] [US5] Implement deleteProject action with existence check and Dexie removal in src/stores/finance-store.ts
- [X] T026 [P] [US5] Implement deleteExpense action with existence check and Dexie removal in src/stores/finance-store.ts
- [X] T027 [P] [US5] Implement deleteCreditCard action with existence check and Dexie removal in src/stores/finance-store.ts

**Checkpoint**: User Story 5 complete - users can delete any entity type

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation, error handling, and final verification

- [X] T028 Add comprehensive error handling for QuotaExceededError, ConstraintError, InvalidStateError, and IndexedDB unavailability with user-facing error messages in src/stores/finance-store.ts
- [X] T029 Verify all Zod validation error messages match spec requirements (see data-model.md validation rules)
- [X] T030 Run quickstart.md validation scenarios to verify end-to-end functionality
- [X] T031 Verify IndexedDB data persistence across browser sessions
- [X] T032 Verify useLiveQuery reactivity: confirm UI auto-updates when IndexedDB data changes without manual refresh

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2 → P3 → P4 → P5)
  - Or in parallel if team capacity allows
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Independent of US1
- **User Story 3 (P3)**: Can start after Foundational - Independent of US1/US2
- **User Story 4 (P4)**: Can start after Foundational - Independent of US1/US2/US3
- **User Story 5 (P5)**: Can start after Foundational - Independent of other stories

### Within Each Phase

- Types (T003-T006) must complete before Database (T007-T009)
- Database (T007-T009) must complete before Store (T010-T013)
- Store skeleton (T010-T013) must complete before any user story actions

### Parallel Opportunities

- T003, T004, T005, T006 can run in parallel (different schema definitions)
- T014, T015, T016, T017 can run in parallel (different add actions)
- T018, T019 can run in parallel (different update actions)
- T020, T021 can run in parallel (different toggle actions)
- T022, T023 can run in parallel (different update actions)
- T024, T025, T026, T027 can run in parallel (different delete actions)

---

## Parallel Example: Foundational Phase

```bash
# Launch all Zod schema tasks together:
Task T003: "Create BankAccount Zod schemas in src/types/index.ts"
Task T004: "Create Project Zod schemas in src/types/index.ts"
Task T005: "Create FixedExpense Zod schemas in src/types/index.ts"
Task T006: "Create CreditCard Zod schemas in src/types/index.ts"

# Then database tasks (sequential within this group):
Task T007: "Create FinanceDB class in src/db/index.ts"
Task T008: "Define version 1 schema in src/db/index.ts"
Task T009: "Export db singleton from src/db/index.ts"
```

## Parallel Example: User Story 1

```bash
# Launch all add actions together:
Task T014: "Implement addAccount action in src/stores/finance-store.ts"
Task T015: "Implement addProject action in src/stores/finance-store.ts"
Task T016: "Implement addExpense action in src/stores/finance-store.ts"
Task T017: "Implement addCreditCard action in src/stores/finance-store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dexie-react-hooks)
2. Complete Phase 2: Foundational (types, database, store skeleton)
3. Complete Phase 3: User Story 1 (add actions for all entities)
4. **STOP and VALIDATE**: Test adding entities and persistence
5. Deploy/demo if ready - users can add financial data!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test balance updates → Deploy/Demo
4. Add User Story 3 → Test toggle functionality → Deploy/Demo
5. Add User Story 4 → Test full editing → Deploy/Demo
6. Add User Story 5 → Test deletion → Deploy/Demo
7. Each story adds value without breaking previous stories

### Recommended Single-Developer Order

For a single developer, execute in strict priority order:
1. Setup (T001-T002)
2. Foundational (T003-T013)
3. US1: Initial Setup (T014-T017) - **MVP milestone**
4. US2: Balance Updates (T018-T019)
5. US3: Toggle Active (T020-T021)
6. US4: Edit Details (T022-T023)
7. US5: Delete Entities (T024-T027)
8. Polish (T028-T031)

---

## Notes

- [P] tasks = different actions/schemas, can be implemented in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All store actions return `Result<T>` type for explicit error handling
- Data reads use `useLiveQuery` from dexie-react-hooks (not store actions)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

