# Feature Specification: Flexible Payment Schedule

**Feature Branch**: `007-flexible-payment-schedule`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "I want to improve the way we are handling payment of projects. Right now, on the payment modal, you can only set a payment day to a given day of the month, but that doesn't make sense for weekly payments. I may have payments every month, or every week, or 2 times a month. We need to have a way to properly set the dates accordingly, so on every week it should be on a given day of the week, if you select a month, should be a day, if it is 2 times a month you should select the two."

## Clarifications

### Session 2025-11-27

- Q: What day-of-week numbering convention should be used? → A: ISO 8601 convention (1 = Monday, 7 = Sunday)
- Q: What should be the canonical term for payments occurring twice per month? → A: "Twice a month" (user-friendly over formal "semi-monthly")
- Q: How should validation errors be displayed to the user? → A: Inline error message below the invalid input field
- Q: What should happen when a user opens an existing weekly project with invalid legacy day-of-month data? → A: Auto-select a default weekday (map legacy day to weekday of current month), allow user to change
- Q: In what order should the frequency options appear in the dropdown? → A: By frequency (most frequent first): Weekly, Biweekly, Twice a month, Monthly

### Terminology Note

- **UI Display**: "Twice a month" (user-friendly)
- **Code Enum**: `'twice-monthly'` (kebab-case, consistent with other enum values)
- **Removed**: `'one-time'` frequency is not supported in this feature (was never implemented in codebase)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Weekly Payment on a Specific Day of Week (Priority: P1)

As a user with weekly income (e.g., freelancer paid every Friday), I want to set my payment day as a day of the week so that my cashflow projections accurately reflect when I receive money.

**Why this priority**: Weekly payments are common for freelancers, contractors, and part-time workers. Without proper day-of-week support, the current "day of month" input produces incorrect projections for weekly income.

**Independent Test**: Can be fully tested by creating a project with weekly frequency, selecting a day of the week (e.g., Friday), and verifying the cashflow projections show payments on the correct days.

**Acceptance Scenarios**:

1. **Given** I am creating a new project with weekly frequency, **When** I select "Weekly" from the frequency dropdown, **Then** the payment day input changes from a day-of-month selector to a day-of-week selector (Monday through Sunday).

2. **Given** I have an existing project with weekly frequency and old day-of-month data, **When** I open the edit form, **Then** I see a day-of-week selector with a default weekday auto-selected (mapped from legacy day-of-month to weekday of current month), which I can change before saving.

3. **Given** I select "Friday" as my weekly payment day, **When** I view cashflow projections, **Then** payments appear on every Friday within the projection period.

---

### User Story 2 - Configure Monthly Payment on a Specific Day of Month (Priority: P1)

As a user with monthly income, I want to set my payment day as a specific day of the month so that projections accurately show when I'm paid.

**Why this priority**: Monthly payments are the most common frequency. This is the current behavior that must continue to work correctly.

**Independent Test**: Can be fully tested by creating a project with monthly frequency, selecting a day (e.g., 15th), and verifying payments appear on the 15th of each month in projections.

**Acceptance Scenarios**:

1. **Given** I am creating a new project with monthly frequency, **When** I select "Monthly" from the frequency dropdown, **Then** I see a day-of-month input (1-31).

2. **Given** I set payment day to 31, **When** viewing projections for February, **Then** the payment adjusts to the last day of February (28 or 29).

3. **Given** I update the frequency from weekly to monthly, **When** the frequency changes, **Then** the payment day input automatically switches to day-of-month format.

---

### User Story 3 - Configure Twice a Month Payment (Priority: P2)

As a user paid twice per month (e.g., on the 1st and 15th), I want to specify both payment days so my cashflow projections accurately reflect my income schedule.

**Why this priority**: Twice a month payments are common in many employment arrangements. The user explicitly mentioned "2 times a month" as a needed frequency option.

**Independent Test**: Can be fully tested by creating a project with "Twice a month" frequency, selecting two days (e.g., 1st and 15th), and verifying projections show payments on both days each month.

**Acceptance Scenarios**:

1. **Given** I am creating a new project with "Twice a month" frequency, **When** I select "Twice a month" from the frequency dropdown, **Then** I see two day-of-month inputs to specify both payment days.

2. **Given** I select 1st and 15th as my "Twice a month" payment days, **When** I view cashflow projections, **Then** payments appear on both the 1st and 15th of each month.

3. **Given** I select 15th and 31st as my "Twice a month" payment days for February, **When** viewing projections, **Then** the 31st adjusts to February 28th (or 29th in leap year).

---

### User Story 4 - Dynamic Form Adaptation Based on Frequency (Priority: P1)

As a user changing the payment frequency, I want the form to immediately update and show the appropriate input controls so I can correctly configure my payment schedule.

**Why this priority**: This is the core UX mechanism that enables all other user stories. Without dynamic form adaptation, users cannot properly configure different frequency types.

**Independent Test**: Can be fully tested by changing the frequency dropdown and observing the payment day input updating in real-time without page reload.

**Acceptance Scenarios**:

1. **Given** I am on the project form, **When** I change frequency from "Monthly" to "Weekly", **Then** the payment day input immediately changes from a day-of-month number field to a day-of-week dropdown.

2. **Given** I am on the project form with "Weekly" selected, **When** I change frequency to "Twice per month", **Then** the input immediately changes to show two day-of-month fields.

3. **Given** I had selected "Friday" for weekly payment, **When** I change frequency to "Monthly", **Then** the previously selected "Friday" is cleared and I'm prompted to enter a day of month.

---

### Edge Cases

- What happens when a user selects day 31 for "Twice a month" and the month doesn't have 31 days?
  - System uses the last available day of the month (consistent with current month-end handling).
  
- What happens when editing an existing project with legacy day-of-month data for weekly frequency?
  - System auto-selects a default weekday by mapping the legacy day-of-month to the corresponding weekday in the current month. User can change this selection before saving.
  
- What happens if both "Twice a month" days are the same?
  - System validates and prevents saving, displaying an inline error message below the input field indicating both days must be different.

- What happens when switching frequencies with partially filled data?
  - Previous payment day selection is cleared when frequency changes, avoiding invalid data combinations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a day-of-week dropdown (Monday-Sunday) when "Weekly" frequency is selected.
- **FR-002**: System MUST display a day-of-month input (1-31) when "Monthly" frequency is selected.
- **FR-003**: System MUST display two day-of-month inputs when "Twice a month" frequency is selected.
- **FR-004**: System MUST dynamically update the payment day input when frequency selection changes.
- **FR-005**: System MUST validate that both "Twice a month" days are different before allowing save, displaying inline error messages below the relevant input field.
- **FR-006**: System MUST clear existing payment day selection when frequency type changes (to prevent invalid data combinations).
- **FR-007**: System MUST handle month-end edge cases for day-of-month selections (e.g., day 31 in February becomes day 28/29).
- **FR-008**: System MUST update the existing "biweekly" frequency to use day-of-week selection (consistent with weekly).
- **FR-009**: System MUST persist the appropriate payment schedule data based on frequency type.
- **FR-010**: System MUST recalculate cashflow projections correctly based on the new payment schedule format.

### Key Entities

- **PaymentSchedule**: Represents when payments occur. Varies by frequency type:
  - For weekly/biweekly: stores day of week using ISO 8601 convention (1 = Monday, 7 = Sunday)
  - For monthly: stores day of month (1-31)
  - For twice a month: stores two days of month (e.g., [1, 15])

- **Frequency**: The payment recurrence pattern. Options displayed in order (most frequent first): Weekly, Biweekly, Twice a month, Monthly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully create and save projects for all four frequency types (weekly, biweekly, twice a month, monthly) within 30 seconds.
- **SC-002**: 100% of weekly frequency projects display payments on the correct day of week in cashflow projections.
- **SC-003**: 100% of "Twice a month" frequency projects display exactly two payments per month on the configured days.
- **SC-004**: Form input type changes within 100ms of frequency selection change (perceived as instant).
- **SC-005**: Existing monthly projects continue to function without requiring user re-configuration.
- **SC-006**: Zero data validation errors occur when switching between frequency types due to invalid data combinations.

## Assumptions

- Day of week numbering follows ISO 8601 convention (1 = Monday, 7 = Sunday) for consistency with international standards and date-fns ISO functions.
- The "biweekly" frequency means every two weeks (14 days), not twice per week.
- "Twice a month" payments occur on two fixed days each month, not on floating intervals like "every 15 days".
- Migration of existing data is not required for the MVP - existing projects will continue to work, and users can optionally update them to use the new format.
