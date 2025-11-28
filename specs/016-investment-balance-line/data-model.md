# Data Model: Investment-Inclusive Balance Line

**Date**: 2025-11-28  
**Status**: Complete

## Overview

This feature extends existing data structures to support:
1. Investment-inclusive balance calculation in chart data
2. Line visibility state for interactive legend

No database changes required - all modifications are to TypeScript view-layer types.

---

## Type Changes

### 1. ChartDataPoint Extension

**File**: `src/components/cashflow/types.ts`

```typescript
/**
 * Data point for Recharts AreaChart.
 * Transforms DailySnapshot into chart-compatible format.
 */
export interface ChartDataPoint {
  /** Formatted date string for X-axis display (e.g., "Nov 26") */
  date: string
  /** Unix timestamp for sorting/comparison */
  timestamp: number
  /** Optimistic balance in dollars (for chart scale) */
  optimisticBalance: number
  /** Pessimistic balance in dollars (for chart scale) */
  pessimisticBalance: number
  /** Investment-inclusive balance in dollars (pessimistic + investment total) */
  investmentInclusiveBalance: number  // NEW
  /** Whether optimistic scenario is in danger */
  isOptimisticDanger: boolean
  /** Whether pessimistic scenario is in danger */
  isPessimisticDanger: boolean
  /** Reference to full snapshot for tooltip */
  snapshot: DailySnapshot
}
```

**Validation Rules**:
- `investmentInclusiveBalance` >= `pessimisticBalance` (investments can only add, never subtract)
- Value in dollars (converted from cents)

---

### 2. Line Visibility State

**File**: `src/components/cashflow/types.ts`

```typescript
/**
 * Visibility state for chart elements.
 * Used for interactive legend toggle functionality.
 * Session-only state (not persisted).
 */
export interface LineVisibility {
  /** Optimistic scenario line + area */
  optimistic: boolean
  /** Pessimistic scenario line + area */
  pessimistic: boolean
  /** Investment-inclusive balance line */
  investmentInclusive: boolean
  /** Danger zone reference areas + zero line */
  dangerZone: boolean
}

/**
 * Default visibility state - all elements visible.
 */
export const DEFAULT_LINE_VISIBILITY: LineVisibility = {
  optimistic: true,
  pessimistic: true,
  investmentInclusive: true,
  dangerZone: true,
}

/**
 * Legend item configuration for rendering.
 */
export interface LegendItem {
  /** Unique key matching LineVisibility property */
  key: keyof LineVisibility
  /** Display label in Portuguese */
  label: string
  /** Color for legend indicator */
  color: string
}
```

**State Behavior**:
- Initial state: All `true` (all visible)
- Toggle: Flip boolean for clicked item
- Reset: On page refresh (session-only per FR-008)

---

### 3. Chart Colors Constant Update

**File**: `src/components/cashflow/cashflow-chart.tsx`

```typescript
const COLORS = {
  optimistic: '#22c55e',      // green-500 (existing)
  pessimistic: '#f59e0b',     // amber-500 (existing)
  investmentInclusive: '#06b6d4', // cyan-500 (NEW)
  danger: '#ef4444',          // red-500 (existing)
} as const
```

---

## Data Flow

### Investment Balance Calculation

```
┌─────────────────────────────────────────────────────────────────┐
│                     useFinanceData()                            │
│  accounts: BankAccount[]                                        │
│  └── filter(type === 'investment')                              │
│      └── reduce(sum + balance, 0) = investmentTotal (cents)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  transformToChartData()                         │
│  For each DailySnapshot:                                        │
│    investmentInclusiveBalance =                                 │
│      (pessimisticBalance + investmentTotal) / 100               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ChartDataPoint[]                            │
│  { date, optimisticBalance, pessimisticBalance,                 │
│    investmentInclusiveBalance, ... }                            │
└─────────────────────────────────────────────────────────────────┘
```

### Visibility State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CashflowChart Component                      │
│                                                                 │
│  const [visibility, setVisibility] = useState<LineVisibility>( │
│    DEFAULT_LINE_VISIBILITY                                      │
│  )                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ ChartLegend │  │ AreaChart │  │ ChartTooltip │
       │ (toggle)    │  │ (render)  │  │ (filter)     │
       └──────────┘    └──────────┘    └──────────┘
```

---

## Entity Relationships

```
BankAccount (existing)
├── type: 'checking' | 'savings' | 'investment'
└── balance: number (cents)
         │
         │ filter(type === 'investment')
         ▼
Investment Total (derived, not stored)
├── Sum of all investment account balances
└── Added to pessimistic balance for chart
         │
         ▼
ChartDataPoint (view-layer)
├── optimisticBalance (dollars)
├── pessimisticBalance (dollars)
├── investmentInclusiveBalance (dollars) ← NEW
└── snapshot (reference to engine output)
         │
         ▼
LineVisibility (component state)
├── optimistic: boolean
├── pessimistic: boolean
├── investmentInclusive: boolean ← NEW
└── dangerZone: boolean
```

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| investmentInclusiveBalance | >= pessimisticBalance | N/A (calculated, cannot fail) |
| visibility.* | boolean | N/A (TypeScript enforced) |

---

## No Database Changes

This feature operates entirely on:
1. **Existing data**: `bank_accounts` table with `type='investment'`
2. **View-layer types**: TypeScript interfaces for chart rendering
3. **Component state**: React useState for visibility toggle

No migrations, no new tables, no schema changes required.

