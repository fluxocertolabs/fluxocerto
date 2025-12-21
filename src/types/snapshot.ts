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
  groupId: string
  name: string
  schemaVersion: number
  data: SnapshotData
  createdAt: Date
}

/**
 * Input for creating a new snapshot.
 */
export const SnapshotInputSchema = z.object({
  name: z.string().min(1, 'Nome da projeção é obrigatório').max(100),
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

