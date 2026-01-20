/**
 * Cashflow Engine Input Validators
 *
 * Zod schemas for validating engine input data.
 * Uses existing schemas from src/types/index.ts where possible.
 */

import { z } from 'zod'
import type {
  BankAccount,
  CreditCard,
  FixedExpense,
  SingleShotExpense,
  SingleShotIncome,
  Project,
  FutureStatement,
} from '../../types'
import { CashflowCalculationError, CashflowErrorCode } from './types'

// =============================================================================
// ENGINE OPTIONS SCHEMA
// =============================================================================

export const CashflowEngineOptionsSchema = z.object({
  startDate: z.date().optional(),
  projectionDays: z.number().int().positive('Projection days must be positive').optional().default(30),
})

type ValidatedOptions = z.infer<typeof CashflowEngineOptionsSchema>

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating BankAccount input to the engine
 */
const BankAccountEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Schema for validating Project input to the engine
 */
const ProjectEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive('Amount must be positive'),
  paymentSchedule: z.union([
    z.object({
      type: z.literal('dayOfWeek'),
      dayOfWeek: z.number().int().min(1).max(7),
    }),
    z.object({
      type: z.literal('dayOfMonth'),
      dayOfMonth: z.number().int().min(1).max(31),
    }),
    z.object({
      type: z.literal('twiceMonthly'),
      firstDay: z.number().int().min(1).max(31),
      secondDay: z.number().int().min(1).max(31),
      firstAmount: z.number().positive().optional(),
      secondAmount: z.number().positive().optional(),
    }),
  ]).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'twice-monthly', 'monthly']),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Schema for validating FixedExpense input to the engine
 */
const FixedExpenseEngineSchema = z.object({
  id: z.string(),
  type: z.literal('fixed'),
  name: z.string(),
  amount: z.number().positive('Amount must be positive'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Schema for validating CreditCard input to the engine
 */
const CreditCardEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  statementBalance: z.number().min(0, 'Balance cannot be negative'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// =============================================================================
// INPUT WRAPPER TYPE
// =============================================================================

export interface CashflowEngineInput {
  accounts: BankAccount[]
  projects: Project[]
  expenses: FixedExpense[]
  singleShotExpenses?: SingleShotExpense[]
  singleShotIncome?: SingleShotIncome[]
  creditCards: CreditCard[]
  /** Future statements for credit cards - used to determine future month amounts */
  futureStatements?: FutureStatement[]
  /** Shorthand for options.projectionDays (takes precedence) */
  projectionDays?: number
  options?: z.infer<typeof CashflowEngineOptionsSchema>
}

// =============================================================================
// VALIDATED INPUT TYPE
// =============================================================================

export interface ValidatedInput {
  accounts: BankAccount[]
  activeProjects: Project[]
  guaranteedProjects: Project[]
  activeExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  singleShotIncome: SingleShotIncome[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
  options: ValidatedOptions
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates and filters input entities for cashflow calculation.
 * Filters to only active entities and separates guaranteed vs uncertain projects.
 *
 * @throws {CashflowCalculationError} If validation fails
 */
export function validateAndFilterInput(input: CashflowEngineInput): ValidatedInput {
  // Merge top-level projectionDays into options (top-level takes precedence)
  const mergedOptions = {
    ...input.options,
    ...(input.projectionDays !== undefined ? { projectionDays: input.projectionDays } : {}),
  }

  // Validate options
  const optionsResult = CashflowEngineOptionsSchema.safeParse(mergedOptions)
  if (!optionsResult.success) {
    throw new CashflowCalculationError(
      `Invalid options: ${optionsResult.error.message}`,
      CashflowErrorCode.INVALID_INPUT,
      optionsResult.error.flatten()
    )
  }

  // Validate accounts
  for (const account of input.accounts) {
    const result = BankAccountEngineSchema.safeParse(account)
    if (!result.success) {
      throw new CashflowCalculationError(
        `Invalid bank account "${account.name}": ${result.error.message}`,
        CashflowErrorCode.INVALID_AMOUNT,
        result.error.flatten()
      )
    }
  }

  // Validate and filter projects
  const activeProjects: Project[] = []
  const guaranteedProjects: Project[] = []

  for (const project of input.projects) {
    const result = ProjectEngineSchema.safeParse(project)
    if (!result.success) {
      throw new CashflowCalculationError(
        `Invalid project "${project.name}": ${result.error.message}`,
        CashflowErrorCode.INVALID_INPUT,
        result.error.flatten()
      )
    }

    if (project.isActive) {
      activeProjects.push(project)
      if (project.certainty === 'guaranteed') {
        guaranteedProjects.push(project)
      }
    }
  }

  // Validate and filter expenses
  const activeExpenses: FixedExpense[] = []

  for (const expense of input.expenses) {
    const result = FixedExpenseEngineSchema.safeParse(expense)
    if (!result.success) {
      throw new CashflowCalculationError(
        `Invalid expense "${expense.name}": ${result.error.message}`,
        CashflowErrorCode.INVALID_INPUT,
        result.error.flatten()
      )
    }

    if (expense.isActive) {
      activeExpenses.push(expense)
    }
  }

  // Validate credit cards (all are included - no isActive filter)
  for (const card of input.creditCards) {
    const result = CreditCardEngineSchema.safeParse(card)
    if (!result.success) {
      throw new CashflowCalculationError(
        `Invalid credit card "${card.name}": ${result.error.message}`,
        CashflowErrorCode.INVALID_INPUT,
        result.error.flatten()
      )
    }
  }

  return {
    accounts: input.accounts,
    activeProjects,
    guaranteedProjects,
    activeExpenses,
    singleShotExpenses: input.singleShotExpenses ?? [],
    singleShotIncome: input.singleShotIncome ?? [],
    creditCards: input.creditCards,
    futureStatements: input.futureStatements ?? [],
    options: optionsResult.data,
  }
}

