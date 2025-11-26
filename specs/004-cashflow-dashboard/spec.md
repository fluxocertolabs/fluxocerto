# Feature Specification: Cashflow Dashboard

**Feature Branch**: `004-cashflow-dashboard`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "Build the Dashboard and Cashflow Visualization for Family Finance - the main screen that displays the 30-day cashflow projection chart."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View 30-Day Cashflow Projection (Priority: P1)

A user opens Family Finance to see their financial future at a glance. They immediately see a chart showing their projected balance over the next 30 days with two distinct scenarios: an optimistic projection (assuming all active income arrives) and a pessimistic projection (assuming only guaranteed income arrives). The visual distinction between scenarios helps them understand best-case versus worst-case financial outcomes.

**Why this priority**: This is the core value proposition of the dashboard - users need to see their financial trajectory before anything else. Without the chart, the dashboard has no purpose.

**Independent Test**: Can be fully tested by loading the dashboard with sample financial data and verifying the chart renders with two distinct scenario lines that accurately reflect the cashflow engine's calculations.

**Acceptance Scenarios**:

1. **Given** a user has bank accounts, income projects, and expenses configured, **When** they open the dashboard, **Then** they see a chart displaying 30 days of projected balances with optimistic and pessimistic lines clearly distinguishable.

2. **Given** a user has no financial data configured, **When** they open the dashboard, **Then** they see an empty state that guides them to add their first bank account or income source.

3. **Given** a user's data changes (account balance, new project, etc.), **When** they return to the dashboard, **Then** the chart reflects the updated projection within 1 second.

---

### User Story 2 - Identify Danger Days (Priority: P1)

A user needs to immediately know if their projected balance will go negative at any point in the next 30 days. When danger days exist, they are prominently highlighted on the chart and impossible to miss. The user can see exactly which days are problematic without scrolling or clicking.

**Why this priority**: Danger day detection is the key decision-support feature - it's why users check their cashflow projection. Equal priority with the chart because danger days must be visible within the chart.

**Independent Test**: Can be fully tested by creating financial data that produces negative balances on specific days and verifying those days are visually highlighted on the chart.

**Acceptance Scenarios**:

1. **Given** a user's projected balance goes negative on certain days, **When** they view the dashboard, **Then** those danger days are visually highlighted with a distinct warning indicator (color, marker, or shading).

2. **Given** a user has danger days in the pessimistic scenario but not the optimistic scenario, **When** they view the dashboard, **Then** they can distinguish which scenario has the danger (pessimistic line shows danger, optimistic does not).

3. **Given** a user has no danger days in either scenario, **When** they view the dashboard, **Then** no warning indicators appear and the chart displays normally.

---

### User Story 3 - View Summary Statistics (Priority: P2)

A user wants quick-glance numbers that summarize their financial situation without analyzing the chart in detail. They see key metrics including starting balance, projected income, projected expenses, ending balance, and danger day count for both scenarios.

**Why this priority**: Summary statistics provide context for the chart and quick answers to common questions. Important but secondary to the visual projection itself.

**Independent Test**: Can be fully tested by loading the dashboard with known financial data and verifying each summary statistic displays the correct calculated value.

**Acceptance Scenarios**:

1. **Given** a user has financial data configured, **When** they view the dashboard, **Then** they see a summary panel showing: starting balance, total projected income (both scenarios), total projected expenses, projected ending balance (both scenarios), and danger day count (if any).

2. **Given** a user has danger days, **When** they view the summary panel, **Then** the danger day count is prominently displayed with a warning style.

3. **Given** a user has no financial data, **When** they view the dashboard, **Then** the summary panel shows zeros or appropriate empty state indicators.

---

### User Story 4 - Explore Daily Details (Priority: P3)

A user wants to understand what happens on a specific day - which income arrives and which expenses are due. When they interact with a day on the chart (hover or click), they see detailed information about that day's events.

**Why this priority**: Day-level detail is valuable for planning but is a drill-down feature. Users first need the overview (P1/P2) before exploring specifics.

**Independent Test**: Can be fully tested by hovering/clicking on specific days in the chart and verifying the correct income and expense events are displayed.

**Acceptance Scenarios**:

1. **Given** a user views the chart on desktop, **When** they hover over a specific day, **Then** they see a tooltip showing: the date, optimistic balance, pessimistic balance, list of income events (project name and amount), and list of expense events (expense/card name and amount).

2. **Given** a day has no income or expense events, **When** the user views that day's details, **Then** the detail view shows the balances and indicates no events for that day.

3. **Given** a user is on a mobile device, **When** they tap a day on the chart, **Then** the day detail appears (tap-friendly interaction).

---

### Edge Cases

- What happens when all accounts have zero balance? The chart starts at zero and may show immediate danger if expenses occur before income.
- What happens when there are no active projects or expenses? The chart shows a flat line at the starting balance.
- What happens when a user has only savings/investment accounts (no checking)? Starting balance is zero per the engine's design (only checking accounts contribute).
- How does the chart handle months with fewer than 31 days when expenses/income are due on day 31? The cashflow engine handles this (adjusts to last day of month).
- What happens when the projection shows very large numbers (millions) or very small numbers (cents)? The chart scales appropriately and displays human-readable currency formatting.
- What happens when the cashflow engine fails or data cannot be loaded? The chart area displays an inline error message with a "Retry" button, allowing users to attempt recovery without leaving the dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a 30-day cashflow projection chart when the user opens the dashboard.
- **FR-002**: System MUST render two distinct visual elements for optimistic and pessimistic scenarios using green for optimistic and amber/orange for pessimistic, with area fills under each line.
- **FR-003**: System MUST display the X-axis as dates spanning the next 30 days from today.
- **FR-004**: System MUST display the Y-axis as currency values with appropriate formatting.
- **FR-005**: System MUST visually highlight danger days (negative balance) with distinct warning indicators.
- **FR-006**: System MUST display a summary statistics panel with: starting balance, total projected income (both scenarios), total projected expenses, projected ending balance (both scenarios), and danger day count.
- **FR-007**: System MUST show day-level details when user interacts with a specific day on the chart.
- **FR-008**: System MUST display an empty state with guidance when user has no financial data configured.
- **FR-009**: System MUST load and render the dashboard within 1 second of navigation.
- **FR-009a**: System MUST display skeleton/shimmer placeholders (matching chart and summary panel shapes) while data loads.
- **FR-010**: System MUST be responsive, displaying correctly on desktop and mobile screen sizes.
- **FR-011**: System MUST use data from the existing Zustand store and Dexie.js database.
- **FR-012**: System MUST use the existing cashflow engine for all projection calculations.
- **FR-013**: Dashboard MUST be read-only (no data editing capabilities in this feature).

### Key Entities

- **CashflowProjection**: The complete output from the cashflow engine containing daily snapshots, scenario summaries, and danger day information. This is the primary data source for the dashboard.
- **DailySnapshot**: Single day's financial state including optimistic/pessimistic balances and income/expense events. Used for chart data points and day details.
- **ScenarioSummary**: Aggregated statistics for each scenario (optimistic/pessimistic) including totals and danger day counts. Used for the summary panel.
- **DangerDay**: Represents a day with negative projected balance. Used for visual highlighting on the chart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see their 30-day projection within 1 second of opening the dashboard.
- **SC-002**: Users can identify danger days without scrolling, clicking, or any additional interaction beyond viewing the dashboard.
- **SC-003**: Users can distinguish between optimistic and pessimistic scenarios at a glance (visual differentiation is immediately apparent).
- **SC-004**: Users with no financial data see clear guidance on how to get started (empty state is informative, not just blank).
- **SC-005**: Dashboard displays correctly on screens from 320px (mobile) to 1920px+ (desktop) width.
- **SC-006**: Chart data matches the output of the cashflow engine exactly (no discrepancies between engine calculations and displayed values).
- **SC-007**: Users can access detailed information for any specific day within 2 interactions (hover/click).

## Clarifications

### Session 2025-11-26

- Q: Which charting library should be used for the 30-day projection chart? → A: Recharts
- Q: What loading state should be displayed while the cashflow engine calculates projections? → A: Skeleton/shimmer UI
- Q: How should the dashboard handle errors (engine failure or data load failure)? → A: Inline error message with retry button
- Q: How should day details be triggered on desktop vs mobile? → A: Hover tooltip on desktop, tap on mobile
- Q: What color scheme should distinguish optimistic vs pessimistic scenarios? → A: Green for optimistic, amber/orange for pessimistic

## Assumptions

- The dashboard chart will be implemented using **Recharts** (React-native composable charting library).
- Currency is displayed in the user's locale format (the system will use browser locale for formatting).
- The cashflow engine is already tested and produces correct calculations - this feature trusts the engine's output.
- Users have modern browsers that support the charting library's requirements.
- The 30-day projection period is fixed and not user-configurable in this feature.
- Mobile responsiveness means the chart is readable but may have simplified interactions (tap instead of hover).
- "Starting balance" refers to the sum of checking accounts only, per the existing engine design.
