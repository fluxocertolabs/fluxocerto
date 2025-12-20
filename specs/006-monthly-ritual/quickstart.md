# Quickstart: Monthly Ritual Enhancement

**Feature**: 006-monthly-ritual  
**Date**: 2025-11-26

## Overview

This document provides a quick reference for implementing the Monthly Ritual Enhancement feature. It covers the key implementation patterns, file locations, and testing strategies.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Familiarity with React, TypeScript, Zustand, and Dexie.js

## Quick Setup

```bash
# Ensure you're on the feature branch
git checkout 006-monthly-ritual

# Install dependencies (if not already done)
pnpm install

# Start development server
pnpm dev
```

## Key Implementation Areas

### 1. Database Schema Migration

**File**: `src/db/index.ts`

Add version 2 with `balanceUpdatedAt` field support:

```typescript
this.version(2).stores({
  accounts: 'id, name, type',
  projects: 'id, name, isActive',
  expenses: 'id, name, isActive',
  creditCards: 'id, name',
})
// No upgrade function needed - new field is optional
```

### 2. Type Definitions

**File**: `src/types/index.ts`

Extend existing schemas:

```typescript
// Add to BankAccountSchema
balanceUpdatedAt: z.date().optional(),

// Add to CreditCardSchema
balanceUpdatedAt: z.date().optional(),

// Add new type
export const ProjectionDaysSchema = z.union([
  z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90),
])
export type ProjectionDays = z.infer<typeof ProjectionDaysSchema>
```

### 3. Preferences Store

**File**: `src/stores/preferences-store.ts` (NEW)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePreferencesStore = create(
  persist(
    (set) => ({
      projectionDays: 30,
      setProjectionDays: (days) => set({ projectionDays: days }),
    }),
    { name: 'fluxo-certo-preferences' }
  )
)
```

### 4. Finance Store Extensions

**File**: `src/stores/finance-store.ts`

Add new actions:

```typescript
updateAccountBalance: async (id, balance) => {
  // Validate, update balance + balanceUpdatedAt
},
updateCreditCardBalance: async (id, statementBalance) => {
  // Validate, update statementBalance + balanceUpdatedAt
},
```

### 5. Hook Updates

**File**: `src/hooks/use-cashflow-projection.ts`

Accept projection days from preferences:

```typescript
export function useCashflowProjection(options?: { projectionDays?: number }) {
  const { projectionDays: prefDays } = usePreferencesStore()
  const days = options?.projectionDays ?? prefDays
  // ... use days in calculateCashflow call
}
```

### 6. New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `QuickUpdateView` | `src/components/quick-update/quick-update-view.tsx` | Main balance update modal |
| `BalanceList` | `src/components/quick-update/balance-list.tsx` | List of all balances |
| `BalanceListItem` | `src/components/quick-update/balance-list-item.tsx` | Individual balance row |
| `HealthIndicator` | `src/components/cashflow/health-indicator.tsx` | Dashboard health status |
| `ProjectionSelector` | `src/components/cashflow/projection-selector.tsx` | Period dropdown |
| `SurplusDeficit` | `src/components/cashflow/surplus-deficit.tsx` | Surplus/deficit display |

### 7. Dashboard Integration

**File**: `src/pages/dashboard.tsx`

```typescript
// Add state for quick update modal
const [showQuickUpdate, setShowQuickUpdate] = useState(false)

// Add to render (above chart):
<HealthIndicator
  status={healthStatus}
  message={healthMessage}
  isStale={hasStaleData}
  staleCount={staleEntities.length}
  onStaleClick={() => setShowQuickUpdate(true)}
/>

// Add projection selector in header area
<ProjectionSelector
  value={projectionDays}
  onChange={setProjectionDays}
/>

// Add quick update modal
{showQuickUpdate && (
  <QuickUpdateView
    onDone={() => setShowQuickUpdate(false)}
    onCancel={() => setShowQuickUpdate(false)}
  />
)}
```

## Component Patterns

### Auto-Save on Blur

```typescript
const [error, setError] = useState<string | null>(null)
const [isSaving, setIsSaving] = useState(false)

const handleBlur = async (newValue: number) => {
  if (newValue === originalValue) return
  
  setIsSaving(true)
  setError(null)
  
  const result = await updateBalance(id, newValue)
  
  setIsSaving(false)
  if (!result.success) {
    setError(result.error)
  }
}
```

### Health Status Calculation

```typescript
function calculateHealthStatus(
  optimisticDangerDays: number,
  pessimisticDangerDays: number
): 'good' | 'warning' | 'danger' {
  if (optimisticDangerDays > 0) return 'danger'
  if (pessimisticDangerDays > 0) return 'warning'
  return 'good'
}
```

### Staleness Check

```typescript
function isStale(updatedAt: Date | undefined): boolean {
  if (!updatedAt) return true
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return updatedAt < thirtyDaysAgo
}
```

## Testing Strategy

### Unit Tests

**Location**: `src/lib/*.test.ts`

- Test staleness detection logic
- Test health status calculation
- Test surplus/deficit calculation

### Component Tests

**Location**: `src/components/**/*.test.tsx`

- Test BalanceListItem auto-save behavior
- Test HealthIndicator rendering for each status
- Test ProjectionSelector options

### Integration Tests

- Test full balance update flow (blur → save → UI update)
- Test projection period change (select → recalculate → chart update)

## Common Gotchas

1. **Currency in cents**: All balance values in the database are in cents. Convert to dollars only for display.

2. **Optional balanceUpdatedAt**: Existing records won't have this field. Always check for `undefined` and treat as stale.

3. **Tab navigation**: Use native HTML tab order. Don't implement custom keyboard handlers.

4. **Modal vs Route**: Quick Balance Update is a modal overlay, not a separate route. URL doesn't change.

5. **Zustand persist**: The preferences store uses localStorage. Clear localStorage to reset preferences during testing.

## File Checklist

New files to create:
- [ ] `src/stores/preferences-store.ts`
- [ ] `src/lib/staleness.ts`
- [ ] `src/hooks/use-health-indicator.ts`
- [ ] `src/components/quick-update/index.ts`
- [ ] `src/components/quick-update/quick-update-view.tsx`
- [ ] `src/components/quick-update/balance-list.tsx`
- [ ] `src/components/quick-update/balance-list-item.tsx`
- [ ] `src/components/quick-update/empty-state.tsx`
- [ ] `src/components/cashflow/health-indicator.tsx`
- [ ] `src/components/cashflow/projection-selector.tsx`
- [ ] `src/components/cashflow/surplus-deficit.tsx`

Files to modify:
- [ ] `src/db/index.ts` (add version 2)
- [ ] `src/types/index.ts` (add balanceUpdatedAt, ProjectionDays)
- [ ] `src/stores/finance-store.ts` (add balance update actions)
- [ ] `src/hooks/use-cashflow-projection.ts` (accept projection days)
- [ ] `src/pages/dashboard.tsx` (integrate new components)
- [ ] `src/components/cashflow/summary-panel.tsx` (add surplus/deficit)

## Success Criteria Reference

| Criteria | Target | How to Test |
|----------|--------|-------------|
| SC-001 | Balance update < 2 min | Time from "Update Balances" click to "Done" |
| SC-002 | Health status visible < 3s | Page load to indicator visible |
| SC-003 | Stale detection < 3s | Page load to stale badge visible |
| SC-004 | Projection change < 2s | Selection to chart update |
| SC-005 | Surplus/deficit visible | View summary panel |
| SC-006 | 90% save success rate | Monitor save errors in testing |
| SC-007 | Quick Update loads < 1s | Time from click to interactive |

