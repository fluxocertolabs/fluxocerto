# Tasks: Account Owner Assignment

**Input**: Design documents from `/specs/017-account-owner/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Not explicitly requested in specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `supabase/` at repository root
- Paths follow existing project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and type definitions

- [ ] T001 Create database migration file in supabase/migrations/005_account_owner.sql (rename `allowed_emails` → `profiles`, add `name` column, add `owner_id` FK to accounts/credit_cards)
- [ ] T002 Run migration via Supabase dashboard and seed profile names (Daniel, Aryane)
- [ ] T003 Add Profile type, extend BankAccount and CreditCard types with owner_id/owner fields in src/types/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add profiles state and fetching to src/hooks/use-finance-data.ts
- [ ] T005 Update accounts query to include owner join in src/hooks/use-finance-data.ts
- [ ] T006 Update credit_cards query to include owner join in src/hooks/use-finance-data.ts
- [ ] T007 Create OwnerBadge reusable component in src/components/ui/owner-badge.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Assign Owner to New Account (Priority: P1) 🎯 MVP

**Goal**: Allow selecting an owner when creating a new bank account or credit card

**Independent Test**: Create a new bank account, select "Daniel" as owner, verify the owner is saved and displayed correctly.

### Implementation for User Story 1

- [ ] T008 [US1] Update addAccount in src/stores/finance-store.ts to accept and persist ownerId
- [ ] T009 [US1] Update addCreditCard in src/stores/finance-store.ts to accept and persist ownerId
- [ ] T010 [US1] Add owner dropdown to bank account form in src/components/manage/accounts/account-form.tsx
- [ ] T011 [US1] Add owner dropdown to credit card form in src/components/manage/credit-cards/credit-card-form.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can assign owners when creating new accounts/cards

---

## Phase 4: User Story 2 - View Owner in Account Lists (Priority: P1)

**Goal**: Display owner badge alongside each account/card name in list views

**Independent Test**: View the bank accounts list with accounts that have different owners assigned and verify owner badges are displayed correctly.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Add OwnerBadge to account list item in src/components/manage/accounts/account-list-item.tsx
- [ ] T013 [P] [US2] Add OwnerBadge to credit card list item in src/components/manage/credit-cards/credit-card-list-item.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can assign owners and see them displayed in lists

---

## Phase 5: User Story 3 - Edit Owner on Existing Account (Priority: P2)

**Goal**: Allow changing or removing the owner of an existing bank account or credit card

**Independent Test**: Edit an existing bank account, change the owner from "Daniel" to "Aryane", verify the change persists.

### Implementation for User Story 3

- [ ] T014 [US3] Update updateAccount in src/stores/finance-store.ts to handle ownerId changes
- [ ] T015 [US3] Update updateCreditCard in src/stores/finance-store.ts to handle ownerId changes
- [ ] T016 [US3] Ensure account form loads existing owner value in src/components/manage/accounts/account-form.tsx
- [ ] T017 [US3] Ensure credit card form loads existing owner value in src/components/manage/credit-cards/credit-card-form.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work - users can assign, view, and edit owners

---

## Phase 6: User Story 4 - Filter Accounts by Owner (Priority: P3)

**Goal**: Filter the accounts and credit cards lists by owner

**Independent Test**: Use the filter dropdown in the accounts list to select "Daniel" and verify only Daniel's accounts are shown.

### Implementation for User Story 4

- [ ] T018 [P] [US4] Add owner filter dropdown and filtering logic to src/components/manage/accounts/account-list.tsx
- [ ] T019 [P] [US4] Add owner filter dropdown and filtering logic to src/components/manage/credit-cards/credit-card-list.tsx

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation and edge case handling

- [ ] T020 Verify all UI text is in Brazilian Portuguese (pt-BR): check owner dropdown labels ("Não atribuído", "Daniel", "Aryane"), filter options ("Todos"), and any error/empty states - PASS if no English text visible in owner-related UI
- [ ] T021 Verify existing accounts display as "Não atribuído" (unassigned) correctly: create test account before migration, run migration, confirm account shows no owner badge or "Não atribuído" indicator - PASS if pre-existing accounts display correctly
- [ ] T022 Run quickstart.md verification checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2 → P3)
  - US1 and US2 are both P1, but US2 depends on US1 for meaningful testing
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Best tested after US1 has data
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Best tested after US1/US2
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Best tested after US1/US2

### Within Each User Story

- Store updates before UI components
- Form components before list components (for US1)
- Story complete before moving to next priority

### Parallel Opportunities

- T012, T013 can run in parallel (different list item components)
- T018, T019 can run in parallel (different list components)

---

## Parallel Example: User Story 2

```bash
# Launch both list item updates together:
Task: "Add OwnerBadge to account list item in src/components/manage/accounts/account-list-item.tsx"
Task: "Add OwnerBadge to credit card list item in src/components/manage/credit-cards/credit-card-list-item.tsx"
```

## Parallel Example: User Story 4

```bash
# Launch both filter implementations together:
Task: "Add owner filter dropdown and filtering logic to src/components/manage/accounts/account-list.tsx"
Task: "Add owner filter dropdown and filtering logic to src/components/manage/credit-cards/credit-card-list.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Assign Owner)
4. Complete Phase 4: User Story 2 (View Owner)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo if ready - users can now assign and see owners

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo (edit capability)
4. Add User Story 4 → Test independently → Deploy/Demo (filtering)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All UI text MUST be in Brazilian Portuguese (pt-BR)
- Migration must be run via Supabase dashboard (not automated)

