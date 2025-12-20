# Quickstart: Cashflow Dashboard

**Feature**: 004-cashflow-dashboard  
**Date**: 2025-11-26

## Prerequisites

- Node.js 20+
- pnpm 10+
- Project dependencies installed (`pnpm install`)

## Quick Setup

### 1. Install New Dependency

```bash
cd /home/delucca/Workspaces/src/sandbox/fluxo-certo
pnpm add recharts@3.5.0
```

### 2. Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

### 3. Add Test Data (Optional)

Open browser DevTools console and run:

```javascript
// Add a checking account
const { useFinanceStore } = await import('/src/stores/finance-store.ts')
const store = useFinanceStore.getState()

await store.addAccount({
  name: 'Main Checking',
  type: 'checking',
  balance: 500000 // $5,000.00 in cents
})

// Add an income project
await store.addProject({
  name: 'Monthly Salary',
  amount: 300000, // $3,000.00
  paymentDay: 15,
  frequency: 'monthly',
  certainty: 'guaranteed',
  isActive: true
})

// Add an expense
await store.addExpense({
  name: 'Rent',
  amount: 150000, // $1,500.00
  dueDay: 1,
  isActive: true
})
```

---

## File Structure

After implementation, the feature will add these files:

```
src/
├── components/
│   └── cashflow/
│       ├── cashflow-chart.tsx      # Main chart component
│       ├── chart-tooltip.tsx       # Custom tooltip
│       ├── summary-panel.tsx       # Statistics cards
│       ├── empty-state.tsx         # No data guidance
│       ├── error-state.tsx         # Error with retry
│       ├── loading-skeleton.tsx    # Skeleton placeholders
│       ├── types.ts                # View-layer types
│       └── index.ts                # Barrel export
├── pages/
│   └── dashboard.tsx               # Main dashboard page
├── hooks/
│   └── use-cashflow-projection.ts  # Data fetching hook
└── lib/
    └── format.ts                   # Currency/date formatting
```

---

## Key Components

### Dashboard Page (`src/pages/dashboard.tsx`)

The main entry point that orchestrates all dashboard components:

```tsx
import { useCashflowProjection } from '@/hooks/use-cashflow-projection'
import { CashflowChart, SummaryPanel, EmptyState, ErrorState, LoadingSkeleton } from '@/components/cashflow'

export function Dashboard() {
  const { projection, isLoading, hasData, error, retry } = useCashflowProjection()

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState error={error} onRetry={retry} />
  if (!hasData) return <EmptyState />

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Cashflow Dashboard</h1>
      <SummaryPanel projection={projection} />
      <CashflowChart projection={projection} />
    </div>
  )
}
```

### Cashflow Chart (`src/components/cashflow/cashflow-chart.tsx`)

Recharts AreaChart with dual scenarios:

```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ChartTooltip } from './chart-tooltip'

export function CashflowChart({ projection }) {
  const chartData = transformToChartData(projection.days)
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData}>
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="optimistic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="pessimistic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        
        <XAxis dataKey="date" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
        
        <Area 
          type="monotone" 
          dataKey="optimisticBalance" 
          stroke="#22c55e" 
          fill="url(#optimistic)" 
        />
        <Area 
          type="monotone" 
          dataKey="pessimisticBalance" 
          stroke="#f59e0b" 
          fill="url(#pessimistic)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

---

## Testing

### Run Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific file
pnpm test src/hooks/use-cashflow-projection.test.ts
```

### Manual Testing Checklist

1. **Empty State**: Clear IndexedDB, verify empty state displays
2. **Loading State**: Add network throttling, verify skeleton shows
3. **Chart Rendering**: Add data, verify chart displays correctly
4. **Danger Days**: Create data that produces negative balance, verify highlighting
5. **Tooltip**: Hover/tap on chart points, verify day details display
6. **Summary Panel**: Verify statistics match expected calculations
7. **Responsiveness**: Test at 320px, 768px, 1920px widths

---

## Common Issues

### Chart Not Rendering

1. Check Recharts is installed: `pnpm list recharts`
2. Verify ResponsiveContainer has parent with defined height
3. Check browser console for errors

### Data Not Updating

1. Dexie hooks require component to be mounted
2. Check IndexedDB in DevTools → Application → IndexedDB
3. Verify `useLiveQuery` is returning data

### Tooltip Not Showing

1. Ensure `Tooltip` component is inside chart
2. Custom tooltip must handle `active` and `payload` props
3. Check z-index if tooltip is behind other elements

---

## Development Tips

### Hot Reload

Vite HMR is enabled. Save files to see changes instantly.

### Inspecting Data

```javascript
// In browser console
const dexie = await import('/src/db/index.ts')
const accounts = await dexie.db.accounts.toArray()
console.log(accounts)
```

### Clearing Data

```javascript
// In browser console
const dexie = await import('/src/db/index.ts')
await dexie.db.delete()
location.reload()
```

---

## Next Steps After Implementation

1. **Integrate with App Router**: Add route to Dashboard page in `App.tsx`
2. **Add Navigation**: Create header/sidebar for navigation between pages
3. **Polish UI**: Fine-tune colors, spacing, animations
4. **Add Tests**: Unit tests for data transformation, integration tests for chart

