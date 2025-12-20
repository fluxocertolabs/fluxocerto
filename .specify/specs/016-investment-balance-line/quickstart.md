# Quickstart: Investment-Inclusive Balance Line

**Branch**: `016-investment-balance-line`  
**Estimated Effort**: 4-6 hours  
**Prerequisites**: Existing cashflow chart working with optimistic/pessimistic lines

---

## Overview

Add a third line to the cashflow chart showing total balance including investments, and make legend items clickable to toggle visibility.

### Key Changes

| File | Change |
|------|--------|
| `src/components/cashflow/types.ts` | Add `investmentInclusiveBalance` to ChartDataPoint, add `LineVisibility` type |
| `src/hooks/use-cashflow-projection.ts` | Calculate investment total, add to chart data transformation |
| `src/components/cashflow/cashflow-chart.tsx` | Add visibility state, Line component, interactive legend |
| `src/components/cashflow/chart-tooltip.tsx` | Conditional display based on visibility |
| `src/components/cashflow/chart-legend.tsx` | NEW: Interactive legend component |

---

## Step-by-Step Implementation

### Step 1: Extend Types (5 min)

**File**: `src/components/cashflow/types.ts`

```typescript
// Add to ChartDataPoint interface
export interface ChartDataPoint {
  // ... existing fields ...
  /** Investment-inclusive balance in dollars (pessimistic + investment total) */
  investmentInclusiveBalance: number
}

// Add new types
export interface LineVisibility {
  optimistic: boolean
  pessimistic: boolean
  investmentInclusive: boolean
  dangerZone: boolean
}

export const DEFAULT_LINE_VISIBILITY: LineVisibility = {
  optimistic: true,
  pessimistic: true,
  investmentInclusive: true,
  dangerZone: true,
}

export interface LegendItem {
  key: keyof LineVisibility
  label: string
  color: string
}
```

---

### Step 2: Calculate Investment Balance (15 min)

**File**: `src/hooks/use-cashflow-projection.ts`

```typescript
// In useCashflowProjection hook, after getting accounts:
const investmentTotal = useMemo(() => {
  return accounts
    .filter(a => a.type === 'investment')
    .reduce((sum, a) => sum + a.balance, 0)
}, [accounts])

// Update transformToChartData to accept investmentTotal:
export function transformToChartData(
  days: DailySnapshot[], 
  investmentTotal: number
): ChartDataPoint[] {
  return days.map((day) => ({
    date: formatChartDate(day.date),
    timestamp: day.date.getTime(),
    optimisticBalance: day.optimisticBalance / 100,
    pessimisticBalance: day.pessimisticBalance / 100,
    investmentInclusiveBalance: (day.pessimisticBalance + investmentTotal) / 100,
    isOptimisticDanger: day.isOptimisticDanger,
    isPessimisticDanger: day.isPessimisticDanger,
    snapshot: day,
  }))
}

// Update the useMemo call:
const chartData = useMemo(() => {
  if (!projection) return []
  return transformToChartData(projection.days, investmentTotal)
}, [projection, investmentTotal])
```

---

### Step 3: Create Interactive Legend Component (30 min)

**File**: `src/components/cashflow/chart-legend.tsx` (NEW)

```typescript
/**
 * ChartLegend - Interactive legend with toggle functionality.
 * Clicking items shows/hides corresponding chart elements.
 */

import { cn } from '@/lib/utils'
import type { LineVisibility, LegendItem } from './types'

const LEGEND_ITEMS: LegendItem[] = [
  { key: 'optimistic', label: 'Otimista', color: '#22c55e' },
  { key: 'pessimistic', label: 'Pessimista', color: '#f59e0b' },
  { key: 'investmentInclusive', label: 'Saldo com Investimentos', color: '#06b6d4' },
  { key: 'dangerZone', label: 'Zona de Perigo', color: '#ef4444' },
]

interface ChartLegendProps {
  visibility: LineVisibility
  onToggle: (key: keyof LineVisibility) => void
}

export function ChartLegend({ visibility, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 text-sm">
      {LEGEND_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onToggle(item.key)}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            'transition-opacity duration-150',
            'hover:opacity-80',
            !visibility[item.key] && 'opacity-50'
          )}
          title="Clique para ocultar/mostrar"
        >
          <div
            className={cn(
              'h-3 w-3 rounded-full',
              'transition-opacity duration-150'
            )}
            style={{ backgroundColor: item.color }}
          />
          <span
            className={cn(
              'text-muted-foreground',
              !visibility[item.key] && 'line-through'
            )}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}
```

---

### Step 4: Update Chart Component (45 min)

**File**: `src/components/cashflow/cashflow-chart.tsx`

```typescript
import { useState, useCallback } from 'react'
import { Line } from 'recharts' // Add Line import
import { ChartLegend } from './chart-legend'
import type { LineVisibility } from './types'
import { DEFAULT_LINE_VISIBILITY } from './types'

// Update COLORS constant
const COLORS = {
  optimistic: '#22c55e',
  pessimistic: '#f59e0b',
  investmentInclusive: '#06b6d4', // NEW
  danger: '#ef4444',
} as const

export function CashflowChart({ chartData, dangerRanges }: CashflowChartProps) {
  // Add visibility state
  const [visibility, setVisibility] = useState<LineVisibility>(DEFAULT_LINE_VISIBILITY)
  
  const handleToggle = useCallback((key: keyof LineVisibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Update Y-axis domain to include investment-inclusive (always, for fixed scale)
  const balances = chartData.flatMap((d) => [
    d.optimisticBalance,
    d.pessimisticBalance,
    d.investmentInclusiveBalance, // Always include for fixed scale
  ])
  // ... rest of domain calculation

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4')}>
      {/* ... chart header ... */}
      
      <ResponsiveContainer>
        <AreaChart data={chartData}>
          {/* ... gradients, axes ... */}
          
          {/* Tooltip with visibility */}
          <Tooltip
            content={<ChartTooltip visibility={visibility} />}
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
          />
          
          {/* Zero line - conditional */}
          {visibility.dangerZone && (
            <ReferenceLine y={0} stroke={COLORS.danger} strokeDasharray="4 4" />
          )}
          
          {/* Danger ranges - conditional */}
          {visibility.dangerZone && dangerRanges.map((range, index) => (
            <ReferenceArea key={`danger-${index}`} ... />
          ))}
          
          {/* Pessimistic area - conditional with fade */}
          <Area
            type="monotone"
            dataKey="pessimisticBalance"
            stroke={COLORS.pessimistic}
            fill="url(#gradientPessimistic)"
            fillOpacity={visibility.pessimistic ? 0.3 : 0}
            strokeOpacity={visibility.pessimistic ? 1 : 0}
            style={{ transition: 'opacity 150ms' }}
            name="Pessimista"
          />
          
          {/* Optimistic area - conditional with fade */}
          <Area
            type="monotone"
            dataKey="optimisticBalance"
            stroke={COLORS.optimistic}
            fill="url(#gradientOptimistic)"
            fillOpacity={visibility.optimistic ? 0.4 : 0}
            strokeOpacity={visibility.optimistic ? 1 : 0}
            style={{ transition: 'opacity 150ms' }}
            name="Otimista"
          />
          
          {/* Investment-inclusive line - NEW */}
          <Line
            type="monotone"
            dataKey="investmentInclusiveBalance"
            stroke={COLORS.investmentInclusive}
            strokeWidth={2}
            strokeOpacity={visibility.investmentInclusive ? 1 : 0}
            dot={false}
            activeDot={{
              r: 6,
              stroke: COLORS.investmentInclusive,
              strokeWidth: 2,
              fill: 'hsl(var(--card))',
            }}
            style={{ transition: 'opacity 150ms' }}
            name="Saldo com Investimentos"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Replace static legend with interactive */}
      <ChartLegend visibility={visibility} onToggle={handleToggle} />
    </div>
  )
}
```

---

### Step 5: Update Tooltip (20 min)

**File**: `src/components/cashflow/chart-tooltip.tsx`

```typescript
import type { LineVisibility } from './types'

// Add new color
const COLORS = {
  optimistic: '#22c55e',
  pessimistic: '#f59e0b',
  investmentInclusive: '#06b6d4', // NEW
  danger: '#ef4444',
  // ... rest
} as const

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartDataPoint }>
  visibility?: LineVisibility // NEW - optional for backward compatibility
}

export function ChartTooltip({ active, payload, visibility }: ChartTooltipProps) {
  // ... existing null checks ...
  
  // Default to all visible if not provided
  const vis = visibility ?? {
    optimistic: true,
    pessimistic: true,
    investmentInclusive: true,
    dangerZone: true,
  }

  return (
    <div className={cn('rounded-lg border bg-card p-3 shadow-lg', ...)}>
      {/* Date header */}
      <p className="font-medium text-foreground mb-2">
        {formatTooltipDate(snapshot.date)}
      </p>

      {/* Balance section - conditional */}
      <div className="space-y-1 mb-3">
        {vis.optimistic && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Otimista:</span>
            <span style={{ color: COLORS.optimistic }}>
              {formatCurrency(snapshot.optimisticBalance)}
            </span>
          </div>
        )}
        {vis.pessimistic && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pessimista:</span>
            <span style={{ color: COLORS.pessimistic }}>
              {formatCurrency(snapshot.pessimisticBalance)}
            </span>
          </div>
        )}
        {vis.investmentInclusive && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Com Investimentos:</span>
            <span style={{ color: COLORS.investmentInclusive }}>
              {formatCurrency(dataPoint.investmentInclusiveBalance * 100)}
            </span>
          </div>
        )}
      </div>
      
      {/* ... income/expense events (unchanged) ... */}
    </div>
  )
}
```

---

## Testing Checklist

### Manual Testing

1. **Investment Line Display**
   - [ ] Add investment account with balance
   - [ ] Verify cyan line appears on chart
   - [ ] Verify line starts at pessimistic + investment total
   - [ ] Verify line follows pessimistic pattern

2. **Legend Interactivity**
   - [ ] Click each legend item
   - [ ] Verify corresponding element toggles visibility
   - [ ] Verify 150ms fade animation
   - [ ] Verify muted appearance when hidden

3. **Tooltip Behavior**
   - [ ] Hover over chart with all lines visible
   - [ ] Verify all three balances shown
   - [ ] Hide a line, hover again
   - [ ] Verify hidden line excluded from tooltip

4. **Y-Axis Stability**
   - [ ] Note Y-axis scale with all lines visible
   - [ ] Hide investment-inclusive line
   - [ ] Verify Y-axis scale unchanged

5. **Edge Cases**
   - [ ] No investment accounts → line matches pessimistic
   - [ ] All lines hidden → empty chart, axes visible
   - [ ] Page refresh → all lines visible again

### Unit Tests

```typescript
// src/hooks/use-cashflow-projection.test.ts
describe('transformToChartData', () => {
  it('should add investmentInclusiveBalance to each point', () => {
    const days = [/* mock DailySnapshot */]
    const investmentTotal = 10000_00 // R$10,000 in cents
    
    const result = transformToChartData(days, investmentTotal)
    
    expect(result[0].investmentInclusiveBalance).toBe(
      result[0].pessimisticBalance + 10000
    )
  })
})
```

---

## Common Gotchas

1. **Cents vs Dollars**: Investment total is in cents (from database), chart displays dollars. Convert at transformation time.

2. **Line import**: Need to import `Line` from recharts alongside existing `Area`, `AreaChart`, etc.

3. **Opacity vs visibility**: Use `strokeOpacity`/`fillOpacity` for fade animation, not conditional rendering, to maintain smooth transitions.

4. **Tooltip payload**: The `investmentInclusiveBalance` is on `dataPoint`, not `snapshot`. Tooltip needs to access it from the correct object.

5. **Mobile touch**: Click handlers work for tap on mobile, no additional handling needed.

