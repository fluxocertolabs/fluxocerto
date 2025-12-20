# Quickstart: Twice-Monthly Variable Amounts

**Feature**: 012-twice-monthly-variable-amounts  
**Date**: 2025-11-27

## Overview

This feature adds support for different payment amounts on each day of twice-monthly payment schedules. When a user configures a project with "Duas vezes por mês" frequency, they can optionally enable variable amounts to set distinct values for each payment day.

## Implementation Order

### Phase 1: Type System (Foundation)

1. **Extend TwiceMonthlyScheduleSchema** in `src/types/index.ts`
   - Add optional `firstAmount` and `secondAmount` fields
   - Add refinement for "both or neither" validation

### Phase 2: Cashflow Engine (Core Logic)

2. **Update createIncomeEvents** in `src/lib/cashflow/calculate.ts`
   - Resolve correct amount based on which payment day is being processed
   - Fall back to `project.amount` when variable amounts not configured

3. **Add unit tests** for cashflow with variable amounts
   - Test variable amounts calculation
   - Test fallback behavior
   - Test edge cases (month-end, same amounts)

### Phase 3: UI Components (User Interface)

4. **Update ProjectForm** in `src/components/manage/projects/project-form.tsx`
   - Add `variableAmountsEnabled` state
   - Add toggle component (only visible for twice-monthly)
   - Add two amount input fields when toggle enabled
   - Handle toggle state changes (populate/clear)

5. **Update ProjectListItem** in `src/components/manage/projects/project-list-item.tsx`
   - Update amount display to show slash format for variable amounts

## Key Files

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Schema definitions (TwiceMonthlyScheduleSchema) |
| `src/lib/cashflow/calculate.ts` | Income event creation with amount resolution |
| `src/components/manage/projects/project-form.tsx` | Form UI with toggle and fields |
| `src/components/manage/projects/project-list-item.tsx` | List display formatting |

## Testing Strategy

### Unit Tests (Required)

```typescript
// src/lib/cashflow/calculate.test.ts

describe('twice-monthly variable amounts', () => {
  it('uses firstAmount on first payment day', () => {
    // Project with variable amounts
    // Verify income event on firstDay uses firstAmount
  })

  it('uses secondAmount on second payment day', () => {
    // Project with variable amounts
    // Verify income event on secondDay uses secondAmount
  })

  it('falls back to project.amount when no variable amounts', () => {
    // Project without variable amounts
    // Verify both days use project.amount
  })

  it('handles month-end edge cases with variable amounts', () => {
    // Project with secondDay=31 in February
    // Verify correct amount is used on adjusted day
  })
})
```

### Manual Testing Checklist

- [ ] Create twice-monthly project → toggle visible
- [ ] Create monthly project → toggle NOT visible
- [ ] Enable toggle → two amount fields appear
- [ ] Enable toggle → first field pre-populated with existing amount
- [ ] Disable toggle → single amount field shows first amount
- [ ] Save with variable amounts → cashflow shows correct amounts
- [ ] Edit existing project → toggle reflects saved state
- [ ] Project list → shows "R$ X / R$ Y" format for variable amounts

## UI Labels (pt-BR)

| Element | Label |
|---------|-------|
| Toggle | "Valores diferentes para cada dia" |
| First amount field | "Valor do 1º pagamento" |
| Second amount field | "Valor do 2º pagamento" |

## Common Pitfalls

1. **Don't forget the refinement** - Both amounts must be present or both absent
2. **Amount units** - All amounts are in cents (integer), not reais (decimal)
3. **Pre-population** - When enabling toggle, copy `project.amount` to first field only
4. **Cashflow fallback** - Check for `undefined`, not falsy (0 is valid but unlikely)

## Dependencies

No new dependencies. Uses existing:
- `@/components/ui/switch` - Toggle component
- `@/components/ui/input` - Amount input fields
- `@/components/ui/label` - Field labels
- `zod` - Schema validation

