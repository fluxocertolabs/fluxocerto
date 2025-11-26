# Feature Specification: Data Management UI

**Feature Branch**: `005-data-management-ui`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "Build the Data Management UI for Family Finance - the forms and interfaces that allow users to manage their financial data (bank accounts, income sources/projects, fixed expenses, and credit cards)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial Financial Setup (Priority: P1)

A first-time user opens the app and sees the empty state on the dashboard. The empty state provides clear guidance and a call-to-action to add their first financial data. The user can add bank accounts, income sources (projects), fixed expenses, and credit cards through intuitive forms. After adding data, the user returns to the dashboard to see their cashflow projection.

**Why this priority**: This is the core value proposition - without data entry, the app has no utility. Users must be able to input their financial information before they can see any cashflow projections. This enables the MVP experience.

**Independent Test**: Can be fully tested by opening the app, accessing data management from the empty state, adding one of each entity type (bank account, project, expense, credit card), and verifying they appear in the lists and the dashboard shows a projection.

**Acceptance Scenarios**:

1. **Given** the user has no financial data, **When** they view the dashboard, **Then** they see an empty state with clear guidance to add their first data
2. **Given** the empty state is displayed, **When** the user clicks the call-to-action, **Then** they are taken to the data management interface
3. **Given** the user is in the data management interface, **When** they fill out the bank account form with valid data (name, type, balance), **Then** the account is saved and appears in the accounts list
4. **Given** the user is in the data management interface, **When** they fill out the project form with valid data (name, amount, payment day, frequency, certainty), **Then** the project is saved as active and appears in the projects list
5. **Given** the user is in the data management interface, **When** they fill out the expense form with valid data (name, amount, due day), **Then** the expense is saved as active and appears in the expenses list
6. **Given** the user is in the data management interface, **When** they fill out the credit card form with valid data (name, statement balance, due day), **Then** the credit card is saved and appears in the credit cards list
7. **Given** the user has added at least one entity, **When** they return to the dashboard, **Then** they see their cashflow projection based on the entered data

---

### User Story 2 - Monthly Balance Updates (Priority: P2)

A returning user opens the app at the start of the month to update their credit card statement balances and bank account balances. The interface allows quick inline editing so the user can complete their monthly updates efficiently.

**Why this priority**: This is the recurring usage pattern that keeps data accurate. Without fast updates, users will abandon the app. The target is under 2 minutes for monthly updates.

**Independent Test**: Can be fully tested by having existing data, updating credit card balances and bank account balances inline, and verifying the changes persist and reflect in the dashboard.

**Acceptance Scenarios**:

1. **Given** the user has existing credit cards, **When** they view the credit cards list, **Then** they see all cards with their current statement balances
2. **Given** the user views a credit card, **When** they click to edit the balance, **Then** they can update the balance inline without navigating away
3. **Given** the user has existing bank accounts, **When** they view the accounts list, **Then** they see all accounts with their current balances
4. **Given** the user views a bank account, **When** they click to edit the balance, **Then** they can update the balance inline without navigating away
5. **Given** the user updates multiple balances, **When** they finish editing, **Then** all changes are saved immediately and the dashboard reflects the new values

---

### User Story 3 - View and Organize Financial Data (Priority: P3)

A user wants to view all their financial entities organized by type. They can see bank accounts, projects, expenses, and credit cards in separate organized lists with clear visual distinction between active and inactive items.

**Why this priority**: Users need visibility into their data to maintain accuracy and confidence in the projections. This supports both initial setup verification and ongoing data management.

**Independent Test**: Can be fully tested by having data in all categories and verifying each category displays correctly with proper organization and visual indicators.

**Acceptance Scenarios**:

1. **Given** the user has financial data, **When** they access data management, **Then** they see organized sections for each entity type (accounts, projects, expenses, credit cards)
2. **Given** the user views the projects list, **When** some projects are active and some inactive, **Then** active and inactive projects are visually distinguished
3. **Given** the user views the expenses list, **When** some expenses are active and some inactive, **Then** active and inactive expenses are visually distinguished
4. **Given** the user is viewing any entity list, **When** they scroll on mobile, **Then** the list remains readable and usable

---

### User Story 4 - Edit Entity Details (Priority: P4)

A user needs to modify the details of an existing financial entity (change name, adjust amounts, update dates, etc.). They can access full edit functionality for any entity.

**Why this priority**: Life changes require data updates - salary changes, new expenses, different payment dates. This maintains data accuracy over time.

**Independent Test**: Can be fully tested by selecting an existing entity, editing various fields, saving, and verifying the changes persist.

**Acceptance Scenarios**:

1. **Given** the user has an existing bank account, **When** they select it for editing, **Then** they see a form pre-filled with current values
2. **Given** the user is editing an entity, **When** they modify fields and save, **Then** the changes are persisted and visible immediately
3. **Given** the user is editing an entity, **When** they enter invalid data, **Then** they see inline validation errors explaining the issue
4. **Given** the user is editing an entity, **When** they cancel without saving, **Then** no changes are made

---

### User Story 5 - Toggle Active Status (Priority: P5)

A user wants to temporarily disable a project or expense without deleting it. They can toggle the active status to exclude it from cashflow calculations while preserving the data for future reactivation.

**Why this priority**: Seasonal income, paused subscriptions, and temporary situations are common. Users shouldn't have to delete and re-create data.

**Independent Test**: Can be fully tested by toggling a project or expense inactive, verifying it's visually marked as inactive, checking the dashboard excludes it, then reactivating and verifying it's included again.

**Acceptance Scenarios**:

1. **Given** the user has an active project, **When** they toggle it inactive, **Then** the project is visually marked as inactive and excluded from cashflow calculations
2. **Given** the user has an inactive project, **When** they toggle it active, **Then** the project is visually marked as active and included in cashflow calculations
3. **Given** the user has an active expense, **When** they toggle it inactive, **Then** the expense is visually marked as inactive and excluded from cashflow calculations
4. **Given** the user has an inactive expense, **When** they toggle it active, **Then** the expense is visually marked as active and included in cashflow calculations

---

### User Story 6 - Delete Entities (Priority: P6)

A user wants to permanently remove a financial entity they no longer need. They can delete any entity with appropriate confirmation to prevent accidental data loss.

**Why this priority**: Users need to clean up obsolete data. Lower priority because toggling inactive often suffices and deletion is destructive.

**Independent Test**: Can be fully tested by selecting an entity for deletion, confirming the action, and verifying it no longer appears in lists or affects the dashboard.

**Acceptance Scenarios**:

1. **Given** the user has an existing entity, **When** they choose to delete it, **Then** they are asked to confirm the deletion
2. **Given** the user confirms deletion, **When** the deletion completes, **Then** the entity is removed from the list and no longer affects cashflow
3. **Given** the user is asked to confirm deletion, **When** they cancel, **Then** the entity remains unchanged

---

### Edge Cases

- What happens when a user enters a payment day of 31 for months with fewer days? (System handles gracefully - payment occurs on last day of month)
- How does the system handle entering a balance of exactly 0 for credit cards? (Allowed - represents a paid-off card)
- What happens if the user tries to save with empty required fields? (Inline validation prevents submission)
- How does the system behave with very long entity names? (Names truncated in display with full name on hover, max 100 characters enforced)
- What happens if IndexedDB storage fails? (User sees error message with retry option)
- How does the interface behave on very small screens (320px width)? (Forms stack vertically, remain usable)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a way to access data management from the dashboard empty state
- **FR-002**: System MUST provide a way to access data management from the main dashboard when data exists
- **FR-003**: System MUST allow users to add bank accounts with name (required, max 100 chars), type (checking/savings/investment), and balance (non-negative number)
- **FR-004**: System MUST allow users to add projects with name (required, max 100 chars), amount (positive number), payment day (1-31), frequency (weekly/biweekly/monthly), and certainty (guaranteed/probable/uncertain)
- **FR-005**: System MUST set new projects to active by default
- **FR-006**: System MUST allow users to add fixed expenses with name (required, max 100 chars), amount (positive number), and due day (1-31)
- **FR-007**: System MUST set new expenses to active by default
- **FR-008**: System MUST allow users to add credit cards with name (required, max 100 chars), statement balance (non-negative number), and due day (1-31)
- **FR-009**: System MUST display all entities of each type in organized lists
- **FR-010**: System MUST visually distinguish active from inactive projects and expenses
- **FR-011**: System MUST allow inline editing of bank account balances
- **FR-012**: System MUST allow inline editing of credit card statement balances
- **FR-013**: System MUST allow full editing of all entity fields through edit forms
- **FR-014**: System MUST allow toggling active status for projects
- **FR-015**: System MUST allow toggling active status for expenses
- **FR-016**: System MUST allow deletion of any entity with confirmation
- **FR-017**: System MUST display inline validation errors for invalid input (empty names, negative amounts, out-of-range days)
- **FR-018**: System MUST persist all changes immediately using existing Zustand store actions
- **FR-019**: System MUST reflect all changes in the dashboard cashflow projection without manual refresh
- **FR-020**: System MUST provide responsive layouts that work on both desktop and mobile screens

### Key Entities

- **Bank Account**: Represents a financial account (checking, savings, or investment) with a current balance. Only checking accounts contribute to starting balance in cashflow calculations.
- **Project (Income Source)**: Represents recurring income with payment schedule and certainty level. Can be active or inactive. Inactive projects are excluded from cashflow calculations.
- **Fixed Expense**: Represents recurring bills or expenses with a due date. Can be active or inactive. Inactive expenses are excluded from cashflow calculations.
- **Credit Card**: Represents a credit card with monthly statement balance to be paid. Statement balance represents the amount due, not credit limit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete initial setup (add at least one of each entity type) in under 5 minutes
- **SC-002**: Users can complete monthly balance updates (update all credit card and bank account balances) in under 2 minutes
- **SC-003**: All form validation errors are displayed inline within 100ms of user input
- **SC-004**: All data changes reflect in the dashboard within 1 second of saving
- **SC-005**: Data persists across browser sessions (verified by refresh)
- **SC-006**: All forms are usable on mobile screens (minimum 320px width)
- **SC-007**: Users can navigate between data management and dashboard with a single action
- **SC-008**: 100% of invalid inputs are prevented from being saved (no negative amounts, empty names, or out-of-range days)

## Assumptions

- Users have a modern browser with IndexedDB support
- Users are managing personal/family finances (not enterprise-scale data)
- Maximum of approximately 20 entities per type is a reasonable upper bound
- shadcn/ui components will be installed as needed (currently empty ui folder)
- The existing Zustand store and Dexie.js database layer are stable and tested
- Navigation pattern will be determined during implementation (sidebar, tabs, or modal approach)
