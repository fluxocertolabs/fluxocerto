# Feature Specification: Twice-Monthly Variable Amounts

**Feature Branch**: `012-twice-monthly-variable-amounts`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Add support for different payment amounts on each day of twice-monthly payment schedules"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Variable Amounts for Twice-Monthly Project (Priority: P1)

A freelancer has a client that pays different amounts on different days of the month. They want to track both payments as a single project rather than creating two separate projects. When configuring a twice-monthly project, they enable the variable amounts option and set distinct amounts for each payment day.

**Why this priority**: This is the core feature that enables the primary use case. Without this, users cannot configure different amounts for each payment day, which is the main problem being solved.

**Independent Test**: Can be fully tested by creating a new twice-monthly project with variable amounts enabled and verifying both amount fields are saved correctly.

**Acceptance Scenarios**:

1. **Given** a user is creating a new project with "Duas vezes por mês" frequency selected, **When** they enable the "Valores diferentes para cada dia" toggle, **Then** the single amount field is replaced with two amount fields labeled "Valor do 1º pagamento" and "Valor do 2º pagamento"

2. **Given** a user has entered R$ 3.000 in the single amount field for a twice-monthly project, **When** they enable the variable amounts toggle, **Then** the first amount field is pre-populated with R$ 3.000 and the second amount field is empty

3. **Given** a user has entered R$ 3.000 and R$ 500 in the two amount fields, **When** they disable the variable amounts toggle, **Then** the single amount field shows R$ 3.000 (the first amount)

4. **Given** a user is editing a project with a frequency other than "Duas vezes por mês", **When** they view the form, **Then** the variable amounts toggle is not visible

---

### User Story 2 - Cashflow Reflects Variable Amounts (Priority: P1)

A user has configured a twice-monthly project with different amounts for each payment day. When viewing the cashflow projection, they expect to see the correct amount on each respective payment day.

**Why this priority**: This is equally critical as P1-Story 1. The feature has no value if the cashflow engine doesn't correctly use the variable amounts.

**Independent Test**: Can be tested by creating a project with variable amounts (e.g., R$ 3.000 on day 5, R$ 500 on day 20) and verifying the cashflow shows R$ 3.000 income on the 5th and R$ 500 income on the 20th.

**Acceptance Scenarios**:

1. **Given** a project configured with firstDay=5 (R$ 3.000) and secondDay=20 (R$ 500), **When** the cashflow is calculated for a month containing both days, **Then** an income event of R$ 3.000 appears on day 5 and an income event of R$ 500 appears on day 20

2. **Given** a project configured with variable amounts where secondDay falls in a shorter month (e.g., day 31 in February), **When** the cashflow is calculated, **Then** the payment uses the last day of the month with the correct second amount

3. **Given** a project configured with twice-monthly frequency but no variable amounts (single amount), **When** the cashflow is calculated, **Then** both payment days use the same project amount (backward compatible behavior)

---

### User Story 3 - Edit Existing Project to Add Variable Amounts (Priority: P2)

A user has an existing twice-monthly project that was created with a single amount. They now want to update it to have different amounts for each payment day.

**Why this priority**: Important for users with existing projects, but secondary to the core creation flow.

**Independent Test**: Can be tested by editing an existing twice-monthly project, enabling variable amounts, setting different values, and verifying the changes persist.

**Acceptance Scenarios**:

1. **Given** an existing twice-monthly project with amount R$ 2.000, **When** the user opens the edit form, **Then** the variable amounts toggle is OFF and a single amount field shows R$ 2.000

2. **Given** the user enables variable amounts on an existing project, **When** they save with firstAmount=R$ 1.500 and secondAmount=R$ 500, **Then** the project is updated and future cashflow calculations use the variable amounts

---

### Edge Cases

- What happens when the user enters the same amount for both fields? → System accepts it (valid use case, even if unusual)
- What happens when one amount field is left empty or zero? → Validation error prevents saving; both amounts are required when variable amounts is enabled
- What happens when variable amounts toggle is disabled after setting different amounts? → First amount becomes the single amount; second amount is discarded
- How does the project list display variable amounts? → Shows the combined total or range (e.g., "R$ 3.000 / R$ 500") to indicate variable amounts

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "Valores diferentes para cada dia" toggle when twice-monthly frequency is selected
- **FR-002**: System MUST show two amount fields when variable amounts toggle is enabled, labeled "Valor do 1º pagamento" and "Valor do 2º pagamento"
- **FR-003**: System MUST pre-populate the first amount field with the existing single amount when enabling the toggle
- **FR-004**: System MUST use the first amount as the single amount when disabling the toggle
- **FR-005**: System MUST hide the variable amounts toggle when any frequency other than twice-monthly is selected
- **FR-006**: System MUST require both amount fields to have positive values when variable amounts is enabled
- **FR-007**: System MUST calculate income events using the correct amount for each payment day when variable amounts are configured
- **FR-008**: System MUST fall back to the single project amount for both days when variable amounts are not configured (backward compatibility)
- **FR-009**: System MUST persist variable amount configuration without requiring data migration for existing projects
- **FR-010**: System MUST display variable amounts appropriately in the project list view

### Key Entities *(include if feature involves data)*

- **TwiceMonthlySchedule (Updated)**: Extended to optionally include `firstAmount` and `secondAmount` fields. When present, these override the project's base amount for their respective payment days.
- **Project**: No changes to the base Project entity. The amount field continues to serve as the default/fallback amount.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure twice-monthly projects with different amounts in under 30 seconds
- **SC-002**: Existing twice-monthly projects continue to work without any user action (100% backward compatibility)
- **SC-003**: Cashflow projections accurately reflect the correct amount on each payment day for 100% of configured variable amount projects
- **SC-004**: Users can distinguish between fixed and variable amount projects at a glance in the project list

## Assumptions

- The variable amounts feature is specific to twice-monthly frequency; other frequencies do not need this capability
- Users will most commonly use the simple single-amount mode; variable amounts is an advanced option
- The toggle should be visually subtle to avoid overwhelming users who don't need this feature
- All UI text will be in Brazilian Portuguese (pt-BR) as per existing application conventions
- Variable amounts can be any positive number; there's no requirement for the second amount to be less than the first
