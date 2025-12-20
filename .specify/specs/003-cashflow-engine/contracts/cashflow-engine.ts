/**
 * Cashflow Engine TypeScript Contracts
 *
 * These interfaces define the API contract for the cashflow calculation engine.
 * Implementation will be in /src/lib/cashflow/
 */

import { z } from 'zod'

// =============================================================================
// INPUT TYPES (References to existing domain types)
// =============================================================================

/**
 * Re-export existing types from src/types/index.ts for engine input
 * Engine expects these types as input - they already exist in codebase
 */
export type {
  BankAccount,
  Project,
  FixedExpense,
  CreditCard,
} from '../../../src/types'

// =============================================================================
// ENGINE CONFIGURATION
// =============================================================================

/**
 * Configuration options for cashflow projection
 */
export interface CashflowEngineOptions {
  /** Start date for projection (default: today) */
  startDate?: Date
  /** Number of days to project (default: 30, min: 1) */
  projectionDays?: number
}

/**
 * Complete input for cashflow calculation
 */
export interface CashflowEngineInput {
  accounts: import('../../../src/types').BankAccount[]
  projects: import('../../../src/types').Project[]
  expenses: import('../../../src/types').FixedExpense[]
  creditCards: import('../../../src/types').CreditCard[]
  options?: CashflowEngineOptions
}

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
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for engine options validation
 */
export const CashflowEngineOptionsSchema = z.object({
  startDate: z.date().optional(),
  projectionDays: z.number().int().positive().optional().default(30),
})

/**
 * Zod schema for validating engine input
 * Note: Individual entity schemas already exist in src/types/index.ts
 */
export const CashflowEngineInputSchema = z.object({
  accounts: z.array(z.any()), // Uses existing BankAccountSchema
  projects: z.array(z.any()), // Uses existing ProjectSchema
  expenses: z.array(z.any()), // Uses existing FixedExpenseSchema
  creditCards: z.array(z.any()), // Uses existing CreditCardSchema
  options: CashflowEngineOptionsSchema.optional(),
})

// =============================================================================
// FUNCTION SIGNATURES
// =============================================================================

/**
 * Main entry point for cashflow calculation
 *
 * @param input - All financial entities and configuration options
 * @returns Complete projection with daily snapshots and summaries
 * @throws {ZodError} If input validation fails
 *
 * @example
 * ```typescript
 * const projection = calculateCashflow({
 *   accounts: [{ id: '1', name: 'Checking', type: 'checking', balance: 500000, ... }],
 *   projects: [{ id: '1', name: 'Salary', amount: 300000, paymentDay: 15, ... }],
 *   expenses: [{ id: '1', name: 'Rent', amount: 150000, dueDay: 1, ... }],
 *   creditCards: [{ id: '1', name: 'Visa', statementBalance: 50000, dueDay: 20, ... }],
 *   options: { projectionDays: 30 }
 * })
 *
 * console.log(projection.days[0].optimisticBalance) // Day 0 balance
 * console.log(projection.pessimistic.dangerDayCount) // Number of danger days
 * ```
 */
export type CalculateCashflow = (input: CashflowEngineInput) => CashflowProjection

// =============================================================================
// ERROR TYPES
// =============================================================================

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

/**
 * Error codes for cashflow calculation
 */
export enum CashflowErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_DAY = 'INVALID_DAY',
  INVALID_FREQUENCY = 'INVALID_FREQUENCY',
  INVALID_CERTAINTY = 'INVALID_CERTAINTY',
  INVALID_PROJECTION_DAYS = 'INVALID_PROJECTION_DAYS',
}

