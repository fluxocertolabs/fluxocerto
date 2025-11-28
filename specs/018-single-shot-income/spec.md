# Feature Specification: Single-Shot Income

**Feature Branch**: `018-single-shot-income`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Add support for single-shot income (one-time income) - income that occurs on a specific calendar date, not recurring"

## Out of Scope

The following features are explicitly **NOT** part of this specification:

- Income categories or tagging
- Converting single-shot income to/from recurring projects
- Payment reminders or notifications
- File attachments or receipt uploads
- Notes or description fields (beyond the name)
- Income tags
- Bulk import/export functionality
- Income templates
- Income duplication (copy feature)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a Single-Shot Income (Priority: P1)

A user wants to track a one-time income event that will occur on a specific date. They navigate to the Manage page, access the single-shot income section under "Projetos", and create a new income entry with a name, amount, specific calendar date, and certainty level. The income is saved and will appear in their cashflow projection on that exact date.

**Why this priority**: This is the core feature that enables users to track one-time income events. Without this, the feature has no value.

**Independent Test**: Can be fully tested by creating a new single-shot income with name "Restituição IR 2025", amount R$ 5.000, date "2025-06-15", certainty "guaranteed" and verifying it appears in the list and persists after page refresh.

**Acceptance Scenarios**:

1. **Given** a user is on the Manage page, **When** they navigate to the "Projetos" section and select the "Pontuais" tab, **Then** they see a list of single-shot income entries (or empty state if none exist)

2. **Given** a user is in the single-shot income section, **When** they click "Adicionar Receita Pontual", **Then** a form appears with fields for name, amount, date, and certainty level

3. **Given** a user has filled in name="Venda do Carro", amount=R$ 25.000, date=2025-04-10, certainty="guaranteed", **When** they submit the form, **Then** the income is saved and appears in the single-shot income list

4. **Given** a user is adding a single-shot income, **When** they select a date using the date picker, **Then** they can choose any date (past, present, or future)

5. **Given** a user leaves the name field empty, **When** they try to submit, **Then** validation prevents submission and shows an error message

6. **Given** a user enters an amount of zero or negative, **When** they try to submit, **Then** validation prevents submission and shows an error message

---

### User Story 2 - View Single-Shot Income in Cashflow (Priority: P1)

A user has added several single-shot income entries with specific dates and certainty levels. When viewing the cashflow projection on the Dashboard, they expect to see each income entry appear on its scheduled date, impacting the projected balance according to the selected scenario.

**Why this priority**: This is equally critical as P1-Story 1. The feature has no value if single-shot income doesn't appear in the cashflow projection.

**Independent Test**: Can be tested by creating a single-shot income for a date within the projection period and verifying it appears as an income event on that date in the cashflow chart tooltip.

**Acceptance Scenarios**:

1. **Given** a single-shot income of R$ 5.000 with certainty "guaranteed" scheduled for 2025-06-15, **When** the cashflow is calculated for a period including June 15th, **Then** an income event of R$ 5.000 appears on that date in both optimistic and pessimistic scenarios

2. **Given** a single-shot income of R$ 10.000 with certainty "probable" scheduled for 2025-07-01, **When** viewing the optimistic scenario, **Then** the income appears; **When** viewing the pessimistic scenario, **Then** the income does NOT appear

3. **Given** a single-shot income of R$ 3.000 with certainty "uncertain" scheduled for 2025-08-20, **When** viewing the optimistic scenario, **Then** the income appears; **When** viewing the pessimistic scenario, **Then** the income does NOT appear

4. **Given** a single-shot income scheduled for a date outside the projection period, **When** the cashflow is calculated, **Then** the income does not appear in the projection

5. **Given** multiple single-shot income entries on the same date, **When** the cashflow is calculated, **Then** all income entries appear as separate events on that date

6. **Given** a single-shot income on the same date as a recurring project payment, **When** viewing the cashflow tooltip, **Then** both income sources are listed separately

---

### User Story 3 - Edit a Single-Shot Income (Priority: P2)

A user realizes they entered the wrong amount, date, or certainty level for a single-shot income. They want to edit the entry to correct the information.

**Why this priority**: Important for data accuracy but secondary to core creation and viewing functionality.

**Independent Test**: Can be tested by editing an existing single-shot income's amount, date, and certainty, then verifying the changes persist and reflect in the cashflow.

**Acceptance Scenarios**:

1. **Given** a single-shot income exists in the list, **When** the user clicks the edit button, **Then** a form appears pre-populated with the income's current values

2. **Given** a user is editing a single-shot income, **When** they change the date from 2025-06-15 to 2025-07-20 and save, **Then** the income now appears on July 20th in the cashflow instead of June 15th

3. **Given** a user is editing a single-shot income, **When** they change the amount from R$ 5.000 to R$ 7.500 and save, **Then** the new amount is reflected in the list and cashflow

4. **Given** a user is editing a single-shot income, **When** they change the certainty from "uncertain" to "guaranteed" and save, **Then** the income now appears in both optimistic and pessimistic scenarios

---

### User Story 4 - Delete a Single-Shot Income (Priority: P2)

A user no longer needs to track a particular single-shot income (e.g., it was received or cancelled). They want to remove it from the system.

**Why this priority**: Standard CRUD operation, important but secondary to creation and viewing.

**Independent Test**: Can be tested by deleting an existing single-shot income and verifying it no longer appears in the list or cashflow.

**Acceptance Scenarios**:

1. **Given** a single-shot income exists in the list, **When** the user clicks the delete button, **Then** a confirmation dialog appears

2. **Given** the user confirms deletion, **When** the operation completes, **Then** the income is removed from the list and no longer appears in the cashflow

3. **Given** the user cancels deletion, **When** the dialog closes, **Then** the income remains unchanged

---

### User Story 5 - View Upcoming Single-Shot Income (Priority: P3)

A user wants to see a chronological list of their single-shot income entries to plan their finances. They view the list sorted by date with clear indication of which income events are in the past.

**Why this priority**: Enhances usability but the feature works without it.

**Independent Test**: Can be tested by adding several single-shot income entries with different dates and verifying the list displays them in chronological order with past entries visually distinguished.

**Acceptance Scenarios**:

1. **Given** multiple single-shot income entries exist with dates 2025-07-15, 2025-05-20, 2025-06-10, **When** viewing the list, **Then** they appear in chronological order: May 20, Jun 10, Jul 15

2. **Given** a single-shot income has a date in the past, **When** viewing the list, **Then** it is visually distinguished (e.g., muted styling, "Recebido" badge)

3. **Given** a single-shot income has a date today, **When** viewing the list, **Then** it shows a "Hoje" indicator

---

### Empty State

When no single-shot income entries exist, the UI displays:
- An illustrative graphic (consistent with app design language)
- Message: "Nenhuma receita pontual cadastrada"
- Subtext: "Adicione receitas que ocorrem uma única vez, como restituição de IR, bônus ou venda de bens"
- Prominent "Adicionar Receita Pontual" CTA button

### Edge Cases

- What happens when a user creates a single-shot income for today's date? → Income is valid and appears in today's cashflow
- What happens when a user creates a single-shot income for a past date? → Allowed (for historical tracking), income is marked as past in the list
- How does the system handle leap years (e.g., February 29)? → Date picker allows any valid calendar date
- What happens when the projection period doesn't include the income date? → Income simply doesn't appear in that projection; no error
- What happens when a single-shot income is deleted while viewing the cashflow? → Cashflow updates to remove the income event
- How are single-shot income entries distinguished from recurring projects in the UI? → Sub-tabs under "Projetos" section: "Recorrentes" tab and "Pontuais" tab

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create single-shot income with name, amount (in cents), specific calendar date, and certainty level
- **FR-002**: System MUST validate that name is non-empty (1-100 characters)
- **FR-003**: System MUST validate that amount is a positive integer greater than zero
- **FR-004**: System MUST allow any valid calendar date (past, present, or future)
- **FR-005**: System MUST require a certainty level selection (guaranteed, probable, or uncertain)
- **FR-006**: System MUST display single-shot income in the cashflow projection on their exact scheduled date
- **FR-007**: System MUST include "guaranteed" single-shot income in both optimistic and pessimistic scenarios
- **FR-008**: System MUST include "probable" and "uncertain" single-shot income only in the optimistic scenario
- **FR-009**: System MUST allow users to edit existing single-shot income (name, amount, date, certainty)
- **FR-010**: System MUST allow users to delete single-shot income with confirmation
- **FR-011**: System MUST display single-shot income in chronological order by date
- **FR-012**: System MUST visually distinguish past income entries from upcoming entries
- **FR-013**: System MUST automatically consider single-shot income as "past" when their date has passed (no manual received status)
- **FR-014**: System MUST persist single-shot income to Supabase with appropriate RLS policies
- **FR-015**: System MUST display single-shot income in the cashflow chart tooltip alongside other income events
- **FR-016**: System MUST provide a dedicated section/tab for managing single-shot income, separate from recurring projects

### Key Entities *(include if feature involves data)*

- **Project** (unified table): Extended to support both recurring and single-shot income types via a `type` discriminator column.
  
  **Common attributes** (all project types):
  - `id` (UUID, primary key)
  - `user_id` (UUID, reference to auth.users)
  - `name` (string, 1-100 chars)
  - `amount` (integer, cents)
  - `type` (enum: 'recurring' | 'single_shot')
  - `certainty` (enum: 'guaranteed' | 'probable' | 'uncertain')
  - `created_at`, `updated_at` (timestamps)

  **Recurring project attributes** (when `type = 'recurring'`):
  - `frequency` (enum: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly') - required
  - `payment_schedule` (JSONB) - required
  - `is_active` (boolean) - required
  - `date` - NULL

  **Single-shot income attributes** (when `type = 'single_shot'`):
  - `date` (date) - required, specific calendar date
  - `frequency` - NULL
  - `payment_schedule` - NULL
  - `is_active` - NULL (always considered active)
  - Note: No `is_received` column; past status is derived from comparing `date` to current date

  **Database constraints**:
  - CHECK constraint: when `type = 'recurring'`, `frequency`, `payment_schedule`, and `is_active` must be NOT NULL and `date` must be NULL
  - CHECK constraint: when `type = 'single_shot'`, `date` must be NOT NULL and `frequency`, `payment_schedule` must be NULL
  - Existing recurring projects will be migrated to include `type = 'recurring'`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a single-shot income entry in under 30 seconds (validated via manual testing with stopwatch: start timer when clicking "Adicionar Receita Pontual" → stop timer when entry appears in list after save; test with pre-determined values: name="Test Income", amount=1000, date=tomorrow, certainty=guaranteed)
- **SC-002**: Single-shot income appears correctly in the cashflow projection on their exact date 100% of the time
- **SC-003**: Certainty levels correctly affect scenario visibility (guaranteed in both, probable/uncertain in optimistic only)
- **SC-004**: Users can distinguish single-shot income from recurring projects at a glance in the Manage page
- **SC-005**: Single-shot income persists correctly across page refreshes and sessions
- **SC-006**: Users can view, edit, and delete single-shot income with the same ease as other financial entities

## Assumptions

- Single-shot income uses the same certainty levels as recurring projects (guaranteed, probable, uncertain) and follows the same scenario rules
- The UI will be in Brazilian Portuguese (pt-BR) consistent with the existing application
- Single-shot income will be accessible via a sub-tab under the existing "Projetos" section, with tabs labeled "Recorrentes" and "Pontuais"
- The date picker will use a standard calendar date picker component (same as single-shot expenses)
- Single-shot income has no manual "received" status; they are automatically considered past when their date has passed (consistent with cashflow behavior)
- Amount is stored in cents (integer) consistent with all other monetary values in the application
- The implementation will follow the same patterns established by single-shot expenses (extending the existing table with a type discriminator)
