/**
 * Cashflow Engine Types
 *
 * Engine-specific types for cashflow calculation output.
 * Input types are imported from src/types/index.ts
 */

// =============================================================================
// OUTPUT TYPES
// =============================================================================

/**
 * Represents a single income event on a specific day
 */
export interface IncomeEvent {
  /** Reference to source Project.id */
  projectId: string
  /** Display name from Project.name */
  projectName: string
  /** Amount in cents */
  amount: number
  /** Certainty level from Project */
  certainty: 'guaranteed' | 'probable' | 'uncertain'
}

/**
 * Represents a single expense event on a specific day
 */
export interface ExpenseEvent {
  /** Reference to source FixedExpense.id or CreditCard.id */
  sourceId: string
  /** Display name */
  sourceName: string
  /** Type of expense source */
  sourceType: 'expense' | 'credit_card'
  /** Amount in cents */
  amount: number
}

/**
 * Represents a day with negative projected balance
 */
export interface DangerDay {
  /** Calendar date */
  date: Date
  /** 0-indexed offset from projection start */
  dayOffset: number
  /** Negative balance amount in cents */
  balance: number
}

/**
 * Snapshot of financial state for a single day
 */
export interface DailySnapshot {
  /** Calendar date */
  date: Date
  /** 0-indexed offset from projection start */
  dayOffset: number
  /** Running balance for optimistic scenario (cents) */
  optimisticBalance: number
  /** Running balance for pessimistic scenario (cents) */
  pessimisticBalance: number
  /** Income events occurring on this day */
  incomeEvents: IncomeEvent[]
  /** Expense events occurring on this day */
  expenseEvents: ExpenseEvent[]
  /** True if optimisticBalance < 0 */
  isOptimisticDanger: boolean
  /** True if pessimisticBalance < 0 */
  isPessimisticDanger: boolean
}

/**
 * Summary statistics for a single scenario (optimistic or pessimistic)
 */
export interface ScenarioSummary {
  /** Sum of all income events in cents */
  totalIncome: number
  /** Sum of all expense events in cents */
  totalExpenses: number
  /** Final day's balance in cents */
  endBalance: number
  /** Array of days with negative balance */
  dangerDays: DangerDay[]
  /** Count of danger days */
  dangerDayCount: number
}

/**
 * Complete cashflow projection result
 */
export interface CashflowProjection {
  /** First day of projection */
  startDate: Date
  /** Last day of projection */
  endDate: Date
  /** Initial balance (sum of checking accounts) in cents */
  startingBalance: number
  /** Daily snapshots for entire projection period */
  days: DailySnapshot[]
  /** Summary for optimistic scenario (all active income) */
  optimistic: ScenarioSummary
  /** Summary for pessimistic scenario (guaranteed income only) */
  pessimistic: ScenarioSummary
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error codes for cashflow calculation
 */
export enum CashflowErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
}

/**
 * Custom error for cashflow calculation failures
 */
export class CashflowCalculationError extends Error {
  constructor(
    message: string,
    public readonly code: CashflowErrorCode,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'CashflowCalculationError'
  }
}

