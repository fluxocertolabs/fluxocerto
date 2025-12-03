# Snapshots Store Contract

**Module**: `src/stores/snapshots-store.ts`  
**Type**: Zustand Store

## Overview

This store manages CRUD operations for projection snapshots via Supabase client.

---

## Store Interface

```typescript
interface SnapshotsStore {
  // State
  snapshots: SnapshotListItem[]
  currentSnapshot: ProjectionSnapshot | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchSnapshots(): Promise<void>
  fetchSnapshot(id: string): Promise<ProjectionSnapshot | null>
  createSnapshot(input: CreateSnapshotInput): Promise<{ success: boolean; error?: string }>
  deleteSnapshot(id: string): Promise<{ success: boolean; error?: string }>
  clearError(): void
}
```

---

## Types

### `CreateSnapshotInput`

```typescript
interface CreateSnapshotInput {
  name: string
  inputs: SnapshotInputState
  projection: CashflowProjection
}
```

### `SnapshotListItem`

```typescript
interface SnapshotListItem {
  id: string
  name: string
  createdAt: Date
  summaryMetrics: SnapshotSummaryMetrics
}
```

### `SnapshotSummaryMetrics`

```typescript
interface SnapshotSummaryMetrics {
  startingBalance: number      // cents
  endBalanceOptimistic: number // cents
  dangerDayCount: number
}
```

---

## Actions

### `fetchSnapshots()`

Fetches all snapshots for current household (list view).

**Query**:
```sql
SELECT 
  id, 
  name, 
  created_at,
  data->'summaryMetrics' as summary_metrics
FROM projection_snapshots
WHERE household_id = get_user_household_id()
ORDER BY created_at DESC
```

**Returns**: Updates `snapshots` state with list items.

**Errors**:
- Network failure → Sets `error` state
- RLS violation → Empty result (no error)

---

### `fetchSnapshot(id: string)`

Fetches a single snapshot with full data (detail view).

**Query**:
```sql
SELECT *
FROM projection_snapshots
WHERE id = $1
  AND household_id = get_user_household_id()
```

**Returns**: `ProjectionSnapshot | null`

**Errors**:
- Not found → Returns `null`
- Network failure → Sets `error` state

---

### `createSnapshot(input: CreateSnapshotInput)`

Creates a new snapshot from current projection state.

**Mutation**:
```sql
INSERT INTO projection_snapshots 
  (household_id, name, schema_version, data)
VALUES 
  (get_user_household_id(), $name, 1, $data)
RETURNING id
```

**Input Transformation**:
```typescript
const data: SnapshotData = {
  inputs: input.inputs,
  projection: input.projection,
  summaryMetrics: {
    startingBalance: input.projection.startingBalance,
    endBalanceOptimistic: input.projection.optimistic.endBalance,
    dangerDayCount: input.projection.optimistic.dangerDayCount,
  },
}
```

**Returns**: `{ success: true }` or `{ success: false, error: string }`

**Side Effects**:
- On success: Adds new snapshot to `snapshots` list
- Shows toast notification

---

### `deleteSnapshot(id: string)`

Permanently deletes a snapshot.

**Mutation**:
```sql
DELETE FROM projection_snapshots
WHERE id = $1
  AND household_id = get_user_household_id()
```

**Returns**: `{ success: true }` or `{ success: false, error: string }`

**Side Effects**:
- On success: Removes from `snapshots` list
- Shows toast notification

---

## Usage Examples

### Save Snapshot from Dashboard

```typescript
import { useSnapshotsStore } from '@/stores/snapshots-store'
import { useCashflowProjection } from '@/hooks/use-cashflow-projection'
import { useFinanceData } from '@/hooks/use-finance-data'

function SaveSnapshotButton() {
  const { createSnapshot, isLoading } = useSnapshotsStore()
  const { projection } = useCashflowProjection()
  const financeData = useFinanceData()

  const handleSave = async (name: string) => {
    if (!projection) return

    const result = await createSnapshot({
      name,
      inputs: {
        accounts: financeData.accounts,
        projects: financeData.projects,
        singleShotIncome: financeData.singleShotIncome,
        fixedExpenses: financeData.fixedExpenses,
        singleShotExpenses: financeData.singleShotExpenses,
        creditCards: financeData.creditCards,
        futureStatements: financeData.futureStatements,
        projectionDays: projection.days.length as ProjectionDays,
      },
      projection,
    })

    if (result.success) {
      toast.success('Snapshot salvo com sucesso!')
    }
  }

  return (
    <Button onClick={() => openDialog(handleSave)} disabled={isLoading}>
      Salvar Snapshot
    </Button>
  )
}
```

### History Page

```typescript
import { useSnapshotsStore } from '@/stores/snapshots-store'
import { useEffect } from 'react'

function HistoryPage() {
  const { snapshots, fetchSnapshots, isLoading } = useSnapshotsStore()

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  if (isLoading) return <Loading />

  return (
    <ul>
      {snapshots.map((snapshot) => (
        <SnapshotCard key={snapshot.id} snapshot={snapshot} />
      ))}
    </ul>
  )
}
```

### Snapshot Detail Page

```typescript
import { useSnapshotsStore } from '@/stores/snapshots-store'
import { useSnapshotProjection } from '@/hooks/use-snapshot-projection'
import { useParams } from 'react-router-dom'

function SnapshotDetailPage() {
  const { snapshotId } = useParams()
  const { fetchSnapshot, currentSnapshot, isLoading } = useSnapshotsStore()

  useEffect(() => {
    if (snapshotId) fetchSnapshot(snapshotId)
  }, [snapshotId, fetchSnapshot])

  const { chartData, dangerRanges, summaryStats } = useSnapshotProjection(currentSnapshot)

  if (isLoading) return <Loading />
  if (!currentSnapshot) return <NotFound />

  return (
    <>
      <SummaryPanel stats={summaryStats} />
      <CashflowChart chartData={chartData} dangerRanges={dangerRanges} />
    </>
  )
}
```

