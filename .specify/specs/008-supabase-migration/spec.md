# Feature Specification: Supabase Migration

**Feature Branch**: `008-supabase-migration`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Migrate the Fluxo Certo application from local-first IndexedDB (Dexie.js) to Supabase as the backend database. This migration enables future multi-device sync and cloud backup capabilities while maintaining the current user experience."

## Context

Fluxo Certo is a cashflow projection app for households with variable income. It currently uses:

- **Database**: Dexie.js (IndexedDB wrapper) for local-first persistence
- **State Management**: Zustand for write actions
- **Data Access**: `useLiveQuery` from `dexie-react-hooks` for reactive reads
- **Validation**: Zod schemas in `src/types/index.ts`

The current data model includes four entities:

1. **BankAccount**: id, name, type (checking/savings/investment), balance, balanceUpdatedAt, createdAt, updatedAt
2. **Project** (income source): id, name, amount, frequency, paymentSchedule, certainty, isActive, createdAt, updatedAt
3. **FixedExpense**: id, name, amount, dueDay, isActive, createdAt, updatedAt
4. **CreditCard**: id, name, statementBalance, dueDay, balanceUpdatedAt, createdAt, updatedAt

## User Scenarios & Testing

### User Story 1 - Seamless Data Persistence (Priority: P1)

Users should be able to add, update, and delete financial entities (accounts, projects, expenses, credit cards) with data persisting to Supabase instead of IndexedDB. The experience should feel identical to the current local-first behavior - fast and responsive.

**Why this priority**: Without basic CRUD operations working against Supabase, no other functionality can exist. This is the critical migration path.

**Independent Test**: Add a bank account, refresh the browser, verify the account persists. Repeat for all entity types.

**Acceptance Scenarios**:

1. **Given** a user adds a checking account "Main Checking" with balance R$5,000, **When** they refresh the browser, **Then** the account still appears with correct details
2. **Given** a user has existing data in Supabase (<100 entities), **When** they open the app, **Then** all their data loads within 2 seconds
3. **Given** a user updates a credit card balance, **When** the update completes, **Then** the UI reflects the change within 500ms

---

### User Story 2 - Reactive UI Updates (Priority: P2)

The UI should update in real-time when data changes, similar to the current `useLiveQuery` behavior. When a user adds or modifies data, all views displaying that data should update automatically without manual refresh.

**Why this priority**: Real-time reactivity is a core UX feature that users currently enjoy. Losing it would degrade the experience significantly.

**Independent Test**: Open the dashboard in one tab, add an expense in another tab, verify the dashboard updates automatically.

**Acceptance Scenarios**:

1. **Given** the dashboard is open, **When** a new expense is added via the Manage page, **Then** the cashflow projection updates without page refresh (within 500ms)
2. **Given** the Quick Update modal is open, **When** an account balance is updated, **Then** the balance list reflects the change within 500ms

---

### User Story 3 - Error Handling and Offline Graceful Degradation (Priority: P3)

The application should handle network errors gracefully, showing appropriate error messages when Supabase is unreachable. Users should understand when their data might not be saved.

**Why this priority**: Network reliability varies. Users need clear feedback when operations fail.

**Independent Test**: Disconnect network, attempt to save data, verify error message appears.

**Acceptance Scenarios**:

1. **Given** the network is unavailable, **When** a user tries to add an account, **Then** a toast notification displays: "Unable to save. Please check your internet connection and try again."
2. **Given** a Supabase operation fails, **When** the error occurs, **Then** the UI does not crash and shows a toast with error details and a "Retry" option

---

### Edge Cases

- What happens when Supabase connection times out during a write? Show toast: "Request timed out. Please try again." with Retry button.
- What happens when a user has no Supabase account/project configured? App displays a setup screen with instructions to configure environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and link to quickstart.md.
- What happens when Supabase returns a constraint violation? Show toast with specific validation error (e.g., "An account with this name already exists").
- What happens when the user's Supabase quota is exceeded? Show toast: "Storage limit reached. Please upgrade your Supabase plan or delete unused data."

## Clarifications

### Session 2025-11-27

- Q: How should the app authenticate with Supabase for single-user mode? → A: Use Supabase anonymous auth (auto-creates anonymous session, RLS works)
- Q: Should all tables include a `user_id` column from the start? → A: Yes, add `user_id` column to all tables now (future-proof, RLS ready)
- Q: Should migration from IndexedDB be automatic or user-initiated? → A: No migration needed; no existing data, switching directly to Supabase
- Q: Should Dexie.js be completely removed or kept as fallback? → A: Complete removal (delete Dexie.js, all IndexedDB code, and dependency)
- Q: Should real-time subscriptions filter by user_id or listen to entire tables? → A: Subscribe filtered by user_id (efficient, multi-user ready)

## Requirements

### Functional Requirements

**Database Setup:**

- **FR-001**: System MUST use Supabase PostgreSQL as the primary database
- **FR-002**: System MUST create tables matching the existing data model (accounts, projects, expenses, credit_cards)
- **FR-003**: System MUST use Row Level Security (RLS) policies for data isolation (prepare for future multi-user support)
- **FR-003.1**: System MUST use Supabase anonymous authentication to establish user sessions
- **FR-003.2**: RLS policies MUST filter data by the anonymous user's `auth.uid()`
- **FR-004**: System MUST store monetary values as integers (cents) to match existing convention

**Data Access:**

- **FR-005**: System MUST replace Dexie.js database instance with Supabase client
- **FR-006**: System MUST replace `useLiveQuery` hooks with Supabase real-time subscriptions for reactive updates
- **FR-006.1**: Real-time subscriptions MUST filter by `user_id` to receive only the current user's data changes
- **FR-007**: System MUST maintain the existing Zustand store interface (action signatures unchanged)
- **FR-008**: System MUST keep Zod validation as the source of truth for data validation

**State Management:**

- **FR-009**: System MUST update `useFinanceStore` to call Supabase instead of Dexie
- **FR-010**: System MUST create a new `useFinanceData` hook that subscribes to Supabase real-time
- **FR-011**: System MUST handle loading states during initial data fetch
- **FR-012**: System MUST handle error states from Supabase operations

**Cleanup:**

- **FR-013**: System MUST remove Dexie.js dependency from package.json
- **FR-014**: System MUST remove all IndexedDB/Dexie-related code (database instance, hooks, imports)
- **FR-015**: System MUST remove `dexie-react-hooks` dependency

**Configuration:**

- **FR-017**: System MUST use environment variables for Supabase URL and anon key
- **FR-018**: System MUST NOT commit Supabase credentials to version control
- **FR-019**: System MUST provide clear setup instructions in README

### Key Entities

The following tables will be created in Supabase PostgreSQL. All tables include a `user_id` column (UUID, foreign key to `auth.users`) for RLS filtering and future multi-user support.

**Naming Convention**: TypeScript uses camelCase (e.g., `balanceUpdatedAt`), PostgreSQL uses snake_case (e.g., `balance_updated_at`). The Supabase client layer handles this mapping automatically.

- **accounts**: Same fields as BankAccount type, with `id` as UUID primary key. Contains: user_id (UUID, FK to auth.users), name (text), type (enum: checking/savings/investment), balance (integer - cents), balanceUpdatedAt (timestamp), createdAt (timestamp), updatedAt (timestamp)
- **projects**: Same fields as Project type, with `id` as UUID primary key, `payment_schedule` as JSONB. Contains: user_id (UUID, FK to auth.users), name (text), amount (integer - cents), frequency (text), paymentSchedule (JSONB), certainty (text), isActive (boolean), createdAt (timestamp), updatedAt (timestamp)
- **expenses**: Same fields as FixedExpense type, with `id` as UUID primary key. Contains: user_id (UUID, FK to auth.users), name (text), amount (integer - cents), dueDay (integer), isActive (boolean), createdAt (timestamp), updatedAt (timestamp)
- **credit_cards**: Same fields as CreditCard type, with `id` as UUID primary key. Contains: user_id (UUID, FK to auth.users), name (text), statementBalance (integer - cents), dueDay (integer), balanceUpdatedAt (timestamp), createdAt (timestamp), updatedAt (timestamp)

## Success Criteria

### Measurable Outcomes

- **SC-001**: All existing CRUD operations work identically from user perspective
- **SC-002**: Initial data load completes in under 2 seconds for typical data volumes (<100 entities)
- **SC-003**: UI updates within 500ms of data changes (real-time subscriptions)
- **SC-004**: All existing tests pass after migration (with appropriate mocking)
- **SC-005**: Application gracefully handles network errors without crashing

## Assumptions

- User will create their own Supabase project and provide credentials
- Single-user usage continues with Supabase anonymous authentication (no sign-up required; session persists via browser storage)
- Supabase free tier is sufficient for typical household usage
- Real-time subscriptions are available on Supabase free tier
- PostgreSQL JSONB type can store the PaymentSchedule discriminated union
- No existing user data in IndexedDB requires migration (clean switch to Supabase)
- Users have stable internet connectivity for normal operations (offline mode is graceful degradation, not full offline support)
