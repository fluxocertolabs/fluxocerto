# Research: Cashflow Dashboard

**Feature**: 004-cashflow-dashboard  
**Date**: 2025-11-26

## Research Tasks Completed

### 1. Recharts 3.5.0 Best Practices for Area Charts

**Decision**: Use `AreaChart` with dual `Area` components for optimistic/pessimistic scenarios

**Rationale**:
- AreaChart provides the filled area visualization specified in FR-002
- ResponsiveContainer handles responsive sizing (FR-010)
- Built-in Tooltip component supports custom content for day details (FR-007)
- ReferenceLine/ReferenceArea can highlight danger zones (FR-005)

**Key Patterns**:
```tsx
// Responsive container wrapping
<ResponsiveContainer width="100%" height={400}>
  <AreaChart data={chartData}>
    <defs>
      <linearGradient id="optimistic" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
      </linearGradient>
    </defs>
    <Area type="monotone" dataKey="optimisticBalance" fill="url(#optimistic)" />
  </AreaChart>
</ResponsiveContainer>
```

**Alternatives Considered**:
- LineChart: Less visual impact, doesn't show area fills as specified
- ComposedChart: Overkill for this use case

---

### 2. Danger Day Visualization Strategy

**Decision**: Use ReferenceArea components to highlight negative balance regions

**Rationale**:
- ReferenceArea can span specific date ranges with custom fill colors
- More visually prominent than just changing line color
- Can be conditionally rendered based on danger day data

**Implementation Approach**:
```tsx
// For each danger day range, render a ReferenceArea
{dangerRanges.map((range, i) => (
  <ReferenceArea
    key={i}
    x1={range.start}
    x2={range.end}
    fill="#ef4444"
    fillOpacity={0.15}
  />
))}

// Also add ReferenceLine at y=0 for visual anchor
<ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
```

**Alternatives Considered**:
- Custom dot rendering: More complex, less visible
- Gradient color stops: Harder to implement precisely

---

### 3. Custom Tooltip Implementation

**Decision**: Create custom tooltip component with rich day details

**Rationale**:
- Default Recharts tooltip doesn't support complex nested data display
- Need to show income events, expense events, and both scenario balances
- Must work on both desktop (hover) and mobile (tap)

**Implementation Approach**:
```tsx
// Custom tooltip receives payload with full day data
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const dayData = payload[0].payload // DailySnapshot
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg">
      <p className="font-medium">{formatDate(dayData.date)}</p>
      <div className="mt-2 space-y-1">
        <p className="text-green-600">Optimistic: {formatCurrency(dayData.optimisticBalance)}</p>
        <p className="text-amber-600">Pessimistic: {formatCurrency(dayData.pessimisticBalance)}</p>
      </div>
      {/* Income/expense events */}
    </div>
  )
}
```

**Alternatives Considered**:
- External panel on click: Worse UX, requires more screen real estate
- Modal: Too disruptive for quick glance information

---

### 4. Currency Formatting Strategy

**Decision**: Use Intl.NumberFormat with browser locale detection

**Rationale**:
- Spec states "user's locale format (browser locale)"
- Intl.NumberFormat is built-in, no additional dependencies
- Handles edge cases (millions, cents) automatically

**Implementation**:
```typescript
// src/lib/format.ts
export function formatCurrency(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: 'USD', // Could be configurable in future
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars)
}
```

**Alternatives Considered**:
- Fixed format: Doesn't respect user locale
- External library (currency.js): Unnecessary dependency

---

### 5. Data Flow Architecture

**Decision**: Use Dexie React hooks directly in custom hook, memoize projection

**Rationale**:
- Existing pattern uses `useLiveQuery` from dexie-react-hooks
- Cashflow engine is already implemented and tested
- Memoization prevents unnecessary recalculations

**Implementation**:
```typescript
// src/hooks/use-cashflow-projection.ts
export function useCashflowProjection() {
  const accounts = useLiveQuery(() => db.accounts.toArray())
  const projects = useLiveQuery(() => db.projects.toArray())
  const expenses = useLiveQuery(() => db.expenses.toArray())
  const creditCards = useLiveQuery(() => db.creditCards.toArray())

  const projection = useMemo(() => {
    if (!accounts || !projects || !expenses || !creditCards) return null
    return calculateCashflow({ accounts, projects, expenses, creditCards })
  }, [accounts, projects, expenses, creditCards])

  return {
    projection,
    isLoading: projection === null,
    hasData: accounts?.length > 0 || projects?.length > 0,
  }
}
```

**Alternatives Considered**:
- Store projection in Zustand: Unnecessary complexity, data is derived
- Calculate in component: Violates separation of concerns

---

### 6. Loading State Implementation

**Decision**: Skeleton UI matching chart and summary panel shapes

**Rationale**:
- FR-009a specifies skeleton/shimmer placeholders
- Better UX than spinner for known layout
- Matches shadcn/ui patterns

**Implementation**:
```tsx
// Skeleton for chart area
<div className="animate-pulse">
  <div className="h-[400px] bg-muted rounded-lg" />
</div>

// Skeleton for summary cards
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
  {[1, 2, 3, 4].map(i => (
    <div key={i} className="h-24 bg-muted rounded-lg" />
  ))}
</div>
```

---

### 7. Error Handling Strategy

**Decision**: Inline error state with retry button

**Rationale**:
- Spec explicitly states "inline error message with retry button"
- Keeps user on dashboard, allows recovery without navigation

**Implementation**:
```tsx
function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <p className="text-lg font-medium">Unable to load projection</p>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  )
}
```

---

### 8. Mobile Responsiveness Strategy

**Decision**: Responsive grid, touch-friendly chart interactions

**Rationale**:
- FR-010 requires 320px to 1920px+ support
- Chart must be readable on mobile
- Tap interaction for tooltips on touch devices

**Implementation**:
- Summary panel: `grid-cols-2` on mobile, `grid-cols-4` on desktop
- Chart height: Fixed 300px mobile, 400px desktop
- Tooltip: Recharts handles touch events automatically
- X-axis labels: Show fewer labels on mobile via `interval` prop

---

### 9. Chart Data Transformation

**Decision**: Transform DailySnapshot[] to chart-compatible format in hook

**Rationale**:
- Recharts expects flat object array with primitive values
- Dates need formatting for X-axis display
- Keep transformation logic out of components

**Implementation**:
```typescript
interface ChartDataPoint {
  date: string           // Formatted date for display
  timestamp: number      // For sorting/comparison
  optimisticBalance: number
  pessimisticBalance: number
  isOptimisticDanger: boolean
  isPessimisticDanger: boolean
  // Keep reference to full snapshot for tooltip
  snapshot: DailySnapshot
}

function transformToChartData(days: DailySnapshot[]): ChartDataPoint[] {
  return days.map(day => ({
    date: format(day.date, 'MMM d'),
    timestamp: day.date.getTime(),
    optimisticBalance: day.optimisticBalance / 100, // Convert to dollars for display
    pessimisticBalance: day.pessimisticBalance / 100,
    isOptimisticDanger: day.isOptimisticDanger,
    isPessimisticDanger: day.isPessimisticDanger,
    snapshot: day,
  }))
}
```

---

### 10. Color Scheme

**Decision**: Green (#22c55e) for optimistic, Amber (#f59e0b) for pessimistic, Red (#ef4444) for danger

**Rationale**:
- FR-002 specifies "green for optimistic, amber/orange for pessimistic"
- Red for danger is universally understood
- Colors from Tailwind palette for consistency

**CSS Variables** (for theming):
```css
:root {
  --color-optimistic: 142.1 76.2% 36.3%;  /* green-500 */
  --color-pessimistic: 37.7 92.1% 50.2%;  /* amber-500 */
  --color-danger: 0 84.2% 60.2%;          /* red-500 */
}
```

---

## Dependencies to Install

| Package | Version | Purpose |
|---------|---------|---------|
| recharts | 3.5.0 | Chart visualization |

**Note**: All other dependencies are already installed per Constitution.

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Chart library | Recharts 3.5.0 (per spec clarification) |
| Loading state | Skeleton/shimmer UI (per spec clarification) |
| Error handling | Inline error with retry (per spec clarification) |
| Desktop vs mobile interaction | Hover tooltip on desktop, tap on mobile (per spec clarification) |
| Color scheme | Green optimistic, amber pessimistic (per spec clarification) |

All NEEDS CLARIFICATION items from Technical Context have been resolved.

