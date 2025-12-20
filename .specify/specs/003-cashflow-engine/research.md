# Research: Cashflow Calculation Engine

**Feature**: 003-cashflow-engine  
**Date**: 2025-11-26  
**Status**: Complete

## Research Tasks Resolved

### 1. Date Manipulation Library

**Decision**: Use `date-fns@4.1.0`

**Rationale**:
- Tree-shakeable, only imports what's needed
- Pure functions (matches engine's purity requirement)
- Immutable operations (no date mutation)
- TypeScript-first with excellent type definitions
- Already commonly used with React/Vite projects
- High Context7 reputation score

**Alternatives Considered**:
- **Native Date API**: Rejected - verbose, error-prone for day arithmetic, no immutability guarantees
- **Luxon**: Rejected - heavier bundle, OOP style doesn't match pure function approach
- **Day.js**: Rejected - plugin system adds complexity, less TypeScript support

**Key Functions Needed**:
- `addDays(date, amount)` - iterate through projection period
- `getDate(date)` - get day of month for payment matching
- `getDaysInMonth(date)` - handle month-end edge cases
- `isLeapYear(date)` - handle February 29th edge case
- `startOfDay(date)` - normalize dates for comparison

### 2. Certainty Level Mapping

**Decision**: Treat `probable` same as `uncertain` for pessimistic scenario

**Rationale**:
- Existing codebase has 3 certainty levels: `guaranteed`, `probable`, `uncertain`
- Spec defines 2 levels for engine: `guaranteed`, `uncertain`
- Conservative approach: pessimistic scenario should only include truly guaranteed income
- No breaking changes to existing data model required

**Implementation**:
```typescript
// For pessimistic scenario:
const isGuaranteed = (project: Project) => project.certainty === 'guaranteed'

// For optimistic scenario:
const isActive = (project: Project) => project.isActive
```

### 3. Frequency Calculation Strategy

**Decision**: Calculate first occurrence in projection period, then apply interval

**Rationale**:
- Spec: "biweekly/weekly payments determined by first occurrence within projection period"
- This matches real-world behavior where paycheck schedules are relative to first payment

**Implementation Pattern**:
```typescript
// Monthly: Direct day match (with month-end handling)
const isMonthlyDue = (dayOfMonth: number, paymentDay: number, daysInMonth: number) => {
  const effectiveDay = Math.min(paymentDay, daysInMonth)
  return dayOfMonth === effectiveDay
}

// Biweekly: Every 14 days from first occurrence
// Weekly: Every 7 days from first occurrence
// Track first occurrence per income source, then check (dayOffset - firstOccurrence) % interval === 0
```

### 4. Month-End Edge Case Handling

**Decision**: Use `Math.min(paymentDay, daysInMonth)` approach

**Rationale**:
- Simple, predictable behavior
- Matches spec: "payment day 31 in February → February 28"
- No need for complex "last day of month" special case

**Implementation**:
```typescript
function getEffectiveDay(paymentDay: number, date: Date): number {
  const daysInMonth = getDaysInMonth(date)
  return Math.min(paymentDay, daysInMonth)
}
```

### 5. Performance Optimization

**Decision**: Single-pass calculation with event accumulation

**Rationale**:
- Spec requires < 100ms for 100 entities, 30-day projection
- O(days × entities) is acceptable: 30 × 100 = 3,000 iterations
- No need for memoization or caching for this scale
- Pre-filter inactive entities once before iteration

**Implementation Pattern**:
```typescript
// Pre-filter once
const activeProjects = projects.filter(p => p.isActive)
const activeExpenses = expenses.filter(e => e.isActive)

// Single pass through days
for (let dayOffset = 0; dayOffset < days; dayOffset++) {
  // Calculate income/expenses for this day
  // Accumulate running balance
}
```

### 6. Input Validation Strategy

**Decision**: Use Zod schemas at engine boundary, fail fast

**Rationale**:
- Consistent with existing codebase (Zod already used)
- Spec requires: "fail fast with descriptive errors"
- Validate once at entry, trust data internally

**Validation Rules**:
- Amounts must be positive (or zero for balances)
- Payment days must be 1-31
- Frequency must be valid enum
- Certainty must be valid enum
- Projection days must be positive integer

### 7. Output Structure Design

**Decision**: Return comprehensive projection object with both scenarios

**Rationale**:
- Spec requires: daily snapshots, danger days, summary statistics
- Single function call returns everything needed for visualization
- Avoid multiple passes through data

**Output Shape**:
```typescript
interface CashflowProjection {
  startDate: Date
  endDate: Date
  startingBalance: number
  days: DailySnapshot[]
  optimistic: ScenarioSummary
  pessimistic: ScenarioSummary
}

interface DailySnapshot {
  date: Date
  dayOffset: number
  optimisticBalance: number
  pessimisticBalance: number
  incomeEvents: IncomeEvent[]
  expenseEvents: ExpenseEvent[]
  isOptimisticDanger: boolean
  isPessimisticDanger: boolean
}

interface ScenarioSummary {
  totalIncome: number
  totalExpenses: number
  endBalance: number
  dangerDays: DangerDay[]
  dangerDayCount: number
}
```

## Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| date-fns | 4.1.0 | Date manipulation (addDays, getDate, getDaysInMonth) |

## Open Questions (None)

All technical questions resolved through research.

