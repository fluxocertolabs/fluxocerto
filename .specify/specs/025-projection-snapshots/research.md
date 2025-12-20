# Research: Historical Projection Snapshots

**Feature Branch**: `025-projection-snapshots`  
**Date**: December 3, 2025

## 1. JSONB Storage Strategy for Snapshot Data

### Decision
Use a single JSONB column (`data`) to store both the input state and projection result, with normalized metadata columns for queryable fields.

### Rationale
- **Query performance**: Metadata columns (`name`, `created_at`, `household_id`) enable efficient filtering and sorting without JSON parsing
- **Flexibility**: JSONB accommodates variable projection lengths (1-365 days) without schema changes
- **Consistency**: Matches Supabase best practices for semi-structured data
- **Schema evolution**: Can add new fields to JSONB without migrations

### Alternatives Considered
1. **Fully normalized tables** (separate tables for snapshot_accounts, snapshot_expenses, etc.)
   - Rejected: High complexity, many joins, overkill for read-only historical data
2. **TEXT column with JSON string**
   - Rejected: No JSON operators, harder to query/debug
3. **Multiple JSONB columns** (one for inputs, one for results)
   - Rejected: Unnecessary complexity, single column provides atomic storage

### Data Structure
```typescript
interface SnapshotData {
  // Input state at capture time
  inputs: {
    accounts: BankAccount[]
    projects: RecurringProject[]
    singleShotIncome: SingleShotIncome[]
    fixedExpenses: FixedExpense[]
    singleShotExpenses: SingleShotExpense[]
    creditCards: CreditCard[]
    futureStatements: FutureStatement[]
    projectionDays: ProjectionDays
  }
  // Calculated projection result
  projection: CashflowProjection
  // For display without recalculation
  summaryMetrics: {
    startingBalance: number      // cents
    endBalanceOptimistic: number // cents
    dangerDayCount: number
  }
}
```

---

## 2. Schema Versioning Strategy

### Decision
Store `schema_version` as a normalized integer column. Render old snapshots with best-effort display.

### Rationale
- **Backward compatibility**: Old snapshots remain viewable even as data structures evolve
- **Forward path**: If schema changes require transformation, version identifies which migration to apply
- **Simple implementation**: Integer comparison faster than string parsing
- **Graceful degradation**: Missing fields in old schemas use sensible defaults

### Version Rules
- **Version 1**: Initial schema (this feature)
- **Breaking changes**: Increment version, add migration function if needed
- **Additive changes**: No version bump needed (JSONB handles gracefully)

### Rendering Strategy
```typescript
function renderSnapshot(snapshot: ProjectionSnapshot) {
  // Current version renders directly
  if (snapshot.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return renderCurrentFormat(snapshot.data)
  }
  
  // Older versions attempt best-effort rendering
  // Missing optional fields use defaults
  return renderLegacyFormat(snapshot.data, snapshot.schemaVersion)
}
```

---

## 3. Routing Pattern

### Decision
Add two new protected routes: `/history` (list) and `/history/:id` (detail).

### Rationale
- **Consistency**: Follows existing pattern (`/`, `/manage`, `/login`)
- **RESTful**: List at `/history`, detail at `/history/:id`
- **Navigation**: Natural breadcrumb flow: Dashboard → History → Snapshot Detail

### Implementation Pattern
Routes follow existing protected route structure:
```tsx
<Route
  path="/history"
  element={
    isAuthenticated ? (
      <div className={cn('min-h-screen bg-background text-foreground')}>
        <Header />
        <HistoryPage />
      </div>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
<Route
  path="/history/:snapshotId"
  element={
    isAuthenticated ? (
      <div className={cn('min-h-screen bg-background text-foreground')}>
        <Header />
        <SnapshotDetailPage />
      </div>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
```

---

## 4. Component Reuse Strategy

### Decision
Pass frozen data directly to existing `CashflowChart` and `SummaryPanel` components.

### Rationale
- **Zero chart modifications**: Components already accept data as props
- **Consistent visualization**: Historical and live views look identical
- **DRY principle**: Avoid duplicating complex chart logic

### Implementation
The existing `useCashflowProjection` hook exports helper functions:
- `transformToChartData(days, investmentTotal)` - Converts DailySnapshot[] to ChartDataPoint[]
- `getDangerRanges(chartData)` - Consolidates danger days into ranges
- `transformToSummaryStats(projection)` - Internal function (needs export)

For snapshots:
```typescript
// use-snapshot-projection.ts
export function useSnapshotProjection(snapshot: ProjectionSnapshot) {
  const chartData = useMemo(() => {
    const investmentTotal = calculateInvestmentTotal(snapshot.data.inputs.accounts)
    return transformToChartData(snapshot.data.projection.days, investmentTotal)
  }, [snapshot])

  const dangerRanges = useMemo(() => getDangerRanges(chartData), [chartData])
  const summaryStats = useMemo(() => transformToSummaryStats(snapshot.data.projection), [snapshot])

  return { chartData, dangerRanges, summaryStats }
}
```

---

## 5. Save Operation UX

### Decision
Modal dialog triggered from dashboard with name input (auto-suggested date).

### Rationale
- **Non-disruptive**: Modal doesn't navigate away from dashboard
- **Quick action**: Single click + optional name edit + confirm
- **Familiar pattern**: Similar to existing dialogs in the app

### Flow
1. User clicks "Save Snapshot" button on dashboard
2. Modal opens with name input pre-filled with current date (e.g., "Dec 3, 2025")
3. User optionally edits name
4. User clicks "Save"
5. Toast shows success, modal closes
6. On error: Toast shows error with "Retry" button

---

## 6. RLS Policy Pattern

### Decision
Use existing `household_id` + `get_user_household_id()` pattern.

### Rationale
- **Consistency**: All tables use this pattern (accounts, projects, expenses, etc.)
- **Security**: Proven pattern, battle-tested in production
- **Simplicity**: Single function handles auth context

### SQL Pattern
```sql
CREATE POLICY "Users can read household snapshots"
ON projection_snapshots FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household snapshots"
ON projection_snapshots FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household snapshots"
ON projection_snapshots FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());
```

Note: No UPDATE policy - snapshots are immutable after creation.

---

## 7. Performance Considerations

### Decision
No pagination for history list; optimize query with index.

### Rationale
- **Scale**: Typical household has <100 snapshots (monthly saves = 12/year)
- **Performance target**: 50 snapshots in <2s easily achievable with index
- **Simplicity**: No pagination UI/logic for MVP

### Optimizations
- Index on `(household_id, created_at DESC)` for list query
- Limit JSONB in list query (only return summary metrics, not full data)
- Full `data` column loaded only on detail view

---

## 8. Header Navigation

### Decision
Add "Histórico" link to header navigation.

### Rationale
- **Discoverability**: Primary navigation for new feature
- **Consistency**: Matches existing nav pattern (Dashboard, Gerenciar)

### Implementation
Add to `components/layout/header.tsx` navigation items.

