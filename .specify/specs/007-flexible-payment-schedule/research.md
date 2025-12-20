# Research: Flexible Payment Schedule

**Feature**: 007-flexible-payment-schedule  
**Date**: 2025-11-27  
**Status**: Complete

## Research Tasks

### 1. Day-of-Week Representation for Weekly/Biweekly Payments

**Decision**: Use ISO 8601 day numbering (1 = Monday, 7 = Sunday)

**Rationale**:
- Spec explicitly requires ISO 8601 convention per clarification session
- date-fns provides `getISODay()` function that returns 1-7 (Monday-Sunday)
- This is more intuitive for international users than JavaScript's native `getDay()` which returns 0-6 (Sunday-Saturday)
- Consistent with date-fns ecosystem patterns

**Alternatives Considered**:
- JavaScript native `getDay()` (0-6, Sunday-Saturday): Rejected because spec explicitly requires ISO 8601 and it's less intuitive
- String representation ("monday", "tuesday"): Rejected because numeric values are more efficient for storage and comparison

**Implementation**:
```typescript
import { getISODay } from 'date-fns'

// ISO 8601: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
const dayOfWeek = getISODay(date) // Returns 1-7
```

---

### 2. Data Model for Flexible Payment Schedule

**Decision**: Use discriminated union type based on frequency

**Rationale**:
- TypeScript discriminated unions provide type safety at compile time
- Zod can validate the correct shape based on frequency value
- Backward compatible - existing `paymentDay` field can be migrated
- Clear separation of concerns for each frequency type

**Alternatives Considered**:
- Single `paymentDay` field with overloaded meaning: Rejected because it's confusing (day 5 could mean Friday or 5th of month)
- Separate optional fields (`dayOfWeek`, `dayOfMonth`, `daysOfMonth`): Rejected because it allows invalid states
- JSON blob field: Rejected because it loses type safety

**Implementation**:
```typescript
// Payment schedule varies by frequency
type PaymentSchedule = 
  | { type: 'dayOfWeek'; dayOfWeek: number }        // 1-7 (ISO 8601)
  | { type: 'dayOfMonth'; dayOfMonth: number }      // 1-31
  | { type: 'twiceMonthly'; firstDay: number; secondDay: number }  // Two days 1-31

// Updated Project type
interface Project {
  // ... existing fields
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  paymentSchedule: PaymentSchedule
  // Deprecated: paymentDay (keep for migration)
}
```

---

### 3. Frequency Calculation for Twice-a-Month

**Decision**: Check if current day matches either of the two configured days

**Rationale**:
- Simple and predictable - payments occur on fixed days each month
- Handles month-end edge cases using existing `getEffectiveDay()` function
- No complex interval tracking needed (unlike biweekly)

**Alternatives Considered**:
- Interval-based (every ~15 days): Rejected because spec says "two fixed days each month"
- First occurrence tracking like biweekly: Rejected because twice-monthly is calendar-based, not interval-based

**Implementation**:
```typescript
function isTwiceMonthlyPaymentDue(
  date: Date,
  firstDay: number,
  secondDay: number
): boolean {
  const currentDay = getDate(date)
  const effectiveFirstDay = getEffectiveDay(firstDay, date)
  const effectiveSecondDay = getEffectiveDay(secondDay, date)
  return currentDay === effectiveFirstDay || currentDay === effectiveSecondDay
}
```

---

### 4. Form Validation for Twice-a-Month Days

**Decision**: Validate at form level with Zod refinement

**Rationale**:
- Inline error display per spec clarification
- Zod refinements provide clean validation with custom error messages
- Prevents invalid data from being saved

**Alternatives Considered**:
- Backend validation only: N/A (local-first app)
- JavaScript validation without Zod: Rejected because Zod is already used throughout

**Implementation**:
```typescript
const TwiceMonthlyScheduleSchema = z.object({
  type: z.literal('twiceMonthly'),
  firstDay: z.number().int().min(1).max(31),
  secondDay: z.number().int().min(1).max(31),
}).refine(
  (data) => data.firstDay !== data.secondDay,
  { message: 'Both payment days must be different', path: ['secondDay'] }
)
```

---

### 5. Legacy Data Migration Strategy

**Decision**: Auto-migration with sensible defaults, no breaking changes

**Rationale**:
- Spec states "Migration of existing data is not required for MVP"
- Existing projects continue to work with current paymentDay field
- When user edits a weekly/biweekly project, auto-select a default weekday
- Dexie.js version upgrade handles schema changes gracefully

**Alternatives Considered**:
- Force migration on app load: Rejected because spec says existing projects should "continue to function"
- Dual-write during transition: Rejected as over-engineering for MVP

**Implementation**:
- Dexie version 3: Add `paymentSchedule` field (optional initially)
- Cashflow engine: Check for `paymentSchedule` first, fall back to `paymentDay`
- Form: On edit, convert `paymentDay` to appropriate `paymentSchedule`
- Legacy mapping for weekly: `dayOfMonth % 7` or map to current month's weekday

---

### 6. Dynamic Form Input Switching

**Decision**: React state-driven conditional rendering

**Rationale**:
- React's declarative model handles this naturally
- shadcn/ui Select and Input components already in use
- No additional dependencies needed
- Meets <100ms perceived instant requirement

**Alternatives Considered**:
- Multiple form components: Rejected because it duplicates shared logic
- Form library (react-hook-form): Rejected because current pattern works well

**Implementation**:
```tsx
// Conditional rendering based on frequency
{frequency === 'weekly' || frequency === 'biweekly' ? (
  <DayOfWeekSelect value={dayOfWeek} onChange={setDayOfWeek} />
) : frequency === 'twice-monthly' ? (
  <TwiceMonthlyInput firstDay={firstDay} secondDay={secondDay} ... />
) : (
  <DayOfMonthInput value={dayOfMonth} onChange={setDayOfMonth} />
)}
```

---

### 7. Frequency Dropdown Order

**Decision**: Most frequent first: Weekly, Biweekly, Twice a month, Monthly

**Rationale**:
- Per spec clarification: "By frequency (most frequent first)"
- Logical ordering helps users find their option quickly

**Implementation**:
```tsx
<SelectItem value="weekly">Weekly</SelectItem>
<SelectItem value="biweekly">Biweekly</SelectItem>
<SelectItem value="twice-monthly">Twice a month</SelectItem>
<SelectItem value="monthly">Monthly</SelectItem>
```

---

## Dependencies Verified

| Dependency | Version | Purpose | Notes |
|------------|---------|---------|-------|
| date-fns | (existing) | `getISODay()` for day-of-week | Already in project |
| Zod | 4.1.13 | Schema validation | Already in project |
| shadcn/ui Select | (existing) | Day-of-week dropdown | Already in project |

## Open Questions

None - all clarifications resolved in spec.

## Summary

All research tasks complete. The implementation approach:
1. **Data Model**: Discriminated union `PaymentSchedule` type with frequency-specific shapes
2. **Frequency Logic**: New `isTwiceMonthlyPaymentDue()` function, update weekly/biweekly to use `getISODay()`
3. **Form**: Conditional rendering based on frequency selection
4. **Migration**: Backward compatible with auto-conversion on edit
5. **Validation**: Zod refinements for twice-monthly day uniqueness

