# Feature Specification: Single-Shot Expenses

**Feature Branch**: `014-single-shot-expenses`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Add support for single-shot expenses (one-time expenses) - expenses that occur on a specific calendar date, not recurring"

## Clarifications

### Session 2025-11-28

- Q: What features are explicitly out of scope for single-shot expenses? → A: Exclude categories, recurring conversion, reminders, attachments/receipts, notes/descriptions, tags, bulk import/export, templates, and duplication
- Q: What should the empty state show when no single-shot expenses exist? → A: Illustrated empty state with message + prominent "Adicionar" CTA button
- Q: Should single-shot expenses be a new table or extend existing expenses? → A: Extend existing expenses table with `type` column, properly organized to support both fixed and single-shot types
- Q: How is a single-shot expense marked as paid? → A: No manual paid status; expense is considered past/paid automatically when its date has passed (consistent with cashflow behavior)
- Q: Where should single-shot expenses be placed in the Manage page? → A: Sub-tab under existing "Despesas" section with tabs: "Fixas" / "Pontuais"

## Out of Scope

The following features are explicitly **NOT** part of this specification:

- Expense categories or tagging
- Converting single-shot expenses to/from recurring expenses
- Payment reminders or notifications
- File attachments or receipt uploads
- Notes or description fields (beyond the name)
- Expense tags
- Bulk import/export functionality
- Expense templates
- Expense duplication (copy feature)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a Single-Shot Expense (Priority: P1)

A user wants to track a one-time expense that will occur on a specific date in the future. They navigate to the Manage page, access the single-shot expenses section, and create a new expense with a name, amount, and specific calendar date. The expense is saved and will appear in their cashflow projection on that exact date.

**Why this priority**: This is the core feature that enables users to track one-time expenses. Without this, the feature has no value.

**Independent Test**: Can be fully tested by creating a new single-shot expense with name "IPVA 2025", amount R$ 2.500, date "2025-01-20" and verifying it appears in the list and persists after page refresh.

**Acceptance Scenarios**:

1. **Given** a user is on the Manage page, **When** they navigate to the single-shot expenses section and click "Adicionar Despesa Pontual", **Then** a form appears with fields for name, amount, and date

2. **Given** a user has filled in name="Seguro do Carro", amount=R$ 3.000, date=2025-03-15, **When** they submit the form, **Then** the expense is saved and appears in the single-shot expenses list

3. **Given** a user is adding a single-shot expense, **When** they select a date using the date picker, **Then** they can choose any date (past, present, or future)

4. **Given** a user leaves the name field empty, **When** they try to submit, **Then** validation prevents submission and shows an error message

5. **Given** a user enters an amount of zero or negative, **When** they try to submit, **Then** validation prevents submission and shows an error message

---

### User Story 2 - View Single-Shot Expenses in Cashflow (Priority: P1)

A user has added several single-shot expenses with specific dates. When viewing the cashflow projection on the Dashboard, they expect to see each expense appear on its scheduled date, impacting the projected balance.

**Why this priority**: This is equally critical as P1-Story 1. The feature has no value if single-shot expenses don't appear in the cashflow projection.

**Independent Test**: Can be tested by creating a single-shot expense for a date within the projection period and verifying it appears as an expense event on that date in the cashflow chart tooltip.

**Acceptance Scenarios**:

1. **Given** a single-shot expense of R$ 2.500 scheduled for 2025-01-20, **When** the cashflow is calculated for a period including January 20th, **Then** an expense event of R$ 2.500 appears on that date

2. **Given** a single-shot expense scheduled for a date outside the projection period, **When** the cashflow is calculated, **Then** the expense does not appear in the projection

3. **Given** multiple single-shot expenses on the same date, **When** the cashflow is calculated, **Then** all expenses appear as separate events on that date

4. **Given** a single-shot expense on the same date as a fixed expense, **When** viewing the cashflow tooltip, **Then** both expenses are listed separately

5. **Given** a single-shot expense exists, **When** viewing either optimistic or pessimistic scenario, **Then** the expense appears in both scenarios (single-shot expenses are certain to occur)

---

### User Story 3 - Edit a Single-Shot Expense (Priority: P2)

A user realizes they entered the wrong amount or date for a single-shot expense. They want to edit the expense to correct the information.

**Why this priority**: Important for data accuracy but secondary to core creation and viewing functionality.

**Independent Test**: Can be tested by editing an existing single-shot expense's amount and date, then verifying the changes persist and reflect in the cashflow.

**Acceptance Scenarios**:

1. **Given** a single-shot expense exists in the list, **When** the user clicks the edit button, **Then** a form appears pre-populated with the expense's current values

2. **Given** a user is editing a single-shot expense, **When** they change the date from 2025-01-20 to 2025-02-15 and save, **Then** the expense now appears on February 15th in the cashflow instead of January 20th

3. **Given** a user is editing a single-shot expense, **When** they change the amount from R$ 2.500 to R$ 3.000 and save, **Then** the new amount is reflected in the list and cashflow

---

### User Story 4 - Delete a Single-Shot Expense (Priority: P2)

A user no longer needs to track a particular single-shot expense (e.g., it was paid or cancelled). They want to remove it from the system.

**Why this priority**: Standard CRUD operation, important but secondary to creation and viewing.

**Independent Test**: Can be tested by deleting an existing single-shot expense and verifying it no longer appears in the list or cashflow.

**Acceptance Scenarios**:

1. **Given** a single-shot expense exists in the list, **When** the user clicks the delete button, **Then** a confirmation dialog appears

2. **Given** the user confirms deletion, **When** the operation completes, **Then** the expense is removed from the list and no longer appears in the cashflow

3. **Given** the user cancels deletion, **When** the dialog closes, **Then** the expense remains unchanged

---

### User Story 5 - View Upcoming Single-Shot Expenses (Priority: P3)

A user wants to see a chronological list of their upcoming single-shot expenses to plan their finances. They view the list sorted by date with clear indication of which expenses are in the past.

**Why this priority**: Enhances usability but the feature works without it.

**Independent Test**: Can be tested by adding several single-shot expenses with different dates and verifying the list displays them in chronological order with past expenses visually distinguished.

**Acceptance Scenarios**:

1. **Given** multiple single-shot expenses exist with dates 2025-03-15, 2025-01-20, 2025-02-10, **When** viewing the list, **Then** they appear in chronological order: Jan 20, Feb 10, Mar 15

2. **Given** a single-shot expense has a date in the past, **When** viewing the list, **Then** it is visually distinguished (e.g., muted styling, "Vencido" badge)

3. **Given** a single-shot expense has a date today, **When** viewing the list, **Then** it shows a "Hoje" indicator

---


### Empty State

When no single-shot expenses exist, the UI displays:
- An illustrative graphic (consistent with app design language)
- Message: "Nenhuma despesa pontual cadastrada"
- Subtext: "Adicione despesas que ocorrem uma única vez, como IPVA, seguros ou compras específicas"
- Prominent "Adicionar Despesa Pontual" CTA button

### Edge Cases

- What happens when a user creates a single-shot expense for today's date? → Expense is valid and appears in today's cashflow
- What happens when a user creates a single-shot expense for a past date? → Allowed (for historical tracking), expense is marked as past in the list
- How does the system handle leap years (e.g., February 29)? → Date picker allows any valid calendar date
- What happens when the projection period doesn't include the expense date? → Expense simply doesn't appear in that projection; no error
- What happens when a single-shot expense is deleted while viewing the cashflow? → Cashflow updates to remove the expense event
- How are single-shot expenses distinguished from fixed expenses in the UI? → Sub-tabs under "Despesas" section: "Fixas" tab and "Pontuais" tab

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create single-shot expenses with name, amount (in cents), and specific calendar date
- **FR-002**: System MUST validate that name is non-empty (1-100 characters)
- **FR-003**: System MUST validate that amount is a positive integer greater than zero
- **FR-004**: System MUST allow any valid calendar date (past, present, or future)
- **FR-005**: System MUST display single-shot expenses in the cashflow projection on their exact scheduled date
- **FR-006**: System MUST include single-shot expenses in both optimistic and pessimistic scenarios (they are certain expenses)
- **FR-007**: System MUST allow users to edit existing single-shot expenses (name, amount, date)
- **FR-008**: System MUST allow users to delete single-shot expenses with confirmation
- **FR-009**: System MUST display single-shot expenses in chronological order by date
- **FR-010**: System MUST visually distinguish past expenses from upcoming expenses
- **FR-011**: System MUST automatically consider single-shot expenses as "past" when their date has passed (no manual paid status)
- **FR-012**: System MUST persist single-shot expenses to Supabase with appropriate RLS policies
- **FR-013**: System MUST display single-shot expenses in the cashflow chart tooltip alongside other expense events
- **FR-014**: System MUST provide a dedicated section/tab for managing single-shot expenses, separate from fixed expenses

### Key Entities *(include if feature involves data)*

- **Expense** (unified table): Supports both fixed and single-shot expense types via a `type` discriminator column.
  
  **Common attributes** (all expense types):
  - `id` (UUID, primary key)
  - `user_id` (UUID, reference to auth.users)
  - `name` (string, 1-100 chars)
  - `amount` (integer, cents)
  - `type` (enum: 'fixed' | 'single_shot')
  - `created_at`, `updated_at` (timestamps)

  **Fixed expense attributes** (when `type = 'fixed'`):
  - `day_of_month` (integer, 1-31) - required
  - `date` - NULL

  **Single-shot expense attributes** (when `type = 'single_shot'`):
  - `date` (date) - required, specific calendar date
  - `day_of_month` - NULL
  - Note: No `is_paid` column; past status is derived from comparing `date` to current date

  **Database constraints**:
  - CHECK constraint: when `type = 'fixed'`, `day_of_month` must be NOT NULL and `date` must be NULL
  - CHECK constraint: when `type = 'single_shot'`, `date` must be NOT NULL and `day_of_month` must be NULL
  - Existing fixed expenses will be migrated to include `type = 'fixed'`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a single-shot expense in under 30 seconds (validated via manual testing: open form + enter name + enter amount + select date + save)
- **SC-002**: Single-shot expenses appear correctly in the cashflow projection on their exact date 100% of the time
- **SC-003**: Users can distinguish single-shot expenses from fixed expenses at a glance in the Manage page
- **SC-004**: Single-shot expenses persist correctly across page refreshes and sessions
- **SC-005**: Users can view, edit, and delete single-shot expenses with the same ease as other financial entities

## Assumptions

- Single-shot expenses are always considered "certain" - they appear in both optimistic and pessimistic cashflow scenarios
- The UI will be in Brazilian Portuguese (pt-BR) consistent with the existing application
- Single-shot expenses will be accessible via a sub-tab under the existing "Despesas" section, with tabs labeled "Fixas" and "Pontuais"
- The date picker will use a standard calendar date picker component (not a day-of-month selector like fixed expenses)
- Single-shot expenses are independent of credit card payments - they represent direct cash outflows
- Single-shot expenses have no manual "paid" status; they are automatically considered past when their date has passed (consistent with cashflow behavior)
- Amount is stored in cents (integer) consistent with all other monetary values in the application
