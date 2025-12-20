# Research: Investment-Inclusive Balance Line

**Date**: 2025-11-28  
**Status**: Complete

## Research Questions

### 1. How to add a stroke-only line (no fill) to an existing AreaChart?

**Decision**: Use the `Line` component from Recharts alongside existing `Area` components in the same `AreaChart`.

**Rationale**: Recharts supports mixing `Area` and `Line` components within the same chart. The `Line` component renders stroke-only by default (no fill). This allows the investment-inclusive line to be visually distinct from the gradient-filled optimistic/pessimistic areas.

**Implementation**:
```tsx
import { AreaChart, Area, Line } from 'recharts'

<AreaChart data={chartData}>
  <Area dataKey="optimisticBalance" fill="url(#gradientOptimistic)" />
  <Area dataKey="pessimisticBalance" fill="url(#gradientPessimistic)" />
  <Line 
    type="monotone" 
    dataKey="investmentInclusiveBalance" 
    stroke="#06b6d4" 
    strokeWidth={2}
    dot={false}
    name="Saldo com Investimentos"
  />
</AreaChart>
```

**Alternatives considered**:
- Using `Area` with `fill="none"` - Works but semantically `Line` is clearer
- Separate chart overlay - Unnecessarily complex, harder to align

---

### 2. How to implement interactive legend with toggle functionality in Recharts?

**Decision**: Create a custom legend component with React state for visibility tracking, and conditionally render chart elements based on visibility state.

**Rationale**: Recharts' built-in `Legend` component supports `onClick` events but doesn't manage visibility state. Using a custom legend with Zustand or React state provides full control over:
- Visual muting of hidden items (opacity, strikethrough)
- Cursor and tooltip on hover
- Conditional rendering of chart elements

**Implementation approach**:
```tsx
// Visibility state (React useState - session only, per spec FR-008)
const [visibility, setVisibility] = useState({
  optimistic: true,
  pessimistic: true,
  investmentInclusive: true,
  dangerZone: true,
})

// Custom legend with click handlers
function ChartLegend({ visibility, onToggle }) {
  return (
    <div className="flex justify-center gap-6">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onToggle(item.key)}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            !visibility[item.key] && 'opacity-50 line-through'
          )}
          title="Clique para ocultar/mostrar"
        >
          <div style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// Conditional chart element rendering
{visibility.optimistic && (
  <Area dataKey="optimisticBalance" ... />
)}
```

**Alternatives considered**:
- Using Recharts' `Legend` onClick directly - Less control over visual states
- CSS-only visibility (display: none) - Doesn't remove from tooltip, Y-axis still includes data
- Zustand store for visibility - Overkill for session-only state

---

### 3. How to calculate investment-inclusive balance?

**Decision**: Sum investment account balances once at projection start, then add to each day's pessimistic balance.

**Rationale**: Per spec, investment accounts are:
- Manually updated (not live feeds)
- Represent static wealth (not operational cashflow)
- Added to pessimistic scenario (worst-case operational view)

**Implementation**:
```typescript
// In use-cashflow-projection.ts or transform function
const investmentTotal = accounts
  .filter(a => a.type === 'investment')
  .reduce((sum, a) => sum + a.balance, 0)

// For each chart data point
const investmentInclusiveBalance = 
  day.pessimisticBalance + investmentTotal
```

**Alternatives considered**:
- Adding to optimistic balance - Spec explicitly says pessimistic baseline
- Calculating per-day investment changes - Unnecessary, investments are static
- Separate investment projection - Over-engineering for current requirements

---

### 4. How to maintain fixed Y-axis scale when toggling line visibility?

**Decision**: Calculate Y-axis domain from ALL data (optimistic, pessimistic, investment-inclusive) regardless of current visibility state.

**Rationale**: Per spec FR-010, the Y-axis should remain fixed when toggling visibility to prevent disorienting axis jumps. This means:
- Domain calculation happens once based on all data
- Visibility state doesn't affect domain
- Users see consistent scale when comparing scenarios

**Implementation**:
```typescript
// Always include all balances in domain calculation
const allBalances = chartData.flatMap((d) => [
  d.optimisticBalance,
  d.pessimisticBalance,
  d.investmentInclusiveBalance, // Always include even if hidden
])
const yMin = Math.min(...allBalances, 0)
const yMax = Math.max(...allBalances)
```

**Alternatives considered**:
- Rescale on toggle - Explicitly rejected by spec (FR-010)
- Animate scale transitions - Adds complexity, user still loses reference point

---

### 5. How to conditionally show tooltip data for visible lines only?

**Decision**: Pass visibility state to custom tooltip and filter displayed values.

**Rationale**: Per spec FR-011, hidden line values should be excluded from tooltip content. The existing `ChartTooltip` component receives the full data point; we filter based on visibility.

**Implementation**:
```tsx
// Pass visibility to tooltip
<Tooltip 
  content={<ChartTooltip visibility={visibility} />}
/>

// In ChartTooltip
function ChartTooltip({ visibility, ...props }) {
  // Only show balance for visible lines
  return (
    <div>
      {visibility.optimistic && (
        <div>Otimista: {formatCurrency(snapshot.optimisticBalance)}</div>
      )}
      {visibility.pessimistic && (
        <div>Pessimista: {formatCurrency(snapshot.pessimisticBalance)}</div>
      )}
      {visibility.investmentInclusive && (
        <div>Com Investimentos: {formatCurrency(investmentInclusiveBalance)}</div>
      )}
    </div>
  )
}
```

**Alternatives considered**:
- Recharts' built-in filtering - Doesn't support our custom tooltip structure
- Always show all values with visual indicator - Adds clutter, spec says exclude

---

### 6. How to implement 150ms fade transition for visibility toggle?

**Decision**: Use CSS transitions on chart element opacity via Recharts' animation props or wrapper styling.

**Rationale**: Per spec clarification, visibility changes should use a 150ms opacity fade for visual continuity. Recharts supports animation on most elements.

**Implementation options**:

**Option A - Recharts animationDuration** (preferred):
```tsx
<Area
  dataKey="optimisticBalance"
  animationDuration={150}
  // Recharts handles mount/unmount animations
/>
```

**Option B - CSS transition wrapper**:
```tsx
<g 
  className="transition-opacity duration-150"
  style={{ opacity: visibility.optimistic ? 1 : 0 }}
>
  <Area dataKey="optimisticBalance" />
</g>
```

**Option C - Conditional opacity prop**:
```tsx
<Area
  dataKey="optimisticBalance"
  fillOpacity={visibility.optimistic ? 0.4 : 0}
  strokeOpacity={visibility.optimistic ? 1 : 0}
  style={{ transition: 'opacity 150ms' }}
/>
```

**Decision**: Use Option C (conditional opacity) as it provides smoothest transition without DOM manipulation. For danger zones (ReferenceArea), similar approach applies.

**Alternatives considered**:
- Instant show/hide - Spec explicitly requests 150ms fade
- Framer Motion - Overkill for simple opacity transition

---

## Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Investment line rendering | `Line` component (stroke-only) | Clean visual distinction from area fills |
| Legend interactivity | Custom component + React state | Full control over styling and behavior |
| Investment calculation | Static sum added to pessimistic | Per spec, investments are static wealth |
| Y-axis domain | Fixed based on all data | Prevents disorienting scale jumps (FR-010) |
| Tooltip filtering | Pass visibility to custom tooltip | Clean separation of concerns |
| Fade animation | CSS opacity transition 150ms | Simple, performant, meets spec |
| Visibility state | React useState (not Zustand) | Session-only, component-local state |

---

## Existing Code Patterns to Follow

From `cashflow-chart.tsx`:
- Color constants defined at top: `COLORS = { optimistic: '#22c55e', ... }`
- Y-axis domain calculation with padding
- Custom tooltip via `content={<ChartTooltip />}`
- Legend as separate div below chart

From `use-cashflow-projection.ts`:
- `transformToChartData()` for converting engine output to chart format
- Memoized calculations with `useMemo`
- Access to `accounts` via `useFinanceData()` hook

From `types.ts`:
- `ChartDataPoint` interface for chart data structure
- `DangerRange` for reference areas

---

## Files to Modify

1. **`src/components/cashflow/types.ts`**
   - Add `investmentInclusiveBalance` to `ChartDataPoint`
   - Add `LineVisibility` type

2. **`src/hooks/use-cashflow-projection.ts`**
   - Calculate investment total from accounts
   - Add `investmentInclusiveBalance` to chart data transformation

3. **`src/components/cashflow/cashflow-chart.tsx`**
   - Add visibility state
   - Add `Line` component for investment-inclusive
   - Replace static legend with interactive `ChartLegend`
   - Conditional rendering based on visibility
   - Fixed Y-axis domain calculation

4. **`src/components/cashflow/chart-tooltip.tsx`**
   - Accept visibility prop
   - Add investment-inclusive balance display
   - Conditional rendering based on visibility

5. **`src/components/cashflow/chart-legend.tsx`** (NEW)
   - Interactive legend component
   - Click handlers for toggle
   - Hover states and tooltip
   - Visual muting for hidden items

