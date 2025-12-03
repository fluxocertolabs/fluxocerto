# Data Model: Historical Projection Snapshots

**Feature Branch**: `025-projection-snapshots`  
**Date**: December 3, 2025

## Entity Relationship

```
┌─────────────────┐
│   households    │
│─────────────────│
│ id (PK)         │
│ name            │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────┐
│  projection_snapshots   │
│─────────────────────────│
│ id (PK)                 │
│ household_id (FK)       │
│ name                    │
│ schema_version          │
│ data (JSONB)            │
│ created_at              │
└─────────────────────────┘
```

## Database Schema

### Table: `projection_snapshots`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique snapshot identifier |
| `household_id` | `UUID` | `NOT NULL REFERENCES households(id) ON DELETE CASCADE` | Owning household |
| `name` | `TEXT` | `NOT NULL CHECK (length(name) BETWEEN 1 AND 100)` | User-provided snapshot name |
| `schema_version` | `INTEGER` | `NOT NULL DEFAULT 1` | Data structure version for compatibility |
| `data` | `JSONB` | `NOT NULL` | Complete snapshot data (inputs + projection) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Snapshot creation timestamp |

### Indexes

| Name | Columns | Purpose |
|------|---------|---------|
| `projection_snapshots_household_created_idx` | `(household_id, created_at DESC)` | Efficient list query sorted by date |

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `Users can read household snapshots` | `SELECT` | `household_id = get_user_household_id()` |
| `Users can insert household snapshots` | `INSERT` | `household_id = get_user_household_id()` |
| `Users can delete household snapshots` | `DELETE` | `household_id = get_user_household_id()` |

> **Note**: No UPDATE policy. Snapshots are immutable after creation.

---

## TypeScript Types

### `ProjectionSnapshot` (Database Row)

```typescript
// src/types/snapshot.ts

import { z } from 'zod'
import type { CashflowProjection } from '@/lib/cashflow/types'
import type {
  BankAccount,
  RecurringProject,
  SingleShotIncome,
  FixedExpense,
  SingleShotExpense,
  CreditCard,
  FutureStatement,
  ProjectionDays,
} from '@/types'

// Schema version for data structure evolution
export const CURRENT_SCHEMA_VERSION = 1

/**
 * Frozen input state at snapshot creation time.
 * Captures all financial data needed to reproduce the projection.
 */
export interface SnapshotInputState {
  accounts: BankAccount[]
  projects: RecurringProject[]
  singleShotIncome: SingleShotIncome[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
  projectionDays: ProjectionDays
}

/**
 * Pre-computed metrics for list display (avoids parsing full projection).
 */
export interface SnapshotSummaryMetrics {
  /** Starting balance in cents */
  startingBalance: number
  /** End balance (optimistic) in cents */
  endBalanceOptimistic: number
  /** Number of danger days in optimistic scenario */
  dangerDayCount: number
}

/**
 * Complete snapshot data stored in JSONB column.
 */
export interface SnapshotData {
  inputs: SnapshotInputState
  projection: CashflowProjection
  summaryMetrics: SnapshotSummaryMetrics
}

/**
 * Full projection snapshot entity (database row).
 */
export interface ProjectionSnapshot {
  id: string
  householdId: string
  name: string
  schemaVersion: number
  data: SnapshotData
  createdAt: Date
}

/**
 * Input for creating a new snapshot.
 */
export const SnapshotInputSchema = z.object({
  name: z.string().min(1, 'Snapshot name is required').max(100),
})

export type SnapshotInput = z.infer<typeof SnapshotInputSchema>

/**
 * Input for creating a new snapshot via store action.
 * Used by SaveSnapshotDialog to pass data to createSnapshot().
 */
export interface CreateSnapshotInput {
  name: string
  inputs: SnapshotInputState
  projection: CashflowProjection
}

/**
 * Snapshot list item (subset of fields for list display).
 */
export interface SnapshotListItem {
  id: string
  name: string
  createdAt: Date
  summaryMetrics: SnapshotSummaryMetrics
}
```

---

## JSONB Data Structure

### `data` Column Schema

```json
{
  "inputs": {
    "accounts": [
      {
        "id": "uuid",
        "name": "Checking",
        "type": "checking",
        "balance": 1000000,
        "owner": { "id": "uuid", "name": "John" },
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-12-01T00:00:00Z"
      }
    ],
    "projects": [],
    "singleShotIncome": [],
    "fixedExpenses": [],
    "singleShotExpenses": [],
    "creditCards": [],
    "futureStatements": [],
    "projectionDays": 30
  },
  "projection": {
    "startDate": "2025-12-03T00:00:00Z",
    "endDate": "2026-01-02T00:00:00Z",
    "startingBalance": 1000000,
    "days": [
      {
        "date": "2025-12-03T00:00:00Z",
        "dayOffset": 0,
        "optimisticBalance": 1000000,
        "pessimisticBalance": 1000000,
        "incomeEvents": [],
        "expenseEvents": [],
        "isOptimisticDanger": false,
        "isPessimisticDanger": false
      }
    ],
    "optimistic": {
      "totalIncome": 500000,
      "totalExpenses": 300000,
      "endBalance": 1200000,
      "dangerDays": [],
      "dangerDayCount": 0
    },
    "pessimistic": {
      "totalIncome": 400000,
      "totalExpenses": 300000,
      "endBalance": 1100000,
      "dangerDays": [],
      "dangerDayCount": 0
    }
  },
  "summaryMetrics": {
    "startingBalance": 1000000,
    "endBalanceOptimistic": 1200000,
    "dangerDayCount": 0
  }
}
```

---

## Migration SQL

```sql
-- Migration: projection_snapshots
-- Feature: 025-projection-snapshots
-- Date: 2025-12-03
-- Description: Create projection_snapshots table for historical snapshot storage

-- ============================================================================
-- PROJECTION_SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS projection_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  schema_version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient list queries (household + date ordering)
CREATE INDEX IF NOT EXISTS projection_snapshots_household_created_idx 
ON projection_snapshots(household_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE projection_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

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

---

## State Transitions

Snapshots have no state transitions - they are immutable after creation.

| Action | From State | To State | Notes |
|--------|------------|----------|-------|
| Create | (none) | Saved | Snapshot created with frozen data |
| Delete | Saved | (none) | Permanent removal |

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `name` | 1-100 characters | "Snapshot name is required" / "Name too long" |
| `data` | Valid JSON | Database constraint |
| `household_id` | Must match authenticated user's household | RLS policy enforced |

