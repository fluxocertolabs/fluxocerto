# Research: Monthly Ritual Enhancement

**Feature**: 006-monthly-ritual  
**Date**: 2025-11-26  
**Status**: Complete

## Research Tasks

### 1. Dexie.js Database Migration Pattern

**Context**: Need to add `balanceUpdatedAt` field to BankAccount and CreditCard, plus new UserPreferences table.

**Decision**: Use Dexie's built-in versioning system with upgrade function.

**Rationale**: 
- Dexie supports declarative schema versioning with `.version(n).stores()`
- Upgrade functions allow data transformation during migration
- Existing data is preserved - new fields default to `undefined` which we treat as "stale"

**Implementation**:
```typescript
// db/index.ts
this.version(2).stores({
  accounts: 'id, name, type',
  projects: 'id, name, isActive',
  expenses: 'id, name, isActive',
  creditCards: 'id, name',
  userPreferences: 'id',  // New table
}).upgrade(tx => {
  // Existing records get balanceUpdatedAt = undefined (treated as stale)
  // No data transformation needed - schema handles it
})
```

**Alternatives Considered**:
- Manual migration script: Rejected - Dexie handles this automatically
- Separate migration file: Rejected - overkill for simple schema addition

---

### 2. Auto-Save on Blur Pattern

**Context**: FR-005 requires balance changes to save immediately when field loses focus, with inline error + retry on failure.

**Decision**: Use controlled input with `onBlur` handler that triggers async save, with local error state per field.

**Rationale**:
- Matches existing inline-edit-input.tsx pattern in manage/shared/
- Provides immediate feedback without blocking UI
- Error state is localized to the specific field

**Implementation Pattern**:
```typescript
const [saveError, setSaveError] = useState<string | null>(null)
const [isSaving, setIsSaving] = useState(false)

const handleBlur = async () => {
  if (value === originalValue) return // No change
  
  setIsSaving(true)
  setSaveError(null)
  
  const result = await updateBalance(id, value)
  
  setIsSaving(false)
  if (!result.success) {
    setSaveError(result.error)
  }
}
```

**Alternatives Considered**:
- Debounced auto-save on change: Rejected - spec explicitly requires blur-based save
- Global error toast: Rejected - spec requires inline error on specific field

---

### 3. Health Indicator Logic

**Context**: FR-007/FR-008 require health indicator showing Good/Warning/Danger based on danger days, plus stale data detection.

**Decision**: Derive health status from existing projection data + staleness check.

**Rationale**:
- Projection already calculates danger days for both scenarios
- Health status is pure derivation: no danger = Good, pessimistic-only = Warning, optimistic danger = Danger
- Staleness is simple date comparison (30 days threshold)

**Logic**:
```typescript
type HealthStatus = 'good' | 'warning' | 'danger'

function calculateHealthStatus(
  optimisticDangerDays: number,
  pessimisticDangerDays: number
): HealthStatus {
  if (optimisticDangerDays > 0) return 'danger'
  if (pessimisticDangerDays > 0) return 'warning'
  return 'good'
}

function isStale(updatedAt: Date | undefined): boolean {
  if (!updatedAt) return true // Legacy data without timestamp
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return updatedAt < thirtyDaysAgo
}
```

**Alternatives Considered**:
- Separate health calculation endpoint: Rejected - overkill, can derive from existing data
- Store health status in DB: Rejected - it's derived state, should compute on render

---

### 4. Projection Period Persistence

**Context**: FR-010 requires persisting user's projection period preference in local storage.

**Decision**: Use dedicated Zustand store with localStorage persistence, separate from IndexedDB.

**Rationale**:
- Preferences are simple key-value, don't need IndexedDB's query capabilities
- Zustand's persist middleware handles localStorage automatically
- Keeps preferences separate from financial data (cleaner architecture)

**Implementation**:
```typescript
// stores/preferences-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesState {
  projectionDays: 7 | 14 | 30 | 60 | 90
  setProjectionDays: (days: 7 | 14 | 30 | 60 | 90) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      projectionDays: 30, // Default
      setProjectionDays: (days) => set({ projectionDays: days }),
    }),
    { name: 'family-finance-preferences' }
  )
)
```

**Alternatives Considered**:
- Store in IndexedDB UserPreferences table: Rejected - overkill for simple preference
- React Context: Rejected - no persistence, loses state on refresh
- localStorage directly: Rejected - Zustand persist is cleaner and handles serialization

---

### 5. Surplus/Deficit Calculation

**Context**: FR-012/FR-013 require showing surplus (green) or deficit (red) as end balance minus starting balance.

**Decision**: Add surplus/deficit to existing SummaryStats type, calculate in useCashflowProjection hook.

**Rationale**:
- Simple derivation: `surplus = endBalance - startingBalance`
- Positive = surplus (green), negative = deficit (red)
- Both scenarios should show their respective surplus/deficit

**Implementation**:
```typescript
interface ScenarioSummary {
  // ... existing fields
  surplus: number  // Can be negative (deficit)
}

// In transformToSummaryStats:
surplus: projection.optimistic.endBalance - projection.startingBalance
```

**Alternatives Considered**:
- Calculate in component: Rejected - better to centralize in hook
- Separate surplus/deficit fields: Rejected - single field with sign is simpler

---

### 6. Quick Balance Update View Navigation

**Context**: Need to navigate to Quick Balance Update view from dashboard and back.

**Decision**: Use React Router with `/update-balances` route, or modal overlay.

**Rationale**:
- Modal approach keeps user context (dashboard visible behind)
- Route approach allows direct linking and browser back button
- Given spec says "focused view", modal with full-screen appearance is appropriate

**Implementation**: Full-screen modal/overlay that covers dashboard
- "Update Balances" button opens modal
- "Done" or "Cancel" closes modal and returns to dashboard
- URL doesn't change (modal state, not route)

**Alternatives Considered**:
- Separate route: Rejected - spec implies returning to dashboard, modal is simpler
- Side panel: Rejected - spec says "focused view", implies full attention

---

### 7. Keyboard Navigation (Tab Between Fields)

**Context**: FR-004 requires Tab key to move focus between balance fields.

**Decision**: Use native HTML tab order with `tabIndex` attributes.

**Rationale**:
- Browser handles Tab navigation automatically
- Just need to ensure inputs are in correct DOM order
- No custom key handlers needed

**Implementation**:
- Render balance items in a single list (accounts first, then credit cards)
- Each balance input is a standard `<input>` element
- Tab naturally moves through inputs in DOM order

**Alternatives Considered**:
- Custom keyboard handler: Rejected - native tab order works perfectly
- Arrow key navigation: Rejected - spec specifically says Tab

---

## Resolved Clarifications

All NEEDS CLARIFICATION items from Technical Context have been resolved:

1. ✅ Database migration approach: Dexie versioning
2. ✅ Auto-save pattern: onBlur with local error state
3. ✅ Health indicator logic: Derived from projection data
4. ✅ Preference persistence: Zustand with localStorage
5. ✅ Surplus/deficit calculation: endBalance - startingBalance
6. ✅ Navigation pattern: Full-screen modal overlay
7. ✅ Keyboard navigation: Native tab order

## Dependencies & Best Practices Verified

| Dependency | Version | Best Practice Applied |
|------------|---------|----------------------|
| Dexie.js | 4.2.1 | Versioned schema migrations with upgrade functions |
| Zustand | 5.0.8 | persist middleware for localStorage |
| React | 19.2.0 | Controlled inputs, onBlur for auto-save |
| shadcn/ui | latest | Button, Input, Dialog components |
| Tailwind | 4.1.17 | Utility classes for health indicator colors |

