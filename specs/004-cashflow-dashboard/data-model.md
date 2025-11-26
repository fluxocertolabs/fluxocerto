# Data Model: Cashflow Dashboard

**Feature**: 004-cashflow-dashboard  
**Date**: 2025-11-26

## Overview

The Cashflow Dashboard is a **read-only visualization** feature. It consumes existing data models from the database and transforms them through the cashflow engine for display. No new database entities are required.

## Existing Entities (Source Data)

These entities already exist in `src/types/index.ts` and `src/db/index.ts`:

### BankAccount
```typescript
interface BankAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number  // cents
  createdAt: Date
  updatedAt: Date
}
```
**Dashboard Usage**: Only `checking` accounts contribute to starting balance.

### Project (Income Source)
```typescript
interface Project {
  id: string
  name: string
  amount: number  // cents
  paymentDay: number  // 1-31
  frequency: 'weekly' | 'biweekly' | 'monthly'
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```
**Dashboard Usage**: Active projects generate income events. Certainty determines inclusion in pessimistic scenario.

### FixedExpense
```typescript
interface FixedExpense {
  id: string
  name: string
  amount: number  // cents
  dueDay: number  // 1-31
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```
**Dashboard Usage**: Active expenses generate expense events.

### CreditCard
```typescript
interface CreditCard {
  id: string
  name: string
  statementBalance: number  // cents
  dueDay: number  // 1-31
  createdAt: Date
  updatedAt: Date
}
```
**Dashboard Usage**: Credit cards generate expense events on due day.

---

## Engine Output Types (Existing)

These types exist in `src/lib/cashflow/types.ts`:

### CashflowProjection
```typescript
interface CashflowProjection {
  startDate: Date
  endDate: Date
  startingBalance: number  // cents
  days: DailySnapshot[]
  optimistic: ScenarioSummary
  pessimistic: ScenarioSummary
}
```
**Dashboard Usage**: Primary data source for chart and summary panel.

### DailySnapshot
```typescript
interface DailySnapshot {
  date: Date
  dayOffset: number
  optimisticBalance: number  // cents
  pessimisticBalance: number  // cents
  incomeEvents: IncomeEvent[]
  expenseEvents: ExpenseEvent[]
  isOptimisticDanger: boolean
  isPessimisticDanger: boolean
}
```
**Dashboard Usage**: Each snapshot becomes a data point on the chart. Used for tooltip content.

### ScenarioSummary
```typescript
interface ScenarioSummary {
  totalIncome: number  // cents
  totalExpenses: number  // cents
  endBalance: number  // cents
  dangerDays: DangerDay[]
  dangerDayCount: number
}
```
**Dashboard Usage**: Populates summary statistics panel.

### IncomeEvent
```typescript
interface IncomeEvent {
  projectId: string
  projectName: string
  amount: number  // cents
  certainty: 'guaranteed' | 'probable' | 'uncertain'
}
```
**Dashboard Usage**: Displayed in day detail tooltip.

### ExpenseEvent
```typescript
interface ExpenseEvent {
  sourceId: string
  sourceName: string
  sourceType: 'expense' | 'credit_card'
  amount: number  // cents
}
```
**Dashboard Usage**: Displayed in day detail tooltip.

### DangerDay
```typescript
interface DangerDay {
  date: Date
  dayOffset: number
  balance: number  // cents (negative)
}
```
**Dashboard Usage**: Used to highlight danger regions on chart.

---

## View-Layer Types (New)

These types are created for the dashboard UI components:

### ChartDataPoint
```typescript
// src/components/cashflow/types.ts
interface ChartDataPoint {
  /** Formatted date string for X-axis display */
  date: string
  /** Unix timestamp for sorting/comparison */
  timestamp: number
  /** Optimistic balance in dollars (for chart scale) */
  optimisticBalance: number
  /** Pessimistic balance in dollars (for chart scale) */
  pessimisticBalance: number
  /** Whether optimistic scenario is in danger */
  isOptimisticDanger: boolean
  /** Whether pessimistic scenario is in danger */
  isPessimisticDanger: boolean
  /** Reference to full snapshot for tooltip */
  snapshot: DailySnapshot
}
```

### DangerRange
```typescript
// src/components/cashflow/types.ts
interface DangerRange {
  /** Start date string (matches ChartDataPoint.date) */
  start: string
  /** End date string (matches ChartDataPoint.date) */
  end: string
  /** Which scenario has danger in this range */
  scenario: 'optimistic' | 'pessimistic' | 'both'
}
```

### SummaryStats
```typescript
// src/components/cashflow/types.ts
interface SummaryStats {
  /** Starting balance in dollars */
  startingBalance: number
  /** Optimistic scenario totals */
  optimistic: {
    totalIncome: number
    totalExpenses: number
    endBalance: number
    dangerDayCount: number
  }
  /** Pessimistic scenario totals */
  pessimistic: {
    totalIncome: number
    totalExpenses: number
    endBalance: number
    dangerDayCount: number
  }
}
```

---

## Data Transformations

### Cents to Dollars
All monetary values are stored in cents (integers) but displayed in dollars (decimals).

```typescript
// Transformation happens at view layer
const dollars = cents / 100
```

### Date Formatting
Dates are formatted for display using date-fns (already installed).

```typescript
import { format } from 'date-fns'

// X-axis labels: "Nov 26"
const label = format(date, 'MMM d')

// Tooltip header: "Wednesday, November 26"
const header = format(date, 'EEEE, MMMM d')
```

### Danger Range Consolidation
Individual danger days are consolidated into continuous ranges for ReferenceArea rendering.

```typescript
// Input: [day1, day2, day3, day5, day6] (day 4 is not danger)
// Output: [{ start: day1, end: day3 }, { start: day5, end: day6 }]
```

---

## State Transitions

The dashboard is read-only and does not modify any data. However, it reacts to external changes:

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard States                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    data loaded    ┌────────────┐             │
│  │ Loading  │ ────────────────► │   Ready    │             │
│  │ Skeleton │                   │  (Chart)   │             │
│  └──────────┘                   └────────────┘             │
│       │                              │                      │
│       │ error                        │ external             │
│       │                              │ data change          │
│       ▼                              ▼                      │
│  ┌──────────┐    retry         ┌────────────┐             │
│  │  Error   │ ◄──────────────► │ Re-render  │             │
│  │  State   │                  │ (auto via  │             │
│  └──────────┘                  │  hooks)    │             │
│       │                        └────────────┘             │
│       │ no data                                            │
│       ▼                                                    │
│  ┌──────────┐                                              │
│  │  Empty   │                                              │
│  │  State   │                                              │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Transitions**:
1. **Loading → Ready**: All database queries complete, projection calculated
2. **Loading → Empty**: Queries complete but no accounts/projects exist
3. **Loading → Error**: Database or calculation error
4. **Error → Loading**: User clicks retry button
5. **Ready → Ready**: External data changes trigger re-render via Dexie hooks

---

## Validation Rules

No user input validation required (read-only feature). The cashflow engine already validates its inputs.

---

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Flow Diagram                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IndexedDB (Dexie)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ accounts │ projects │ expenses │ creditCards         │  │
│  └────┬─────────┬──────────┬────────────┬───────────────┘  │
│       │         │          │            │                   │
│       ▼         ▼          ▼            ▼                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              useLiveQuery (Dexie hooks)              │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              useCashflowProjection (hook)            │  │
│  │  - Combines all queries                              │  │
│  │  - Calls calculateCashflow()                         │  │
│  │  - Memoizes result                                   │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Dashboard Page                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │ SummaryPanel│  │CashflowChart│  │ ChartTooltip │ │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

1. **Memoization**: Projection is memoized in hook to prevent recalculation on every render
2. **Chart Data**: Transformed once per projection change, not on every render
3. **Danger Ranges**: Computed once, cached for chart rendering
4. **Date Formatting**: Use consistent format functions, avoid creating new formatters

