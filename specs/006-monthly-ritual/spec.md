# Feature Specification: Monthly Ritual Enhancement

**Feature Branch**: `006-monthly-ritual`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "Build the Monthly Ritual Enhancement feature for Family Finance - a streamlined experience for the monthly balance update workflow that is the core recurring use case."

## Clarifications

### Session 2025-11-26

- Q: FR-005 states balances are auto-saved on field blur, but FR-014 says "Cancel" discards session changes. What should "Cancel" do? → A: Cancel discards only unsaved changes (auto-saved values persist)
- Q: What should happen when an auto-save operation fails? → A: Show inline error on the specific field with retry option
- Q: Where should the health indicator be positioned on the dashboard? → A: Top of dashboard, above the chart (first visible element)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Balance Update Mode (Priority: P1)

As a user performing my monthly financial update, I want a dedicated focused view that shows only the balances I need to update (bank accounts and credit card statements), so I can complete my monthly update ritual in under 2 minutes instead of navigating between tabs.

**Why this priority**: This is the core feature that directly addresses the primary problem - reducing monthly update time from ~5 minutes to under 2 minutes. Without this, the feature fails to deliver its main value proposition.

**Independent Test**: Can be fully tested by opening the Quick Balance Update view, entering new balance values for accounts and credit cards, and verifying all values are saved correctly. Delivers immediate value by streamlining the monthly workflow.

**Acceptance Scenarios**:

1. **Given** I am on the dashboard with existing accounts and credit cards, **When** I click "Update Balances", **Then** I see a focused view showing all bank account balances and credit card statement balances in a single list.

2. **Given** I am in the Quick Balance Update view, **When** I see an account or credit card entry, **Then** I see the entity name, current balance displayed as the primary editable field (larger font, high contrast), and the previous balance shown as secondary reference text (smaller, muted color).

3. **Given** I am in the Quick Balance Update view, **When** I click on a balance field, **Then** I can directly edit the value inline without opening a modal or navigating away.

4. **Given** I am editing a balance field, **When** I press Tab, **Then** focus moves to the next balance field for rapid sequential entry.

5. **Given** I have made balance updates, **When** I click "Done", **Then** I am returned to the dashboard and all my changes have been saved.

6. **Given** I am in the Quick Balance Update view, **When** I click "Cancel" or press Escape, **Then** I am returned to the dashboard; any already auto-saved changes persist, only the currently unsaved field (if any) is discarded.

7. **Given** I have no bank accounts or credit cards configured, **When** I click "Update Balances", **Then** I see an empty state prompting me to add accounts/cards first with a link to the Manage page.

---

### User Story 2 - Dashboard Health Indicator (Priority: P2)

As a user opening the app, I want to see an immediate at-a-glance health status indicator, so I can quickly understand my financial situation without analyzing the entire chart.

**Why this priority**: This provides immediate value on every app open by surfacing the most critical information upfront. It complements the quick update flow by showing users the impact of their updates.

**Independent Test**: Can be tested by setting up various financial scenarios (healthy, warning, danger) and verifying the correct indicator displays. Delivers value by providing instant financial health awareness.

**Acceptance Scenarios**:

1. **Given** I have no danger days in either scenario, **When** I view the dashboard, **Then** I see a green "Good" health indicator with text "No issues detected".

2. **Given** I have danger days only in the pessimistic scenario, **When** I view the dashboard, **Then** I see an amber "Warning" indicator with text showing the count of danger days in the pessimistic scenario.

3. **Given** I have danger days in the optimistic scenario (which implies pessimistic too), **When** I view the dashboard, **Then** I see a red "Danger" indicator with text showing danger days exist even in the best-case scenario.

4. **Given** any balance (account or credit card) was last updated more than 30 days ago, **When** I view the dashboard, **Then** I see a "Stale data" warning badge on the health indicator prompting me to update balances.

5. **Given** I see a stale data warning, **When** I click on it, **Then** I am taken directly to the Quick Balance Update view.

---

### User Story 3 - Configurable Projection Length (Priority: P3)

As a user, I want to change how far into the future the projection looks, so I can plan for different time horizons (weekly planning vs quarterly planning).

**Why this priority**: Extends the utility of the app for different planning needs. The current 30-day default works for most cases, but power users benefit from flexibility.

**Independent Test**: Can be tested by changing the projection period and verifying the chart, calculations, and summary all update correctly. Delivers value by supporting different financial planning horizons.

**Acceptance Scenarios**:

1. **Given** I am on the dashboard, **When** I look at the header area, **Then** I see a dropdown or selector showing the current projection period (defaulting to "30 days").

2. **Given** I click the projection period selector, **When** the options appear, **Then** I see choices: 7 days, 14 days, 30 days, 60 days, 90 days.

3. **Given** I select a different projection period, **When** the selection is made, **Then** the chart updates to show that many days, all summary statistics recalculate, and danger day detection adjusts to the new period.

4. **Given** I select a projection period, **When** I close and reopen the app, **Then** my preference is remembered and the same period is used.

5. **Given** I am on a mobile device with limited screen width, **When** I view the projection selector, **Then** it remains usable and doesn't break the layout.

---

### User Story 4 - Surplus/Deficit Summary (Priority: P4)

As a user completing my monthly update, I want to see a clear surplus or deficit amount at the end of the projection period, so I can quickly answer "How much can I invest or save this month?".

**Why this priority**: Provides actionable insight that directly supports financial decision-making. Builds on existing summary panel functionality.

**Independent Test**: Can be tested by setting up scenarios with positive and negative end balances and verifying correct surplus/deficit display. Delivers value by answering the key monthly question.

**Acceptance Scenarios**:

1. **Given** the optimistic scenario ends with a positive balance, **When** I view the summary panel, **Then** I see "Surplus of €X" displayed in green for the optimistic scenario.

2. **Given** the optimistic scenario ends with a negative balance, **When** I view the summary panel, **Then** I see "Deficit of €X" displayed in red for the optimistic scenario.

3. **Given** optimistic and pessimistic scenarios have different end balances, **When** I view the surplus/deficit, **Then** I see both values clearly distinguished (e.g., "Surplus: €500 optimistic / €200 pessimistic").

4. **Given** the projection shows a surplus, **When** I view it, **Then** the value represents the net change from starting balance (end balance minus starting balance), not just the end balance.

---

### Edge Cases

- What happens when all accounts have zero balance? → Show €0 surplus/deficit, health indicator shows "Good" (no negative balances)
- What happens when a user has only credit cards, no bank accounts? → Starting balance is €0 (only checking accounts count), projection runs normally, likely showing danger days
- What happens when balance update is interrupted (browser closes)? → Changes are saved immediately on each field blur/change, so partial updates are preserved
- What happens with very large projection periods (90 days) and many entities? → Projection recalculation must complete within 500ms; if exceeded, show loading indicator during calculation
- What happens when "last updated" timestamp doesn't exist (legacy data)? → Treat as stale (assume needs update) and show stale data warning
- What happens when auto-save fails (IndexedDB error)? → Show inline error on the specific field with a retry button; user can retry or continue editing other fields

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Quick Balance Update" view accessible from the dashboard via an "Update Balances" button
- **FR-002**: Quick Balance Update view MUST display all bank accounts and credit cards in a single scrollable list
- **FR-003**: Each balance entry MUST show: entity name, entity type indicator (account/card), current editable balance field, and previous balance as reference
- **FR-004**: Balance fields MUST support inline editing with keyboard navigation (Tab to move between fields)
- **FR-005**: System MUST save balance changes immediately when a field loses focus (auto-save pattern); on save failure, display inline error on the field with a retry option
- **FR-006**: System MUST track "last updated" timestamp for each bank account and credit card balance
- **FR-007**: System MUST display a health indicator at the top of the dashboard (above the chart, first visible element) showing: Good (green), Warning (amber), or Danger (red) status
- **FR-008**: Health indicator MUST show "Stale data" warning when any balance hasn't been updated in 30+ days
- **FR-009**: System MUST allow users to select projection period from: 7, 14, 30 (default), 60, or 90 days
- **FR-010**: System MUST persist the user's projection period preference in local storage
- **FR-011**: System MUST recalculate all projections, charts, and summaries when projection period changes
- **FR-012**: System MUST display surplus/deficit amount (end balance minus starting balance) for both scenarios
- **FR-013**: Surplus MUST be displayed in green; deficit MUST be displayed in red
- **FR-014**: Quick Balance Update view MUST provide "Done" button to return to dashboard and "Cancel" to exit without saving the currently active field (auto-saved values persist)
- **FR-015**: System MUST show empty state in Quick Balance Update when no accounts or credit cards exist

### Key Entities *(include if feature involves data)*

- **BankAccount**: Extended with `balanceUpdatedAt` timestamp to track when balance was last modified
- **CreditCard**: Extended with `balanceUpdatedAt` timestamp to track when statement balance was last modified  
- **UserPreferences**: New entity to store user settings including `projectionDays` (number: 7|14|30|60|90)

## Success Criteria *(mandatory)*

### Measurable Outcomes

*Note: Time-based criteria (SC-001 through SC-004, SC-007) are validated through manual testing during development and QA. Automated performance tests may be added in future iterations.*

- **SC-001**: Users can complete the monthly balance update ritual (updating all account and credit card balances) in under 2 minutes, measured from clicking "Update Balances" to returning to dashboard
- **SC-002**: Users can identify their financial health status (Good/Warning/Danger) within 3 seconds of opening the dashboard
- **SC-003**: Users can determine if their data is stale and needs updating within 3 seconds of opening the dashboard
- **SC-004**: Users can change projection period and see updated results within 2 seconds
- **SC-005**: Users can answer "How much can I save this month?" by viewing the surplus/deficit without any additional calculation
- **SC-006**: 90% of balance update sessions complete successfully without errors (no failed saves)
- **SC-007**: The Quick Balance Update view loads and is interactive within 1 second of clicking "Update Balances"

## Assumptions

- Users typically have 2-5 bank accounts and 2-4 credit cards (reasonable household setup)
- Monthly update frequency is sufficient; users don't need real-time bank sync
- The existing local-first architecture (Dexie/IndexedDB) is adequate for the new features
- The "previous balance" shown is the balance at the start of the current update session, not historical data
- Currency formatting follows the existing app conventions (Euro symbol, 2 decimal places)
- The 30-day stale threshold is appropriate for monthly update workflows
- Auto-save on field blur is acceptable UX (no explicit "Save" button needed per field)
