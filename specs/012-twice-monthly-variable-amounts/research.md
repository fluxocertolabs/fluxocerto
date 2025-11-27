# Research: Twice-Monthly Variable Amounts

**Feature**: 012-twice-monthly-variable-amounts  
**Date**: 2025-11-27  
**Status**: Complete

## Research Tasks

### 1. JSONB Schema Extension Strategy

**Question**: How to extend the existing `TwiceMonthlySchedule` type to support optional variable amounts without breaking existing data?

**Decision**: Add optional `firstAmount` and `secondAmount` fields to the existing `TwiceMonthlyScheduleSchema`.

**Rationale**:
- JSONB columns in PostgreSQL naturally support schema evolution
- Optional fields (via Zod's `.optional()`) maintain backward compatibility
- Existing projects without these fields will continue to work (fallback to project's base `amount`)
- No SQL migration required - the JSONB column already exists

**Alternatives Considered**:
1. **Separate columns in projects table** - Rejected: Would require SQL migration, breaks JSONB pattern established for payment schedules
2. **New table for variable amounts** - Rejected: Over-engineering for a simple optional field addition
3. **Store amounts as array** - Rejected: Less explicit, harder to validate, unclear which amount maps to which day

**Implementation**:
```typescript
export const TwiceMonthlyScheduleSchema = z.object({
  type: z.literal('twiceMonthly'),
  firstDay: z.number().int().min(1).max(31),
  secondDay: z.number().int().min(1).max(31),
  firstAmount: z.number().positive().optional(),  // NEW
  secondAmount: z.number().positive().optional(), // NEW
})
.refine((data) => data.firstDay !== data.secondDay, {
  message: 'Both payment days must be different',
  path: ['secondDay'],
})
.refine(
  (data) => {
    const hasFirst = data.firstAmount !== undefined
    const hasSecond = data.secondAmount !== undefined
    return hasFirst === hasSecond // both present or both absent
  },
  { message: 'Both amounts required when variable amounts enabled', path: ['secondAmount'] }
)
```

---

### 2. Cashflow Engine Amount Resolution

**Question**: How should the cashflow engine determine which amount to use for each payment day?

**Decision**: Check if variable amounts are configured; if so, use the appropriate amount for each day. Otherwise, fall back to the project's base `amount`.

**Rationale**:
- Simple conditional logic in `createIncomeEvents`
- Maintains single source of truth (project.amount as default)
- No changes needed to existing projects

**Alternatives Considered**:
1. **Always require both amounts** - Rejected: Breaking change, forces users to re-enter data
2. **Store resolved amounts at save time** - Rejected: Duplicates data, harder to maintain consistency
3. **Separate income events for each day** - Already implemented: Each day creates its own event, just need to vary the amount

**Implementation**:
```typescript
// In createIncomeEvents, when schedule.type === 'twiceMonthly':
const isFirstDay = currentDay === effectiveFirstDay
const isSecondDay = currentDay === effectiveSecondDay

if (isFirstDay) {
  amount = schedule.firstAmount ?? project.amount
} else if (isSecondDay) {
  amount = schedule.secondAmount ?? project.amount
}
```

---

### 3. UI Toggle Behavior

**Question**: How should the toggle interact with the amount fields?

**Decision**: 
- Toggle hidden unless frequency is "twice-monthly"
- When enabled: show two amount fields, pre-populate first with existing amount
- When disabled: revert to single amount (keep first amount value)

**Rationale**:
- Matches spec requirements FR-001 through FR-005
- Pre-populating first field reduces user friction
- Discarding second amount on disable is intuitive (user is opting out)

**Alternatives Considered**:
1. **Keep both amounts when disabling** - Rejected: Confusing UX, user expects single amount mode
2. **Show toggle always** - Rejected: Clutters UI for non-twice-monthly frequencies
3. **Average amounts when disabling** - Rejected: Unexpected behavior, loses user intent

**Implementation**:
- Add `variableAmountsEnabled` boolean state
- Conditionally render toggle only when `frequency === 'twice-monthly'`
- Handle toggle state changes to populate/clear amount fields

---

### 4. Form Validation Strategy

**Question**: How to validate that both amounts are provided when variable amounts is enabled?

**Decision**: Use Zod refinement that requires both `firstAmount` and `secondAmount` when either is present.

**Rationale**:
- Enforces spec requirement FR-006 (both amounts required when enabled)
- Zod refinements provide clear error messages
- Validation happens at schema level, not scattered in UI code

**Alternatives Considered**:
1. **UI-only validation** - Rejected: Can be bypassed, inconsistent with existing pattern
2. **Allow partial (one amount only)** - Rejected: Violates spec, unclear user intent
3. **Default missing amount to project.amount** - Rejected: Silent behavior, user may not notice

**Implementation**:
```typescript
.refine(
  (data) => {
    if (data.type !== 'twiceMonthly') return true
    const hasFirst = data.firstAmount !== undefined
    const hasSecond = data.secondAmount !== undefined
    // Either both present or both absent
    return hasFirst === hasSecond
  },
  { message: 'Both amounts are required when variable amounts is enabled' }
)
```

---

### 5. Project List Display Format

**Question**: How to display variable amounts in the project list?

**Decision**: Use slash format "R$ 3.000 / R$ 500" when variable amounts are configured.

**Rationale**:
- Matches spec clarification (Session 2025-11-27)
- Clear visual distinction from single-amount projects
- Compact enough for list view

**Alternatives Considered**:
1. **Show only first amount** - Rejected: Hides important information
2. **Show "Variable" badge** - Rejected: Doesn't show actual values
3. **Two-line display** - Rejected: Takes too much vertical space

**Implementation**:
```typescript
function formatAmount(project: Project): string {
  const schedule = project.paymentSchedule
  if (schedule?.type === 'twiceMonthly' && schedule.firstAmount && schedule.secondAmount) {
    return `${formatCurrency(schedule.firstAmount)} / ${formatCurrency(schedule.secondAmount)}`
  }
  return formatCurrency(project.amount)
}
```

---

### 6. Existing Test Coverage

**Question**: What existing tests need to be updated or extended?

**Decision**: Focus on cashflow calculation tests. UI component tests are not required per constitution (focus on business logic).

**Rationale**:
- Constitution specifies "Focus on cashflow calculation engine" for test coverage
- `src/lib/cashflow/calculate.ts` has existing test patterns to follow
- New tests should cover: variable amounts in projection, fallback behavior, edge cases

**Files to update/create**:
- `src/lib/cashflow/calculate.test.ts` - Add twice-monthly variable amount test cases
- `src/lib/cashflow/frequencies.test.ts` - May need updates if frequency logic changes

---

### 7. Edge Case: Same Amount for Both Days

**Question**: Should the system allow the same amount for both payment days?

**Decision**: Yes, allow it. This is a valid use case per spec edge cases.

**Rationale**:
- Spec explicitly states: "System accepts it (valid use case, even if unusual)"
- No validation needed to prevent this
- User may have reasons (e.g., planning to change later)

---

### 8. Edge Case: Zero or Empty Amount Fields

**Question**: How to handle zero or empty amount fields when variable amounts is enabled?

**Decision**: Validation error prevents saving. Both amounts must be positive.

**Rationale**:
- Spec FR-006: "System MUST require both amount fields to have positive values"
- Existing Zod `.positive()` validation handles this
- Error message should be clear about which field is invalid

---

## Summary of Decisions

| Decision Area | Choice | Impact |
|--------------|--------|--------|
| Schema extension | Optional fields in JSONB | No migration, backward compatible |
| Amount resolution | Fallback to project.amount | Existing projects unchanged |
| Toggle behavior | Show only for twice-monthly | Clean UI, no clutter |
| Validation | Zod refinement (both or neither) | Consistent with existing patterns |
| List display | Slash format | Clear, compact |
| Testing | Cashflow engine focus | Per constitution guidelines |

## Dependencies

No new dependencies required. All functionality uses existing:
- Zod 4.1.13 (schema validation)
- React 19.2.0 (UI components)
- shadcn/ui (Switch, Input, Label)
- date-fns (date calculations)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing data breaks | Low | High | Optional fields with fallback |
| User confusion with toggle | Low | Medium | Clear labeling in pt-BR |
| Cashflow miscalculation | Medium | High | Comprehensive unit tests |
| Form state complexity | Low | Low | Follow existing patterns in project-form.tsx |

