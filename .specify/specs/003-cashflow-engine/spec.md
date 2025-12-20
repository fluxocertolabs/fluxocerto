# Feature Specification: Cashflow Calculation Engine

**Feature Branch**: `003-cashflow-engine`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "Build the Cashflow Calculation Engine for Fluxo Certo - a pure TypeScript module that projects daily cashflow balances over a configurable period."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Basic Cashflow Projection (Priority: P1)

As a household financial planner, I want to see a day-by-day projection of my cashflow so that I can understand when money will come in and go out over the next month.

**Why this priority**: This is the core value proposition - without basic projection capability, the engine has no purpose. All other features build on this foundation.

**Independent Test**: Can be fully tested by providing sample financial data (accounts, income, expenses) and verifying the engine produces a daily balance array with correct calculations.

**Acceptance Scenarios**:

1. **Given** bank accounts with a combined balance of $5,000, **When** I request a 30-day projection starting today, **Then** I receive an array of 30 daily snapshots starting with $5,000 as Day 0 balance
2. **Given** a monthly income of $3,000 on the 15th and a monthly expense of $1,500 on the 1st, **When** I project from the 1st of a month for 30 days, **Then** the balance decreases by $1,500 on day 1 and increases by $3,000 on day 15
3. **Given** no income or expenses configured, **When** I request a projection, **Then** all daily balances equal the starting balance from bank accounts

---

### User Story 2 - Dual Scenario Comparison (Priority: P1)

As a cautious financial planner, I want to see both optimistic and pessimistic projections simultaneously so that I can understand my best-case and worst-case financial positions.

**Why this priority**: Dual scenarios are essential for realistic financial planning - a single projection would be misleading. This is core to the feature's value.

**Independent Test**: Can be tested by providing income sources with different certainty levels and verifying two separate balance trajectories are calculated.

**Acceptance Scenarios**:

1. **Given** guaranteed income of $2,000 and probable income of $1,000, **When** I generate a projection, **Then** the optimistic scenario includes $3,000 total income and pessimistic includes only $2,000
2. **Given** uncertain income of $500, **When** I generate a projection, **Then** the optimistic scenario includes this income and pessimistic scenario excludes it
3. **Given** only guaranteed income sources, **When** I generate a projection, **Then** both optimistic and pessimistic scenarios show identical balances

---

### User Story 3 - Handle Payment Frequencies (Priority: P2)

As a user with various income schedules, I want the engine to correctly calculate weekly, biweekly, and monthly payments so that my projection accurately reflects my actual payment schedule.

**Why this priority**: Many households have biweekly paychecks or weekly income - without frequency support, projections would be inaccurate for most users.

**Independent Test**: Can be tested by configuring income with each frequency type and verifying payments occur on the correct days within a projection period.

**Acceptance Scenarios**:

1. **Given** monthly income with paymentDay=15, **When** I project for 60 days starting January 1st, **Then** income appears on January 15th and February 15th only
2. **Given** biweekly income with paymentDay=5, **When** I project for 30 days starting on the 5th, **Then** income appears on days 1, 15, and 29 (every 14 days from first occurrence)
3. **Given** weekly income with paymentDay=1, **When** I project for 30 days starting on the 1st, **Then** income appears on days 1, 8, 15, 22, and 29 (every 7 days)

---

### User Story 4 - Detect Danger Days (Priority: P2)

As a financial planner, I want to be alerted when my projected balance goes negative so that I can take preventive action before running out of money.

**Why this priority**: Identifying potential overdrafts is a key decision-support feature - it transforms raw data into actionable insights.

**Independent Test**: Can be tested by creating a scenario where expenses exceed income and verifying danger days are correctly identified with dates and deficit amounts.

**Acceptance Scenarios**:

1. **Given** a starting balance of $500 and an expense of $600 on day 5, **When** I generate a projection, **Then** day 5 and subsequent days are flagged as danger days with negative balance amounts
2. **Given** a pessimistic scenario that goes negative but optimistic stays positive, **When** I generate a projection, **Then** danger days are tracked separately for each scenario
3. **Given** a balance that goes negative then recovers, **When** I generate a projection, **Then** only the days with negative balance are flagged as danger days

---

### User Story 5 - Handle Month-End Edge Cases (Priority: P3)

As a user with payments on the 31st, I want the engine to correctly handle months with fewer days so that payments still occur at month-end when appropriate.

**Why this priority**: Edge case handling ensures reliability, but affects fewer users than core functionality.

**Independent Test**: Can be tested by configuring a payment on day 31 and projecting through February to verify it falls on the last day of that month.

**Acceptance Scenarios**:

1. **Given** an expense with dueDay=31, **When** I project through February (non-leap year), **Then** the expense occurs on February 28th
2. **Given** an income with paymentDay=31, **When** I project through April (30 days), **Then** the income occurs on April 30th
3. **Given** an expense with dueDay=30, **When** I project through February, **Then** the expense occurs on February 28th (last day)

---

### User Story 6 - Generate Summary Statistics (Priority: P3)

As a financial planner, I want summary statistics alongside the daily projection so that I can quickly understand the overall financial picture without analyzing each day.

**Why this priority**: Summaries enhance usability but the core projection data is more essential.

**Independent Test**: Can be tested by generating a projection and verifying the summary object contains accurate totals that match the sum of daily events.

**Acceptance Scenarios**:

1. **Given** a projection with multiple income and expense events, **When** I generate a projection, **Then** the summary includes totalIncome, totalExpenses, and projectedEndBalance that match the daily calculations
2. **Given** both guaranteed and non-guaranteed income, **When** I generate a projection, **Then** the summary shows totalIncome (optimistic) and totalGuaranteedIncome (pessimistic) separately
3. **Given** danger days in the projection, **When** I generate a projection, **Then** the summary includes dangerDayCount for both scenarios

---

### Edge Cases

- What happens when paymentDay is 29, 30, or 31 and the month has fewer days? → Use the last day of that month
- What happens when no bank accounts exist? → Starting balance is $0
- What happens when projection period is 0 days? → Return empty projection with only initial state
- What happens when all income sources are inactive? → Project with expenses only
- What happens when start date is in the past? → Calculate normally (engine is date-agnostic)
- What happens with leap years for February 29th payments? → Payment occurs on Feb 29 in leap years, Feb 28 otherwise
- What happens with invalid input (negative amounts, missing fields, invalid frequencies)? → Fail fast with descriptive error messages

## Out of Scope

- Currency conversion (single currency assumed)
- Historical data storage or retrieval
- UI/visualization components
- Notifications or alerts (engine only identifies danger days; alerting is caller's responsibility)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Engine MUST accept arrays of bank accounts, income sources, fixed expenses, and credit cards as input
- **FR-002**: Engine MUST calculate initial balance as the sum of balances from bank accounts where `type === 'checking'` (see data-model.md)
- **FR-003**: Engine MUST generate daily snapshots for the specified projection period (default 30 days)
- **FR-004**: Engine MUST calculate two parallel scenarios: optimistic (all active income) and pessimistic (guaranteed income only)
- **FR-005**: Engine MUST apply monthly payments when the day-of-month matches the configured payment/due day
- **FR-006**: Engine MUST apply biweekly payments every 14 days from the first occurrence in the projection period
- **FR-007**: Engine MUST apply weekly payments every 7 days from the first occurrence in the projection period
- **FR-008**: Engine MUST handle month-end edge cases by using the last day of the month when paymentDay/dueDay exceeds the month's length
- **FR-009**: Engine MUST identify and track danger days (negative balance) separately for each scenario
- **FR-010**: Engine MUST include income events and expense events in each daily snapshot
- **FR-011**: Engine MUST generate a summary object with totals and danger day counts
- **FR-012**: Engine MUST treat credit card due day payments as expenses
- **FR-013**: Engine MUST only include active income sources and expenses in calculations
- **FR-014**: Engine MUST be implemented as pure functions with no side effects
- **FR-015**: Engine MUST not mutate input data
- **FR-016**: Engine MUST validate input and throw descriptive errors for invalid data (negative amounts, missing required fields, invalid frequency/certainty values). Error messages MUST include the field name and reason for failure (e.g., "amount: must be a positive number, received -100")

### Key Entities

- **Bank Account**: Represents a financial account with a balance; used to calculate starting position. Key attributes: name, type, balance
- **IncomeSource**: Represents recurring income with payment schedule and certainty level. Key attributes: name, amount, paymentDay, frequency, certainty (`guaranteed` | `uncertain`), isActive
- **Fixed Expense**: Represents recurring monthly expenses. Key attributes: name, amount, dueDay, isActive
- **Credit Card**: Represents credit card payment obligations. Key attributes: name, statementBalance, dueDay
- **Daily Snapshot**: Represents the financial state for a single day. Key attributes: date, optimisticBalance, pessimisticBalance, incomeEvents, expenseEvents
- **Danger Day**: Represents a day with negative projected balance. Key attributes: date, balance, scenario
- **Projection Summary**: Aggregated statistics for the entire projection period. Key attributes: startingBalance, totalIncome, totalGuaranteedIncome, totalExpenses, projectedEndBalance, dangerDayCount

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Engine produces accurate projections where running balance equals starting balance plus all income minus all expenses for any given day
- **SC-002**: All calculation functions are pure (same inputs always produce same outputs, no side effects)
- **SC-003**: Engine correctly handles all three frequency types (weekly, biweekly, monthly) with 100% accuracy across any projection period
- **SC-004**: Month-end edge cases are handled correctly for all months including February in leap and non-leap years
- **SC-005**: Danger days are identified with 100% accuracy (no false positives or negatives)
- **SC-006**: Optimistic and pessimistic scenarios diverge only based on income certainty levels
- **SC-007**: Summary statistics match the sum of individual daily events exactly
- **SC-008**: Engine can process 100 total entities (combined count of bank accounts, income sources, fixed expenses, and credit cards) with a 30-day projection in < 100ms

## Clarifications

### Session 2025-11-26

- Q: What certainty levels should income sources support? → A: Two levels: `guaranteed` and `uncertain`
- Q: How should the engine handle invalid input data? → A: Fail fast with descriptive errors
- Q: What is the acceptable performance target for projection calculation? → A: < 100ms for 100 entities, 30-day projection
- Q: What should be explicitly out of scope for this engine? → A: Currency conversion, historical data storage, UI/visualization, notifications
- Q: Should "Project" be renamed to a clearer term for income sources? → A: Yes, rename to `IncomeSource`

## Terminology Glossary

| Spec Term | Data Layer Term | Notes |
|-----------|-----------------|-------|
| IncomeSource | Project | The existing data layer uses "Project" to represent income sources. This engine uses "IncomeSource" for clarity. |
| guaranteed | guaranteed | Income that will definitely be received |
| uncertain | probable, uncertain | The data layer supports three certainty levels (`guaranteed`, `probable`, `uncertain`). For pessimistic scenario calculations, both `probable` and `uncertain` are treated as non-guaranteed income. |

## Assumptions

- The existing data layer provides properly structured entity data matching the described schemas (note: data layer may use "Project" terminology which maps to `IncomeSource` in this engine)
- All monetary amounts are in a single currency (no currency conversion needed)
- **Frequency first occurrence logic**: For biweekly/weekly payments, the "first occurrence" is determined by finding the first day within the projection period where the payment day matches. If the configured `paymentDay` is before the projection start date's day-of-month, the first occurrence is the next matching day. For example: if `paymentDay=5` and projection starts on the 10th, the first occurrence is the 5th of the following month (or the next week for weekly).
- Credit card payments are treated as single monthly expenses on the due day using the statementBalance amount
- **Credit cards are always active**: Unlike IncomeSource and FixedExpense, CreditCard entities do not have an `isActive` flag - all credit cards with a non-zero `statementBalance` are included in calculations
- The projection period uses calendar days (not business days)
- Inactive entities (IncomeSource, FixedExpense) are filtered out before being passed to the engine or the engine handles the isActive flag
