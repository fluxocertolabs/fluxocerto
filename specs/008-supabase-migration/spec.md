# Feature Specification: Supabase Migration

**Feature Branch**: `008-supabase-migration`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Migrate the Family Finance application from local-first IndexedDB (Dexie.js) to Supabase as the backend database. This migration enables future multi-device sync and cloud backup capabilities while maintaining the current user experience."

## Context

Family Finance is a cashflow projection app for households with variable income. It currently uses:

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
2. **Given** a user has existing data in Supabase, **When** they open the app, **Then** all their data loads within 2 seconds
3. **Given** a user updates a credit card balance, **When** the update completes, **Then** the UI reflects the change immediately

---

### User Story 2 - Reactive UI Updates (Priority: P2)

The UI should update in real-time when data changes, similar to the current `useLiveQuery` behavior. When a user adds or modifies data, all views displaying that data should update automatically without manual refresh.

**Why this priority**: Real-time reactivity is a core UX feature that users currently enjoy. Losing it would degrade the experience significantly.

**Independent Test**: Open the dashboard in one tab, add an expense in another tab, verify the dashboard updates automatically.

**Acceptance Scenarios**:

1. **Given** the dashboard is open, **When** a new expense is added via the Manage page, **Then** the cashflow projection updates without page refresh
2. **Given** the Quick Update modal is open, **When** an account balance is updated, **Then** the balance list reflects the change immediately

---

### User Story 3 - Error Handling and Offline Graceful Degradation (Priority: P3)

The application should handle network errors gracefully, showing appropriate error messages when Supabase is unreachable. Users should understand when their data might not be saved.

**Why this priority**: Network reliability varies. Users need clear feedback when operations fail.

**Independent Test**: Disconnect network, attempt to save data, verify error message appears.

**Acceptance Scenarios**:

1. **Given** the network is unavailable, **When** a user tries to add an account, **Then** a clear error message explains the issue
2. **Given** a Supabase operation fails, **When** the error occurs, **Then** the UI does not crash and shows a recovery option

---

### User Story 4 - Data Migration from IndexedDB (Priority: P4)

Existing users with data in IndexedDB should have their data migrated to Supabase on first use. This should be a one-time, seamless operation.

**Why this priority**: Existing users should not lose their data during the migration. However, this is a one-time operation.

**Independent Test**: Populate IndexedDB with test data, deploy Supabase version, verify data appears in Supabase after migration.

**Acceptance Scenarios**:

1. **Given** a user has existing data in IndexedDB, **When** they open the new Supabase version, **Then** their data is automatically migrated
2. **Given** migration is in progress, **When** the user waits, **Then** a progress indicator shows migration status
3. **Given** migration completes successfully, **When** the user uses the app, **Then** IndexedDB data is cleared to avoid duplicates

---

### Edge Cases

- What happens when Supabase connection times out during a write? Show retry option with clear messaging.
- What happens when a user has no Supabase account/project configured? App should fail gracefully with setup instructions.
- What happens when Supabase returns a constraint violation? Show appropriate validation error to user.
- What happens when the user's Supabase quota is exceeded? Show storage limit error with guidance.
- What happens if migration fails midway? Preserve original IndexedDB data and allow retry.
- What happens if the same data exists in both IndexedDB and Supabase? Skip duplicates based on entity ID.

## Requirements

### Functional Requirements

**Database Setup:**

- **FR-001**: System MUST use Supabase PostgreSQL as the primary database
- **FR-002**: System MUST create tables matching the existing data model (accounts, projects, expenses, credit_cards)
- **FR-003**: System MUST use Row Level Security (RLS) policies for data isolation (prepare for future multi-user support)
- **FR-004**: System MUST store monetary values as integers (cents) to match existing convention

**Data Access:**

- **FR-005**: System MUST replace Dexie.js database instance with Supabase client
- **FR-006**: System MUST replace `useLiveQuery` hooks with Supabase real-time subscriptions for reactive updates
- **FR-007**: System MUST maintain the existing Zustand store interface (action signatures unchanged)
- **FR-008**: System MUST keep Zod validation as the source of truth for data validation

**State Management:**

- **FR-009**: System MUST update `useFinanceStore` to call Supabase instead of Dexie
- **FR-010**: System MUST create a new `useFinanceData` hook that subscribes to Supabase real-time
- **FR-011**: System MUST handle loading states during initial data fetch
- **FR-012**: System MUST handle error states from Supabase operations

**Migration:**

- **FR-013**: System MUST detect existing IndexedDB data on app startup
- **FR-014**: System MUST migrate IndexedDB data to Supabase if detected
- **FR-015**: System MUST clear IndexedDB after successful migration
- **FR-016**: System MUST show migration progress to users

**Configuration:**

- **FR-017**: System MUST use environment variables for Supabase URL and anon key
- **FR-018**: System MUST NOT commit Supabase credentials to version control
- **FR-019**: System MUST provide clear setup instructions in README

### Key Entities

No changes to entity structure. The following tables will be created in Supabase PostgreSQL:

- **accounts**: Same fields as BankAccount type, with `id` as UUID primary key. Contains: name (text), type (enum: checking/savings/investment), balance (integer - cents), balanceUpdatedAt (timestamp), createdAt (timestamp), updatedAt (timestamp)
- **projects**: Same fields as Project type, with `id` as UUID primary key, `payment_schedule` as JSONB. Contains: name (text), amount (integer - cents), frequency (text), paymentSchedule (JSONB), certainty (text), isActive (boolean), createdAt (timestamp), updatedAt (timestamp)
- **expenses**: Same fields as FixedExpense type, with `id` as UUID primary key. Contains: name (text), amount (integer - cents), dueDay (integer), isActive (boolean), createdAt (timestamp), updatedAt (timestamp)
- **credit_cards**: Same fields as CreditCard type, with `id` as UUID primary key. Contains: name (text), statementBalance (integer - cents), dueDay (integer), balanceUpdatedAt (timestamp), createdAt (timestamp), updatedAt (timestamp)

## Success Criteria

### Measurable Outcomes

- **SC-001**: All existing CRUD operations work identically from user perspective
- **SC-002**: Initial data load completes in under 2 seconds for typical data volumes (<100 entities)
- **SC-003**: UI updates within 500ms of data changes (real-time subscriptions)
- **SC-004**: Migration from IndexedDB completes in under 10 seconds for typical data volumes
- **SC-005**: Zero data loss during migration (all IndexedDB records appear in Supabase)
- **SC-006**: All existing tests pass after migration (with appropriate mocking)
- **SC-007**: Application gracefully handles network errors without crashing

## Assumptions

- User will create their own Supabase project and provide credentials
- Single-user usage continues (no authentication required initially)
- Supabase free tier is sufficient for typical household usage
- Real-time subscriptions are available on Supabase free tier
- PostgreSQL JSONB type can store the PaymentSchedule discriminated union
- Existing IndexedDB schema matches the documented data model
- Users have stable internet connectivity for normal operations (offline mode is graceful degradation, not full offline support)
