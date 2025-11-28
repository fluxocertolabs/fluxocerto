# Feature Specification: Investment-Inclusive Balance Line

**Feature Branch**: `016-investment-balance-line`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Build an Investment-Inclusive Balance Line feature for the Family Finance dashboard that adds a third line to the cashflow chart showing total balance including investment accounts, and makes legend items interactive for toggling line visibility"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Total Balance Including Investments (Priority: P1)

As a family finance user, I want to see my total financial picture including investment accounts on the cashflow chart, so that I understand my true wealth position beyond just operational cashflow.

**Why this priority**: This is the core value proposition - users currently only see checking account projections and want visibility into their complete financial position including investments.

**Independent Test**: Can be fully tested by viewing the cashflow chart with at least one investment account and verifying a third line appears showing pessimistic balance plus investment totals.

**Acceptance Scenarios**:

1. **Given** a user has checking accounts with total balance R$5,000 and investment accounts with total balance R$50,000, **When** they view the cashflow chart, **Then** they see a third line labeled "Saldo com Investimentos" that starts at R$55,000 (pessimistic starting balance + investment total) and follows the pessimistic scenario pattern offset by the investment amount.

2. **Given** a user has no investment accounts, **When** they view the cashflow chart, **Then** the "Saldo com Investimentos" line still appears but matches the pessimistic line exactly (since investment total is R$0).

3. **Given** a user has investment accounts totaling R$100,000, **When** the pessimistic scenario shows a danger day (balance < 0), **Then** the "Saldo com Investimentos" line may still be positive, showing that liquid investments could cover the shortfall if needed.

---

### User Story 2 - Toggle Chart Line Visibility (Priority: P2)

As a user analyzing my finances, I want to click on legend items to hide/show specific lines on the chart, so that I can focus on comparing specific scenarios without visual clutter.

**Why this priority**: Enhances usability by allowing focused analysis, but the feature provides value even without this interactivity.

**Independent Test**: Can be fully tested by clicking any legend item and verifying the corresponding chart element toggles visibility.

**Acceptance Scenarios**:

1. **Given** all chart lines are visible, **When** a user clicks on "Otimista" in the legend, **Then** the optimistic line disappears from the chart and the legend item appears visually muted (reduced opacity and/or strikethrough).

2. **Given** the "Pessimista" line is hidden, **When** a user clicks on "Pessimista" again, **Then** the line reappears and the legend item returns to normal appearance.

3. **Given** a user has hidden "Otimista" and "Pessimista" lines, **When** they view the chart, **Then** only "Saldo com Investimentos" line and danger zone remain visible.

4. **Given** a user clicks on "Zona de Perigo" in the legend, **When** the danger zone areas were visible, **Then** the red shaded danger areas and zero reference line are hidden.

---

### User Story 3 - Understand Legend Interactivity (Priority: P3)

As a first-time user, I want clear visual cues that legend items are interactive, so that I discover the toggle functionality without needing documentation.

**Why this priority**: Improves discoverability but the feature works without explicit affordances.

**Independent Test**: Can be fully tested by hovering over legend items and observing visual feedback.

**Acceptance Scenarios**:

1. **Given** a user hovers over any legend item, **When** the mouse enters the legend item area, **Then** the cursor changes to pointer and a tooltip appears saying "Clique para ocultar/mostrar".

2. **Given** a user is on a mobile device, **When** they tap a legend item, **Then** the corresponding element toggles visibility (same behavior as click on desktop).

---

### Edge Cases

- What happens when all lines are hidden? The chart area remains visible but empty, showing only axes and grid. No empty state message is displayed; users can re-enable lines via the legend.
- What happens when a user refreshes the page after hiding lines? All lines return to visible (state is not persisted).
- What happens if investment account balances change while viewing the chart? The line updates in real-time via existing Supabase subscriptions.
- What happens with investment amounts significantly larger than checking balances (e.g., R$500,000 investments vs R$5,000 checking)? The Y-axis auto-scales to accommodate all visible lines, ensuring all data points remain readable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a third line on the cashflow chart representing "Saldo com Investimentos" (pessimistic balance + sum of all investment account balances).
- **FR-002**: The investment-inclusive line MUST use a distinct color (cyan #06b6d4 or similar) that is visually distinguishable from existing green (optimistic) and amber (pessimistic) lines. The line MUST render as stroke-only (no gradient area fill) to maintain visual distinction from the area-filled operational scenario lines.
- **FR-003**: The investment-inclusive line MUST appear in the chart legend with label "Saldo com Investimentos".
- **FR-004**: All legend items (Otimista, Pessimista, Saldo com Investimentos, Zona de Perigo) MUST be clickable to toggle visibility of their corresponding chart elements.
- **FR-005**: Hidden chart elements MUST have their legend items displayed with visual muting (reduced opacity and/or strikethrough text).
- **FR-006**: Legend items MUST show cursor:pointer on hover to indicate interactivity.
- **FR-007**: Legend items MUST display a tooltip on hover explaining the toggle functionality ("Clique para ocultar/mostrar").
- **FR-008**: Toggle state MUST be temporary (session-only) and reset to all-visible on page refresh.
- **FR-009**: The chart MUST remain responsive on mobile devices with tap-to-toggle functionality.
- **FR-010**: The Y-axis domain MUST be calculated based on all line data (optimistic, pessimistic, investment-inclusive) regardless of current visibility state. The scale remains fixed when toggling line visibility to prevent disorienting axis jumps.
- **FR-011**: Chart tooltips MUST only display data for currently visible lines; hidden line values are excluded from tooltip content.

### Key Entities *(include if feature involves data)*

- **Investment Balance Total**: Sum of all bank accounts where `type === 'investment'`. This value is added to the pessimistic scenario balance for each day of the projection.
- **Line Visibility State**: A temporary (React state) map tracking which chart elements (optimistic, pessimistic, investment-inclusive, danger zone) are currently visible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their total financial position (checking + investments) in a single chart view without navigating to separate screens.
- **SC-002**: Toggle interactions feel instantaneous to users - visibility changes use a 150ms opacity fade transition for visual continuity.
- **SC-003**: Legend interactivity is discoverable through standard UI affordances (cursor change, hover states) without requiring documentation or tutorials.
- **SC-004**: Chart displays all 3 lines legibly without overlapping labels or visual clutter that obscures data.
- **SC-005**: Mobile users can toggle line visibility via tap with the same reliability as desktop click interactions.

## Clarifications

### Session 2025-11-28

- Q: Should the investment-inclusive line render as a line-only (stroke) or as an area fill like the existing optimistic/pessimistic lines? → A: Line-only (stroke) - no gradient fill, just the cyan line.
- Q: What should happen when a user hides ALL lines (optimistic, pessimistic, investment-inclusive, AND danger zone)? → A: Axes and grid only - no additional message or feedback.
- Q: Should toggling line visibility include a transition animation, or should it be an instant show/hide? → A: Fast fade (150ms) - quick opacity transition.
- Q: How should the Y-axis behave when lines are hidden - should it rescale to fit only visible lines, or maintain the full scale? → A: Maintain full scale - Y-axis stays fixed based on all data, regardless of visibility.
- Q: Should the tooltip show data for hidden lines, or only for currently visible lines? → A: Only visible lines - tooltip excludes data for hidden lines.

## Assumptions

- Investment account balances are manually updated by users (not connected to live market feeds) and change infrequently compared to checking accounts. The investment total used in the chart reflects the last user-entered balance and updates in real-time if the user modifies it during their session.
- The pessimistic scenario is the appropriate baseline for the investment-inclusive line because it represents the "worst case" operational cashflow.
- Users understand that investment accounts are not immediately liquid and the line represents theoretical total wealth, not immediately available funds.
- The existing Recharts library supports the required interactivity without additional dependencies (validated in research.md: Line component for stroke-only rendering, custom legend with onClick handlers, conditional opacity for visibility toggling).
- Portuguese language labels are appropriate for all UI text in this feature.
