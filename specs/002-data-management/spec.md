# Feature Specification: Core Data Management Layer

**Feature Branch**: `002-data-management`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "Implement the core data management layer for Family Finance. This feature establishes the foundation for all financial data operations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial Financial Setup (Priority: P1)

A new user opens Family Finance for the first time and needs to enter all their financial information to get started. They add their bank accounts, income sources (projects), recurring bills, and credit cards. This is the foundational experience that enables all other features.

**Why this priority**: Without the ability to add financial data, the application has no value. This is the critical path that enables all subsequent functionality.

**Independent Test**: Can be fully tested by adding one of each entity type (account, project, expense, credit card) and verifying they appear in the system and persist after browser refresh.

**Acceptance Scenarios**:

1. **Given** the user has no financial data, **When** they add a checking account with name "Main Checking" and balance $5,000, **Then** the account appears in their account list with the correct details
2. **Given** the user has no income sources, **When** they add a project with name "Consulting", amount $3,000, payment day 15, monthly frequency, and guaranteed certainty, **Then** the project appears in their income list as active
3. **Given** the user has no expenses, **When** they add a fixed expense with name "Rent", amount $1,500, and due day 1, **Then** the expense appears in their expense list as active
4. **Given** the user has no credit cards, **When** they add a credit card with name "Visa", statement balance $500, and due day 20, **Then** the card appears in their credit card list
5. **Given** the user has added financial data, **When** they close and reopen the browser, **Then** all their data is still present and accurate

---

### User Story 2 - Monthly Balance Updates (Priority: P2)

At the start of each month (or when statements arrive), the user needs to update their credit card statement balances and bank account balances to reflect current reality. This is a recurring activity that keeps the financial picture accurate.

**Why this priority**: After initial setup, regular updates are the most common operation. Users need to keep their data current for the application to provide value.

**Independent Test**: Can be tested by modifying existing entity values and verifying the changes persist and reflect immediately in the UI.

**Acceptance Scenarios**:

1. **Given** a credit card "Visa" exists with statement balance $500, **When** the user updates the balance to $750, **Then** the card shows the new balance immediately
2. **Given** a checking account "Main Checking" exists with balance $5,000, **When** the user updates the balance to $4,200, **Then** the account shows the new balance immediately
3. **Given** the user has updated multiple balances, **When** they refresh the browser, **Then** all updated values persist correctly

---

### User Story 3 - Toggle Income/Expense Active Status (Priority: P3)

The user's financial situation changes - a project ends, a subscription is cancelled, or a seasonal expense pauses. They need to deactivate items without deleting them, preserving historical context while excluding them from active calculations.

**Why this priority**: Toggling active status is a common operation that provides flexibility without data loss. It's important but less frequent than initial setup or balance updates.

**Independent Test**: Can be tested by toggling an item's active status and verifying the status change persists and is reflected in the UI.

**Acceptance Scenarios**:

1. **Given** an active project "Consulting" exists, **When** the user toggles it to inactive, **Then** the project shows as inactive and remains in the list
2. **Given** an inactive expense "Gym Membership" exists, **When** the user toggles it to active, **Then** the expense shows as active
3. **Given** the user has toggled items, **When** they refresh the browser, **Then** the active/inactive states persist correctly

---

### User Story 4 - Modify Entity Details (Priority: P4)

The user needs to correct mistakes or update details - a payment day changed, an expense amount increased, or an account was misnamed. They need to edit any field of any entity.

**Why this priority**: Editing is essential for data accuracy but less frequent than adding or updating balances. Users occasionally need to fix errors or reflect real-world changes.

**Independent Test**: Can be tested by editing various fields of an entity and verifying all changes persist correctly.

**Acceptance Scenarios**:

1. **Given** a project "Consulting" with payment day 15, **When** the user changes the payment day to 20, **Then** the project reflects the new payment day
2. **Given** an expense "Rent" with amount $1,500, **When** the user changes the amount to $1,600, **Then** the expense reflects the new amount
3. **Given** an account "Main Checking" of type checking, **When** the user changes the type to savings, **Then** the account reflects the new type

---

### User Story 5 - Delete Entities (Priority: P5)

The user needs to permanently remove an entity that was added by mistake or is no longer relevant. They want to clean up their financial data by removing items completely.

**Why this priority**: Deletion is the least common operation. Most users prefer to deactivate rather than delete, preserving history. However, the capability is necessary for data cleanup.

**Independent Test**: Can be tested by deleting an entity and verifying it no longer appears in the system after refresh.

**Acceptance Scenarios**:

1. **Given** a credit card "Old Card" exists, **When** the user deletes it, **Then** the card no longer appears in the credit card list
2. **Given** the user has deleted an entity, **When** they refresh the browser, **Then** the deleted entity remains gone

---

### Edge Cases

- What happens when a user enters a negative balance for an account? System should prevent this with validation.
- What happens when a user enters a payment/due day outside 1-31? System should reject invalid days.
- What happens when a user enters an empty name? System should require a non-empty name.
- What happens when a user enters a negative amount for income or expenses? System should prevent negative amounts.
- What happens when a user tries to add a duplicate entity (same name and type)? System should allow it (users may have multiple accounts at same bank).
- What happens when IndexedDB is unavailable or full? System should display an appropriate error message.

## Requirements *(mandatory)*

### Functional Requirements

**Bank Accounts:**
- **FR-001**: System MUST allow users to create bank accounts with name, type (checking/savings/investment), and current balance
- **FR-002**: System MUST allow users to view all their bank accounts
- **FR-003**: System MUST allow users to update any field of a bank account
- **FR-004**: System MUST allow users to delete bank accounts
- **FR-005**: System MUST validate that account balance is not negative
- **FR-006**: System MUST validate that account name is not empty

**Projects (Income Sources):**
- **FR-007**: System MUST allow users to create projects with name, amount, payment day (1-31), frequency (weekly/biweekly/monthly/one-time), certainty level (guaranteed/uncertain), and active status
- **FR-008**: System MUST allow users to view all their projects
- **FR-009**: System MUST allow users to update any field of a project
- **FR-010**: System MUST allow users to delete projects
- **FR-011**: System MUST allow users to toggle project active/inactive status
- **FR-012**: System MUST validate that project amount is positive
- **FR-013**: System MUST validate that payment day is between 1 and 31
- **FR-014**: System MUST default new projects to active status

**Fixed Expenses:**
- **FR-015**: System MUST allow users to create fixed expenses with name, amount, due day (1-31), and active status
- **FR-016**: System MUST allow users to view all their fixed expenses
- **FR-017**: System MUST allow users to update any field of a fixed expense
- **FR-018**: System MUST allow users to delete fixed expenses
- **FR-019**: System MUST allow users to toggle expense active/inactive status
- **FR-020**: System MUST validate that expense amount is positive
- **FR-021**: System MUST validate that due day is between 1 and 31
- **FR-022**: System MUST default new expenses to active status

**Credit Cards:**
- **FR-023**: System MUST allow users to create credit cards with name, statement balance, and due day (1-31)
- **FR-024**: System MUST allow users to view all their credit cards
- **FR-025**: System MUST allow users to update any field of a credit card
- **FR-026**: System MUST allow users to delete credit cards
- **FR-027**: System MUST validate that statement balance is not negative
- **FR-028**: System MUST validate that due day is between 1 and 31

**Data Persistence:**
- **FR-029**: System MUST persist all data to browser storage that survives page refresh
- **FR-030**: System MUST load persisted data when the application starts
- **FR-031**: System MUST update UI reactively when data changes (no manual refresh needed)

**Data Validation:**
- **FR-032**: System MUST prevent saving invalid data and display appropriate error messages
- **FR-033**: System MUST validate data before persistence

### Key Entities

- **Bank Account**: Represents a financial account at a bank or institution. Key attributes: unique identifier, name, account type (checking/savings/investment), current balance (stored in cents as integer). No relationships to other entities in this feature.

- **Project**: Represents a source of income (job, freelance work, side gig). Key attributes: unique identifier, name, expected amount per payment (stored in cents as integer), payment day of month, payment frequency (weekly/biweekly/monthly/one-time), certainty level indicating how reliable the income is (guaranteed/uncertain), active status. No relationships to other entities in this feature.

- **Fixed Expense**: Represents a recurring bill or expense. Key attributes: unique identifier, name, amount (stored in cents as integer), due day of month, active status. No relationships to other entities in this feature.

- **Credit Card**: Represents a credit card with a statement balance due. Key attributes: unique identifier, name, current statement balance (stored in cents as integer), due day of month. No relationships to other entities in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new financial entity (account, project, expense, or credit card) in under 30 seconds
- **SC-002**: All data persists correctly across browser sessions with 100% reliability
- **SC-003**: UI reflects data changes within 100 milliseconds of user action (perceived as instant)
- **SC-004**: System prevents 100% of invalid data entries (negative balances, invalid dates, empty names)
- **SC-005**: Users can complete full initial setup (adding at least one of each entity type) in under 5 minutes
- **SC-006**: CRUD operations complete without errors under normal usage conditions
- **SC-007**: Active/inactive toggle changes take effect immediately and persist correctly

## Assumptions

- Users have a modern browser that supports IndexedDB
- Users will primarily access the application from a single browser/device (no cross-device sync required for this feature)
- The application will be used by a single user (no multi-user support required)
- Currency is assumed to be the user's local currency (no currency conversion)
- Payment frequencies are limited to weekly, biweekly, and monthly (no custom frequencies)
- Certainty levels are predefined categories (guaranteed/uncertain), not custom user-defined values
- All monetary amounts are stored as numbers (decimal precision handling is implementation detail)
