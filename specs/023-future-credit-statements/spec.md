# Feature Specification: Future Credit Card Statements

**Feature Branch**: `023-future-credit-statements`  
**Created**: 2025-12-02  
**Status**: Draft  
**Input**: User description: "Build a 'Future Credit Card Statements' feature for the Family Finance application that allows users to pre-define credit card statement balances (valor da fatura) for upcoming months, beyond just the current month."

## Clarifications

### Session 2025-12-02

- Q: What specific user action triggers the month progression check? → A: App launch/login only (once per session)
- Q: How should the 12-month limit be calculated? → A: Rolling 12 months from current date
- Q: Should the system allow a zero (R$ 0,00) statement amount? → A: Allow zero (valid scenario for months with no charges)
- Q: What should display when a credit card has no future statements? → A: Collapsed/minimal placeholder with CTA "Adicionar próxima fatura"
- Q: For months without a defined future statement, what value should cashflow display? → A: Show zero (R$ 0,00) for undefined months
- User requirement: All changes must include unit tests, visual regression tests, and e2e tests

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Future Statement to Credit Card (Priority: P1)

A user knows their upcoming credit card bills from installment purchases (compras parceladas), recurring subscriptions, or planned expenses. They want to record these future values so their cashflow projection accurately reflects what they'll actually owe in upcoming months.

**Why this priority**: This is the foundational capability - without the ability to add future statements, no other feature can work. Users get immediate value by having accurate future cashflow projections.

**Independent Test**: Can be fully tested by adding a future statement for January 2025 with R$ 3.200 to an existing credit card and verifying it appears in the UI and updates the cashflow chart for that month.

**Acceptance Scenarios**:

1. **Given** a user has a credit card "Nubank" with current statement R$ 2.500, **When** they add a future statement for "Janeiro/2025" with R$ 3.200, **Then** the future statement is saved and displayed in a "Próximas Faturas" section below the current statement.

1a. **Given** a user has a credit card with no future statements defined, **When** they view the card details, **Then** a collapsed/minimal "Próximas Faturas" placeholder is shown with a CTA "Adicionar próxima fatura" to guide feature discovery.

2. **Given** a user is viewing their credit card details, **When** they click "Adicionar Próxima Fatura" (Add Next Statement), **Then** the system pre-fills the month/year field with the next logical month after the last scheduled statement.

3. **Given** a user has future statements for Jan, Feb, and Mar 2025, **When** they view the cashflow chart extending into these months, **Then** the chart shows R$ 3.200 expense in January, R$ 3.000 in February, and R$ 2.800 in March instead of repeating the current statement balance.

---

### User Story 2 - Edit or Delete Future Statement (Priority: P2)

A user's expected credit card bill changes (e.g., they paid off an installment early, or added a new recurring expense). They need to update or remove the future statement values they previously defined.

**Why this priority**: Users frequently need to adjust their projections as circumstances change. Without editing, the feature would require deleting and recreating entries.

**Independent Test**: Can be tested by editing a future statement amount from R$ 3.200 to R$ 2.800 and verifying the cashflow updates accordingly.

**Acceptance Scenarios**:

1. **Given** a user has a future statement for "Janeiro/2025" with R$ 3.200, **When** they edit the amount to R$ 2.800, **Then** the updated value is saved and reflected in the cashflow projection.

2. **Given** a user has a future statement for "Fevereiro/2025", **When** they delete it, **Then** the statement is removed and the cashflow projection for that month displays R$ 0,00 (indicating no defined expense for that month).

3. **Given** a user tries to edit a future statement for a month that has now passed, **When** they save changes, **Then** the system prevents the edit and displays an appropriate message.

---

### User Story 3 - Automatic Statement Progression (Priority: P3)

When a new billing cycle begins (the current month's statement has passed its due date and a new month arrives), the system should automatically promote the next pre-defined future statement to become the "current" statement, keeping the user's data up-to-date without manual intervention.

**Why this priority**: This automation reduces user maintenance burden and ensures cashflow remains accurate even if users forget to update. However, the feature provides significant value even with manual updates.

**Independent Test**: Can be tested by simulating a month change (or waiting for actual month change) and verifying the current statement value updates to the pre-defined future value.

**Acceptance Scenarios**:

1. **Given** it's December 2024 with current statement R$ 2.500 and a pre-defined January 2025 statement of R$ 3.200, **When** the calendar date moves to January 2025 (after the December due date), **Then** the "Fatura Atual" automatically shows R$ 3.200 and the January entry is removed from "Próximas Faturas".

2. **Given** it's December 2024 with current statement R$ 2.500 and no pre-defined January 2025 statement, **When** the calendar date moves to January 2025, **Then** the "Fatura Atual" remains R$ 2.500 (user must update manually).

3. **Given** multiple future statements exist (Jan, Feb, Mar), **When** the system progresses from December to January, **Then** only the January value becomes current; February and March remain as future statements.

---

### User Story 4 - View Upcoming Statement Schedule (Priority: P4)

A user wants to see at a glance all their upcoming credit card obligations across all their cards. This helps them plan their cashflow and identify months with unusually high credit card bills.

**Why this priority**: This is a convenience feature that improves UX but isn't strictly necessary - users can see this information in the cashflow chart.

**Independent Test**: Can be tested by adding multiple future statements to multiple cards and verifying they all appear in a consolidated view.

**Acceptance Scenarios**:

1. **Given** a user has credit cards "Nubank" and "Itaú" with future statements defined, **When** they view the credit card management section, **Then** each card shows its own list of upcoming statements with month/year and amount.

2. **Given** a user has 3 future statements defined for a single card, **When** they view the card's details, **Then** the statements are displayed in chronological order (nearest month first).

---

### Edge Cases

- **What happens when user defines a future statement for the current month?** The system should warn that this will overwrite the current "Fatura Atual" value and ask for confirmation.

- **What happens when user tries to add duplicate month/year for same card?** The system should prevent this and suggest editing the existing entry instead.

- **How does the system handle when user deletes a credit card with future statements?** All associated future statements are deleted along with the card.

- **What happens if multiple months pass without user login (e.g., user gone for 2 months)?** The system should process all applicable month progressions, promoting values sequentially or keeping the last known value if no pre-defined values exist.

- **What happens with leap years and months with varying days?** Month/year selection should handle this transparently - the statement is associated with the month, not a specific day.

- **What is the maximum planning horizon?** Users can add statements up to 12 months in advance. This provides reasonable planning without unlimited data growth.

- **Can users enter a zero amount?** Yes, R$ 0,00 is a valid statement amount representing months where no charges are expected (e.g., card temporarily unused). Negative amounts are not allowed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add future statement balances to any credit card, specifying month/year and amount (valor da fatura)
- **FR-002**: System MUST display future statements in a "Próximas Faturas" section for each credit card, ordered chronologically
- **FR-003**: System MUST allow users to edit the amount of any future statement that hasn't yet become current
- **FR-004**: System MUST allow users to delete any future statement
- **FR-005**: System MUST prevent adding more than one future statement per month/year combination per credit card
- **FR-006**: System MUST use pre-defined future statement values in cashflow projections; months without a defined future statement display as R$ 0,00 (zero) rather than repeating the current statement or carrying forward previous values
- **FR-007**: System MUST automatically promote the appropriate future statement to "current" when a new billing cycle begins
- **FR-008**: System MUST preserve the current statement value if no future statement is defined for the upcoming month
- **FR-009**: System MUST limit future statements to a rolling 12-month window from the current date (e.g., if today is December 2024, users can add statements through December 2025; when January 2025 arrives, the limit extends to January 2026)
- **FR-010**: System MUST delete all associated future statements when a credit card is deleted
- **FR-011**: System MUST warn users when adding a future statement for the current month (which would overwrite the current balance)
- **FR-012**: System MUST automatically clean up past-month entries during month progression (they become irrelevant after being promoted)

### Testing Requirements

- **TR-001**: All new or modified code MUST include unit tests covering business logic, validation rules, and edge cases
- **TR-002**: All UI changes MUST include visual regression tests to prevent unintended styling regressions
- **TR-003**: All user-facing features MUST include end-to-end (e2e) tests covering critical user journeys defined in acceptance scenarios
- **TR-004**: Test coverage applies to additions, modifications, and deletions — any code change requires corresponding test updates

### Key Entities *(include if feature involves data)*

- **FutureStatement**: Represents a pre-defined credit card statement for a specific future month. Contains: credit card reference, target month/year, statement amount (valor da fatura), creation timestamp, and update timestamp.

- **CreditCard (Extended)**: The existing CreditCard entity gains a relationship to zero or more FutureStatement records. The current `statementBalance` field remains unchanged and represents the current month's fatura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a future statement for any month within the next 12 months in under 30 seconds
- **SC-002**: Users can view all their scheduled future statements (across all cards) in a single screen view
- **SC-003**: Cashflow projections accurately reflect pre-defined future statement values for their respective months
- **SC-004**: When a new month begins, the appropriate future statement value (if any) becomes the current statement on the user's next session (app launch/login triggers a one-time progression check per session)
- **SC-005**: Users can plan their credit card obligations for up to 12 months ahead
- **SC-006**: 100% of future statement changes are immediately reflected in the cashflow chart upon save
- **SC-007**: All implemented features have corresponding unit tests, visual regression tests, and e2e tests before merge

---

## Assumptions

1. **Billing Cycle Timing**: Month progression occurs based on calendar month change, not on the specific "fechamento da fatura" (closing date) of each card. This simplifies implementation while remaining practical for most users.

2. **Single Currency**: All amounts are in BRL (Brazilian Real), consistent with the existing application.

3. **No Recurring Patterns**: Future statements are defined individually per month - there's no "repeat this amount for X months" automation. Users manually add each month's expected value.

4. **Statement vs Payment**: "Fatura" (statement) represents the amount owed, not necessarily the amount the user will pay (minimum payment vs full payment). The system tracks the full statement amount.

5. **User-Initiated Progression Check**: The automatic month progression check runs once per session at app launch/login (not via background jobs or on every page load). This is consistent with the existing app's offline-first, client-side architecture and ensures predictable, testable behavior.

6. **Delete Cascade**: Deleting a credit card deletes all its future statements - there's no orphan handling.
