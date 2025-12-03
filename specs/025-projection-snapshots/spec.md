# Feature Specification: Historical Projection Snapshots

**Feature Branch**: `025-projection-snapshots`  
**Created**: December 3, 2025  
**Status**: Draft  
**Input**: User description: "Feature: Historical Projection Snapshots - Users need to save snapshots of their financial outlook at specific points in time to track progress and compare past predictions with reality."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save Current Projection as Snapshot (Priority: P1)

As a user reviewing my financial projection, I want to save the current projection state so that I can compare my past predictions with reality later.

**Why this priority**: This is the foundational capability that enables all other features. Without the ability to save snapshots, no other functionality can exist. Users need this to start building a history.

**Independent Test**: Can be fully tested by navigating to the dashboard, clicking "Save Snapshot", entering a name, and verifying the snapshot appears in the history list. Delivers immediate value by preserving a point-in-time financial outlook.

**Acceptance Scenarios**:

1. **Given** I am on the dashboard viewing my cashflow projection, **When** I click the "Save Snapshot" action, **Then** I see a prompt to name my snapshot with a sensible default (current date).

2. **Given** I have initiated the save snapshot action, **When** I confirm the save, **Then** the system stores all current financial state including: account balances, credit card balances, expense definitions, income definitions, future statements, and the calculated projection result.

3. **Given** I save a snapshot, **When** the save completes, **Then** I see a success confirmation and the new snapshot appears in my history.

4. **Given** I have no checking accounts set up, **When** I try to save a snapshot, **Then** the system creates a snapshot with zero starting balance (matching current projection behavior).

---

### User Story 2 - View Snapshot History (Priority: P2)

As a user who has saved snapshots, I want to see a list of all my saved snapshots so that I can browse my financial history and select one to review.

**Why this priority**: After saving snapshots (P1), users need a way to discover and access them. This is the navigation hub for the feature.

**Independent Test**: Can be tested by navigating to the History page and verifying saved snapshots appear with summary information. Users can browse their financial tracking history.

**Acceptance Scenarios**:

1. **Given** I have saved multiple snapshots, **When** I navigate to the History page, **Then** I see a list of all snapshots sorted by creation date (newest first).

2. **Given** I am viewing the snapshot list, **When** I look at a snapshot entry, **Then** I see: snapshot name, creation date, and key metrics (starting balance, projected end balance, and danger day count).

3. **Given** I have no saved snapshots, **When** I navigate to the History page, **Then** I see a helpful empty state explaining how to save snapshots.

4. **Given** I have many snapshots, **When** I view the list, **Then** I can scroll through them efficiently without performance degradation.

---

### User Story 3 - View Individual Snapshot Details (Priority: P3)

As a user reviewing my financial history, I want to open a specific snapshot and see the full projection chart and summary cards exactly as they appeared when saved, so that I can analyze my past financial outlook.

**Why this priority**: This completes the core loop - users can save (P1), browse (P2), and now review (P3) their historical data in detail.

**Independent Test**: Can be tested by selecting a snapshot from history and verifying the full projection visualization loads using the frozen data. Users can deeply analyze any past projection.

**Acceptance Scenarios**:

1. **Given** I am viewing the snapshot history, **When** I click on a snapshot entry, **Then** I navigate to a detailed view showing the full projection chart and summary cards.

2. **Given** I am viewing a snapshot detail page, **When** the page loads, **Then** I see the exact same chart visualization as the main dashboard (optimistic/pessimistic lines, danger zones, etc.) rendered from the frozen data.

3. **Given** I am viewing a snapshot detail page, **When** I look at the summary cards, **Then** I see starting balance, expected income, total expenses, ending balance, and danger day indicators matching the frozen projection.

4. **Given** I am viewing a snapshot detail page, **When** I interact with the chart, **Then** the view is clearly marked as read-only and historical (no edit actions available).

5. **Given** I am viewing a snapshot, **When** I want to return to my history, **Then** I can easily navigate back to the history list.

---

### User Story 4 - Delete Snapshot (Priority: P4)

As a user managing my financial history, I want to delete snapshots I no longer need so that I can keep my history organized.

**Why this priority**: A quality-of-life feature that isn't required for core functionality but prevents clutter over time.

**Independent Test**: Can be tested by selecting a snapshot and confirming deletion. Users can maintain a clean history.

**Acceptance Scenarios**:

1. **Given** I am viewing the snapshot history or a snapshot detail, **When** I click the delete action, **Then** I see a confirmation dialog warning that this action is permanent.

2. **Given** I confirm snapshot deletion, **When** the deletion completes, **Then** the snapshot is permanently removed and I see an updated history list.

3. **Given** I cancel snapshot deletion, **When** I dismiss the confirmation, **Then** the snapshot remains unchanged.

---

### Edge Cases

- What happens when a user tries to save a snapshot with a duplicate name? → Allow duplicate names; snapshots are distinguished by creation timestamp.
- What happens when the user's financial data changes after saving a snapshot? → Snapshot remains unchanged; it captures point-in-time data.
- How does the system handle very long projection periods (e.g., 365 days)? → Store the full projection regardless of length; JSON storage accommodates variable sizes.
- What happens if the user deletes financial entities (accounts, expenses) that appear in a snapshot? → Snapshot data is independent; historical data remains intact.
- Is there a limit on how many snapshots a household can save? → No limit; users may create unlimited snapshots and manage storage via manual deletion.
- What happens if snapshot save fails (network error, timeout)? → Show toast error message with "Retry" button; no automatic retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Save Snapshot" action accessible from the main projection dashboard.
- **FR-002**: System MUST capture and store the complete input state when creating a snapshot: all bank accounts with current balances, all credit cards with statement balances, all active fixed and single-shot expenses, all recurring and single-shot income definitions, and all future statements.
- **FR-003**: System MUST store the calculated `CashflowProjection` result (daily snapshots, optimistic/pessimistic summaries) to avoid recalculation drift over time.
- **FR-004**: System MUST allow users to name their snapshots with a default suggestion (current date in user-friendly format).
- **FR-005**: System MUST automatically record the creation timestamp for each snapshot.
- **FR-006**: System MUST provide a dedicated History page listing all saved snapshots for the current household.
- **FR-007**: System MUST display snapshot summary metrics in the history list: creation date, starting balance, projected end balance (optimistic), and danger day count.
- **FR-008**: System MUST allow users to open any snapshot and view the complete projection visualization (chart and summary cards).
- **FR-009**: System MUST render the snapshot detail view as read-only with a clear "Historical Snapshot" indicator.
- **FR-010**: System MUST reuse existing chart and summary panel components for the snapshot detail view, passing frozen data instead of live data.
- **FR-011**: System MUST allow users to delete snapshots with a confirmation step.
- **FR-012**: Snapshot data MUST be isolated per household (respecting existing RLS patterns).
- **FR-013**: System MUST display an appropriate empty state when no snapshots exist.

### Key Entities

- **Projection Snapshot**: A point-in-time capture stored in a dedicated `projection_snapshots` table with normalized metadata columns (id, household_id, name, created_at, schema_version) and a JSONB `data` column containing the frozen input state and projection result. The `schema_version` field enables best-effort rendering of snapshots created with older data structures.
- **Snapshot Input State**: The frozen state of all financial definitions at capture time - stored within the JSONB `data` column to enable exact reconstruction of the projection context.
- **Snapshot Projection Result**: The complete `CashflowProjection` output including daily snapshots and scenario summaries - stored within the JSONB `data` column to avoid recalculation and ensure consistency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save a projection snapshot within 3 seconds of clicking the save action.
- **SC-002**: The History page loads and displays up to 50 snapshots within 2 seconds.
- **SC-003**: Opening a snapshot detail view renders the full visualization within 2 seconds.
- **SC-004**: 100% of snapshot data persists accurately - when viewing a historical snapshot, all values match exactly what was captured at save time.
- **SC-005**: Users can successfully complete the save-browse-review flow (P1→P2→P3) without confusion or errors.
- **SC-006**: Snapshot storage accommodates projection periods from 1 to 365 days without degradation.

## Clarifications

### Session 2025-12-03

- Q: What database storage strategy should be used for snapshots? → A: Dedicated `projection_snapshots` table with normalized metadata columns (id, household_id, name, created_at) plus a JSONB column for frozen state data.
- Q: Is snapshot comparison (vs current projection) in scope? → A: Out of scope for this release; defer to future feature.
- Q: Should there be a maximum snapshot limit per household? → A: No limit; allow unlimited snapshots with manual deletion.
- Q: How to handle schema versioning for old snapshots? → A: Store schema version with each snapshot; render old snapshots as-is (best-effort display).
- Q: How should save operation failures be handled? → A: Show toast error with retry button; no automatic retry.

## Assumptions

- Users access this feature within the existing authenticated session (leveraging current auth patterns).
- The existing `CashflowChart` and `SummaryPanel` components accept projection data as props and can render without modification.
- Structured JSON storage is suitable for the snapshot data volume (typical household has <20 accounts/expenses/income sources).
- Snapshot naming is optional convenience; the creation date provides sufficient identification for most users.
- The feature targets individual household use; no multi-household comparison is in scope.

## Out of Scope

- **Snapshot Comparison**: Side-by-side comparison of snapshots or diff views comparing a historical snapshot against the current projection. Users can manually compare by viewing snapshots individually. Comparison features are deferred to a future release.
- **Snapshot Export**: Exporting snapshot data to external formats (CSV, PDF, etc.).
- **Snapshot Sharing**: Sharing snapshots across households or with external users.
