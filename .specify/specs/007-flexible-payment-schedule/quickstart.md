# Quickstart: Flexible Payment Schedule

**Feature**: 007-flexible-payment-schedule  
**Date**: 2025-11-27

## Overview

This guide helps developers quickly understand and implement the flexible payment schedule feature. The feature allows users to configure payment days appropriate to their payment frequency (day-of-week for weekly, day-of-month for monthly, etc.).

## Prerequisites

- Node.js 20+
- pnpm 10+
- Familiarity with React, TypeScript, and Zod

## Quick Setup

```bash
# 1. Ensure you're on the feature branch
git checkout 007-flexible-payment-schedule

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev

# 4. Run tests in watch mode (separate terminal)
pnpm test:watch
```

## Key Files to Modify

### 1. Types (`src/types/index.ts`)

Add the new `PaymentSchedule` union type and update `Project`:

```typescript
// New types to add
export const PaymentScheduleSchema = z.discriminatedUnion('type', [
  DayOfWeekScheduleSchema,
  DayOfMonthScheduleSchema,
  TwiceMonthlyScheduleSchema,
])

// Update ProjectInputSchema
export const ProjectInputSchema = z.object({
  // ... existing fields
  frequency: z.enum(['weekly', 'biweekly', 'twice-monthly', 'monthly']),
  paymentSchedule: PaymentScheduleSchema,
})
```

### 2. Frequency Handlers (`src/lib/cashflow/frequencies.ts`)

Add new functions for day-of-week and twice-monthly checking:

```typescript
import { getISODay } from 'date-fns'

// Check if payment is due on a specific day of week
export function isDayOfWeekPaymentDue(date: Date, dayOfWeek: number): boolean {
  return getISODay(date) === dayOfWeek
}

// Check if twice-monthly payment is due
export function isTwiceMonthlyPaymentDue(
  date: Date,
  firstDay: number,
  secondDay: number
): boolean {
  const currentDay = getDate(date)
  const effectiveFirst = getEffectiveDay(firstDay, date)
  const effectiveSecond = getEffectiveDay(secondDay, date)
  return currentDay === effectiveFirst || currentDay === effectiveSecond
}
```

### 3. Cashflow Calculator (`src/lib/cashflow/calculate.ts`)

Update `createIncomeEvents` to use `PaymentSchedule`:

```typescript
function createIncomeEvents(
  date: Date,
  dayOffset: number,
  projects: Project[],
  firstOccurrences: Map<string, number>
): IncomeEvent[] {
  // Check project.paymentSchedule instead of project.paymentDay
  // Use new frequency functions based on schedule type
}
```

### 4. Project Form (`src/components/manage/projects/project-form.tsx`)

Add dynamic input switching based on frequency:

```tsx
// Conditional rendering
{(frequency === 'weekly' || frequency === 'biweekly') && (
  <DayOfWeekSelect value={dayOfWeek} onChange={setDayOfWeek} />
)}

{frequency === 'twice-monthly' && (
  <TwiceMonthlyInput 
    firstDay={firstDay} 
    secondDay={secondDay}
    onFirstDayChange={setFirstDay}
    onSecondDayChange={setSecondDay}
  />
)}

{frequency === 'monthly' && (
  <DayOfMonthInput value={dayOfMonth} onChange={setDayOfMonth} />
)}
```

### 5. Database Migration (`src/db/index.ts`)

Add version 3 for schema update:

```typescript
this.version(3).stores({
  accounts: 'id, name, type',
  projects: 'id, name, isActive, frequency',
  expenses: 'id, name, isActive',
  creditCards: 'id, name',
})
```

## Testing Strategy

### Unit Tests (Priority)

1. **Frequency functions** (`src/lib/cashflow/frequencies.test.ts`):
   - `isDayOfWeekPaymentDue` - all 7 days
   - `isTwiceMonthlyPaymentDue` - normal and month-end cases
   - Updated `isWeeklyPaymentDue` with day-of-week

2. **Cashflow calculation** (`src/lib/cashflow/calculate.test.ts`):
   - Weekly projects with day-of-week schedule
   - Twice-monthly projects
   - Mixed frequency scenarios

### Integration Tests

3. **Form validation**:
   - Frequency change clears schedule
   - Twice-monthly validation (different days)
   - Legacy data conversion

## Common Patterns

### Day-of-Week Dropdown

```tsx
const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

<Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
  <SelectTrigger>
    <SelectValue placeholder="Select day" />
  </SelectTrigger>
  <SelectContent>
    {WEEKDAYS.map(({ value, label }) => (
      <SelectItem key={value} value={value.toString()}>{label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Legacy Data Conversion

```typescript
function convertLegacyPaymentDay(
  paymentDay: number,
  frequency: string
): PaymentSchedule {
  if (frequency === 'weekly' || frequency === 'biweekly') {
    // Map day-of-month to day-of-week using current date
    const today = new Date()
    const targetDate = new Date(today.getFullYear(), today.getMonth(), paymentDay)
    const dayOfWeek = getISODay(targetDate)
    return { type: 'dayOfWeek', dayOfWeek }
  }
  return { type: 'dayOfMonth', dayOfMonth: paymentDay }
}
```

## Validation Checklist

Before marking implementation complete:

- [ ] All frequency types work in form
- [ ] Form clears schedule on frequency change
- [ ] Twice-monthly validates different days
- [ ] Cashflow shows correct payment dates
- [ ] Legacy projects still work
- [ ] Tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)

## Troubleshooting

### "Payment day must be 1-31" error on weekly project

The form is still using the old `paymentDay` field. Update to use `paymentSchedule.dayOfWeek`.

### Cashflow not showing weekly payments

Check that `createIncomeEvents` is reading from `project.paymentSchedule` and using `isDayOfWeekPaymentDue` for weekly/biweekly.

### Dexie version error

Clear IndexedDB in browser DevTools: Application → IndexedDB → Delete database, then refresh.

## Reference Documents

- [Feature Spec](./spec.md) - Requirements and acceptance criteria
- [Research](./research.md) - Technical decisions and rationale
- [Data Model](./data-model.md) - Entity definitions and schemas
- [Constitution](../../.specify/memory/constitution.md) - Project standards

