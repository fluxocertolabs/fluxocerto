# Tasks: Supabase Migration

**Input**: Design documents from `/specs/008-supabase-migration/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Not explicitly requested in spec - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and Supabase configuration

- [ ] T001 Add @supabase/supabase-js@2.86.0 dependency to package.json
- [ ] T002 Remove dexie@4.2.1 and dexie-react-hooks@4.2.0 from package.json
- [ ] T003 [P] Create .env.example with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY placeholders
- [ ] T004 [P] Add .env to .gitignore (if not already present)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create database migration file supabase/migrations/001_initial_schema.sql with:
  - accounts table (id UUID PK, user_id UUID FK, name TEXT, type TEXT, balance INTEGER, balance_updated_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - projects table (id UUID PK, user_id UUID FK, name TEXT, amount INTEGER, frequency TEXT, payment_schedule JSONB, certainty TEXT, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - expenses table (id UUID PK, user_id UUID FK, name TEXT, amount INTEGER, due_day SMALLINT, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - credit_cards table (id UUID PK, user_id UUID FK, name TEXT, statement_balance INTEGER, due_day SMALLINT, balance_updated_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - CHECK constraints for enums and value ranges
  - Indexes on user_id for all tables
  - RLS policies for all tables (user_id = auth.uid())
  - Realtime publication for all tables
- [ ] T006 Create Supabase client singleton in src/lib/supabase.ts with:
  - createClient initialization using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  - Environment variable validation with user-friendly error: if missing, throw error that will be caught by error boundary
  - TypeScript Database type definition for type-safe queries
  - Export getMissingEnvVars() function to check which env vars are missing (used by setup screen)
- [ ] T007 Create anonymous auth initialization helper in src/lib/supabase.ts:
  - initializeAuth() function that checks getSession() and calls signInAnonymously() if no session
  - Export function for use in app initialization
- [ ] T008 Update src/main.tsx to initialize anonymous auth before rendering App:
  - Import initializeAuth from src/lib/supabase.ts
  - Call initializeAuth() before createRoot().render()
  - Handle auth initialization errors gracefully

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Seamless Data Persistence (Priority: P1) 🎯 MVP

**Goal**: Users can add, update, and delete financial entities with data persisting to Supabase instead of IndexedDB

**Independent Test**: Add a bank account, refresh the browser, verify the account persists. Repeat for all entity types.

### Implementation for User Story 1

- [ ] T009 [US1] Create Supabase error handler utility in src/lib/supabase.ts:
  - Map Supabase/PostgREST error codes to user-friendly messages
  - Return Result<T> type matching existing store interface
  - Handle: network errors, unique violations (23505), RLS violations (42501), not found (PGRST116)
  - Handle: quota exceeded (54000) with message "Storage limit reached. Please upgrade your Supabase plan or delete unused data."
  - Handle: timeout errors with message "Request timed out. Please try again."
- [ ] T010 [US1] Update src/stores/finance-store.ts - Replace Dexie imports with Supabase client:
  - Import supabase from src/lib/supabase.ts
  - Remove import of db from ../db
  - Keep all existing action signatures unchanged (FR-007)
- [ ] T011 [US1] Update addAccount action in src/stores/finance-store.ts:
  - Use supabase.from('accounts').insert() instead of db.accounts.add()
  - Include user_id from auth.getUser() in insert
  - Map camelCase to snake_case column names
  - Return Result<string> with new id
- [ ] T012 [US1] Update updateAccount action in src/stores/finance-store.ts:
  - Use supabase.from('accounts').update().eq('id', id) instead of db.accounts.update()
  - Map camelCase to snake_case column names
  - Set updated_at to now()
- [ ] T013 [US1] Update deleteAccount action in src/stores/finance-store.ts:
  - Use supabase.from('accounts').delete().eq('id', id) instead of db.accounts.delete()
- [ ] T014 [US1] Update updateAccountBalance action in src/stores/finance-store.ts:
  - Use supabase.from('accounts').update() with balance, balance_updated_at, updated_at
- [ ] T015 [P] [US1] Update addProject action in src/stores/finance-store.ts:
  - Use supabase.from('projects').insert()
  - Serialize paymentSchedule as JSONB
  - Map camelCase to snake_case
- [ ] T016 [P] [US1] Update updateProject action in src/stores/finance-store.ts:
  - Use supabase.from('projects').update().eq('id', id)
- [ ] T017 [P] [US1] Update deleteProject action in src/stores/finance-store.ts:
  - Use supabase.from('projects').delete().eq('id', id)
- [ ] T018 [P] [US1] Update toggleProjectActive action in src/stores/finance-store.ts:
  - Fetch current is_active, toggle, update via supabase
- [ ] T019 [P] [US1] Update addExpense action in src/stores/finance-store.ts:
  - Use supabase.from('expenses').insert()
  - Map dueDay to due_day, isActive to is_active
- [ ] T020 [P] [US1] Update updateExpense action in src/stores/finance-store.ts:
  - Use supabase.from('expenses').update().eq('id', id)
- [ ] T021 [P] [US1] Update deleteExpense action in src/stores/finance-store.ts:
  - Use supabase.from('expenses').delete().eq('id', id)
- [ ] T022 [P] [US1] Update toggleExpenseActive action in src/stores/finance-store.ts:
  - Fetch current is_active, toggle, update via supabase
- [ ] T023 [P] [US1] Update addCreditCard action in src/stores/finance-store.ts:
  - Use supabase.from('credit_cards').insert()
  - Map statementBalance to statement_balance, dueDay to due_day
- [ ] T024 [P] [US1] Update updateCreditCard action in src/stores/finance-store.ts:
  - Use supabase.from('credit_cards').update().eq('id', id)
- [ ] T025 [P] [US1] Update deleteCreditCard action in src/stores/finance-store.ts:
  - Use supabase.from('credit_cards').delete().eq('id', id)
- [ ] T026 [US1] Update updateCreditCardBalance action in src/stores/finance-store.ts:
  - Use supabase.from('credit_cards').update() with statement_balance, balance_updated_at, updated_at
- [ ] T027 [US1] Update handleDatabaseError function in src/stores/finance-store.ts:
  - Replace IndexedDB error handling with Supabase error mapping
  - Use error handler utility from T009

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - all CRUD operations persist to Supabase

---

## Phase 4: User Story 2 - Reactive UI Updates (Priority: P2)

**Goal**: UI updates in real-time when data changes, similar to current useLiveQuery behavior

**Independent Test**: Open the dashboard in one tab, add an expense in another tab, verify the dashboard updates automatically.

### Implementation for User Story 2

- [ ] T028 [US2] Create useFinanceData hook replacement in src/hooks/use-finance-data.ts:
  - Remove useLiveQuery and dexie imports
  - Import supabase from src/lib/supabase.ts
  - Add useState for accounts, projects, expenses, creditCards, isLoading, error
- [ ] T029 [US2] Implement initial data fetch in src/hooks/use-finance-data.ts:
  - Create fetchAllData() async function
  - Fetch from all four tables with .select('*')
  - Map snake_case columns to camelCase TypeScript types
  - Parse payment_schedule JSONB back to PaymentSchedule type
  - Handle errors and set error state
- [ ] T030 [US2] Implement Supabase Realtime subscription in src/hooks/use-finance-data.ts:
  - Get current user_id from auth.getUser()
  - Create channel for postgres_changes on all four tables
  - Filter by user_id=eq.${userId} for efficiency
  - Handle INSERT, UPDATE, DELETE events
- [ ] T031 [US2] Implement subscription event handlers in src/hooks/use-finance-data.ts:
  - handleAccountChange: update accounts state based on eventType
  - handleProjectChange: update projects state, parse payment_schedule
  - handleExpenseChange: update expenses state
  - handleCreditCardChange: update creditCards state
  - Map snake_case to camelCase in all handlers
- [ ] T032 [US2] Implement subscription lifecycle in src/hooks/use-finance-data.ts:
  - useEffect to setup subscription on mount
  - Return cleanup function that calls channel.unsubscribe()
  - Re-subscribe if user_id changes
- [ ] T033 [US2] Maintain UseFinanceDataReturn interface in src/hooks/use-finance-data.ts:
  - Keep same return type: { accounts, projects, expenses, creditCards, isLoading }
  - Add optional error field for error state
  - Ensure isLoading is true during initial fetch, false after

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - data persists AND UI updates reactively

---

## Phase 5: User Story 3 - Error Handling and Offline Graceful Degradation (Priority: P3)

**Goal**: Application handles network errors gracefully, showing appropriate error messages when Supabase is unreachable

**Independent Test**: Disconnect network, attempt to save data, verify error message appears.

### Implementation for User Story 3

- [ ] T034 [US3] Add error state to useFinanceData hook in src/hooks/use-finance-data.ts:
  - Add error: string | null to state
  - Set error on fetch failures
  - Clear error on successful operations
- [ ] T035 [US3] Add connection status detection in src/lib/supabase.ts:
  - Create isOnline() utility using navigator.onLine
  - Create connection test function that pings Supabase
- [ ] T036 [US3] Update store actions to handle network errors in src/stores/finance-store.ts:
  - Check isOnline() before operations
  - Return user-friendly error: "Unable to connect. Please check your internet connection."
  - Handle timeout errors with retry suggestion
- [ ] T037 [US3] Add error display in UI components:
  - Update src/components/manage/shared/storage-error-toast.tsx to handle Supabase errors
  - Ensure error messages from store Result<T> are displayed to user
- [ ] T038 [US3] Add loading/error states to data-dependent components:
  - Ensure components using useFinanceData handle isLoading and error states
  - Show appropriate loading indicators during initial fetch
  - Show error message with retry option when fetch fails
- [ ] T038.1 [US3] Create setup error screen component in src/components/setup-required.tsx:
  - Display when Supabase environment variables are missing (detected via getMissingEnvVars())
  - Show list of missing variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - Include link to quickstart.md or README setup instructions
  - Render this screen in App.tsx when env validation fails instead of crashing

**Checkpoint**: All user stories should now be independently functional - persistence, reactivity, and error handling all work

---

## Phase 6: Cleanup & Polish

**Purpose**: Remove legacy code and finalize migration

- [ ] T039 [P] Delete src/db/index.ts (Dexie database definition)
- [ ] T040 [P] Remove any remaining Dexie imports from codebase (grep for 'dexie' and 'db/')
- [ ] T041 Update README.md with Supabase setup instructions:
  - Add "Prerequisites" section mentioning Supabase account requirement
  - Add "Environment Setup" section with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY configuration
  - Add "Database Setup" section referencing supabase/migrations/001_initial_schema.sql
  - Reference quickstart.md for detailed step-by-step instructions
- [ ] T042 Run quickstart.md verification checklist to validate migration
- [ ] T043 Update .specify/memory/constitution.md to reflect Supabase migration:
  - Tech Stack: Replace "IndexedDB (via Dexie.js 4.2.1) - local-first" with "Supabase PostgreSQL (@supabase/supabase-js 2.86.0)"
  - PINNED DEPENDENCIES: Remove dexie@4.2.1 and dexie-react-hooks@4.2.0, add @supabase/supabase-js@2.86.0
  - PROJECT STRUCTURE: Remove /src/db directory entries, add /src/lib/supabase.ts
  - ARCHITECTURE OVERVIEW: Update Data Flow diagram from "Zustand Store → Dexie.js → IndexedDB" to "Zustand Store → Supabase Client → PostgreSQL"
  - ENVIRONMENT SETUP: Move VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from "Future" comment to required env vars
  - Update "Why IndexedDB" section to "Why Supabase" with updated rationale

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Cleanup (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses same Supabase client, but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1/US2 but independently testable

### Within Each User Story

- Error handler utility before store updates (US1)
- Store updates before hook replacement (US1 before US2)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T004 can run in parallel (different files)
- T015-T026 (individual entity CRUD updates) can run in parallel within US1
- T039, T040 can run in parallel (cleanup tasks)
- Once Foundational phase completes, US1/US2/US3 can start in parallel if team capacity allows

---

## Parallel Example: User Story 1 Store Updates

```bash
# After T009-T014 complete (accounts), these can run in parallel:
Task T015: "Update addProject action in src/stores/finance-store.ts"
Task T019: "Update addExpense action in src/stores/finance-store.ts"
Task T023: "Update addCreditCard action in src/stores/finance-store.ts"

# Similarly, update/delete/toggle actions for each entity can run in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T027)
4. **STOP and VALIDATE**: Add account, refresh browser, verify persistence
5. Deploy/demo if ready - basic Supabase migration working

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP: Data persists to Supabase**
3. Add User Story 2 → Test independently → **Real-time UI updates working**
4. Add User Story 3 → Test independently → **Graceful error handling**
5. Cleanup → **Migration complete, Dexie removed**

### Key Files Changed

| File | Change Type | User Story |
|------|-------------|------------|
| package.json | UPDATE | Setup |
| .env.example | NEW | Setup |
| supabase/migrations/001_initial_schema.sql | NEW | Foundational |
| src/lib/supabase.ts | NEW | Foundational |
| src/main.tsx | UPDATE | Foundational |
| src/stores/finance-store.ts | UPDATE | US1 |
| src/hooks/use-finance-data.ts | UPDATE | US2 |
| src/components/manage/shared/storage-error-toast.tsx | UPDATE | US3 |
| src/components/setup-required.tsx | NEW | US3 |
| src/db/index.ts | DELETE | Cleanup |
| .specify/memory/constitution.md | UPDATE | Cleanup |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Zod schemas in src/types/index.ts remain unchanged (FR-008)
- Store action signatures remain unchanged (FR-007)
- All monetary values stored as INTEGER (cents) per existing convention

