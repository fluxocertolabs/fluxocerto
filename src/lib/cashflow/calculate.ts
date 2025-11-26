/**
 * Cashflow Calculation Engine - Core Logic
 *
 * Pure functions for calculating cashflow projections.
 * No side effects, no input mutation.
 */

import { addDays, startOfDay } from 'date-fns'
import type { BankAccount, CreditCard, FixedExpense, Project } from '../../types'
import {
  isMonthlyPaymentDue,
  isBiweeklyPaymentDue,
  isWeeklyPaymentDue,
} from './frequencies'
import type {
  CashflowProjection,
  DailySnapshot,
  DangerDay,
  ExpenseEvent,
  IncomeEvent,
  ScenarioSummary,
} from './types'
import { type CashflowEngineInput, validateAndFilterInput } from './validators'

// =============================================================================
// STARTING BALANCE CALCULATION
// =============================================================================

/**
 * Calculate starting balance from checking accounts only.
 * Returns 0 when no accounts exist (edge case from spec.md).
 */
export function calculateStartingBalance(accounts: BankAccount[]): number {
  return accounts
    .filter((account) => account.type === 'checking')
    .reduce((sum, account) => sum + account.balance, 0)
}

// =============================================================================
// EVENT CREATION
// =============================================================================

/**
 * Create income events for a specific day based on project payment schedules.
 */
function createIncomeEvents(
  date: Date,
  dayOffset: number,
  projects: Project[],
  firstOccurrences: Map<string, number>
): IncomeEvent[] {
  const events: IncomeEvent[] = []

  for (const project of projects) {
    let isDue = false

    switch (project.frequency) {
      case 'monthly':
        isDue = isMonthlyPaymentDue(date, project.paymentDay)
        break
      case 'biweekly':
        isDue = isBiweeklyPaymentDue(date, dayOffset, project.paymentDay, project.id, firstOccurrences)
        break
      case 'weekly':
        isDue = isWeeklyPaymentDue(date, dayOffset, project.paymentDay, project.id, firstOccurrences)
        break
    }

    if (isDue) {
      events.push({
        projectId: project.id,
        projectName: project.name,
        amount: project.amount,
        certainty: project.certainty,
      })
    }
  }

  return events
}

/**
 * Create expense events for a specific day from fixed expenses.
 */
function createFixedExpenseEvents(date: Date, expenses: FixedExpense[]): ExpenseEvent[] {
  const events: ExpenseEvent[] = []

  for (const expense of expenses) {
    if (isMonthlyPaymentDue(date, expense.dueDay)) {
      events.push({
        sourceId: expense.id,
        sourceName: expense.name,
        sourceType: 'expense',
        amount: expense.amount,
      })
    }
  }

  return events
}

/**
 * Create expense events for a specific day from credit cards.
 */
function createCreditCardEvents(date: Date, creditCards: CreditCard[]): ExpenseEvent[] {
  const events: ExpenseEvent[] = []

  for (const card of creditCards) {
    if (isMonthlyPaymentDue(date, card.dueDay)) {
      events.push({
        sourceId: card.id,
        sourceName: card.name,
        sourceType: 'credit_card',
        amount: card.statementBalance,
      })
    }
  }

  return events
}

// =============================================================================
// DAILY SNAPSHOT GENERATION
// =============================================================================

/**
 * Calculate income for optimistic scenario (all active income).
 */
function calculateOptimisticIncome(incomeEvents: IncomeEvent[]): number {
  return incomeEvents.reduce((sum, event) => sum + event.amount, 0)
}

/**
 * Calculate income for pessimistic scenario (guaranteed income only).
 */
function calculatePessimisticIncome(incomeEvents: IncomeEvent[]): number {
  return incomeEvents
    .filter((event) => event.certainty === 'guaranteed')
    .reduce((sum, event) => sum + event.amount, 0)
}

/**
 * Calculate total expenses from expense events.
 */
function calculateTotalExpenses(expenseEvents: ExpenseEvent[]): number {
  return expenseEvents.reduce((sum, event) => sum + event.amount, 0)
}

// =============================================================================
// SCENARIO SUMMARY GENERATION
// =============================================================================

/**
 * Generate scenario summary from daily snapshots.
 */
function generateScenarioSummary(
  days: DailySnapshot[],
  isOptimistic: boolean
): ScenarioSummary {
  let totalIncome = 0
  let totalExpenses = 0
  const dangerDays: DangerDay[] = []

  for (const day of days) {
    // Calculate income based on scenario
    if (isOptimistic) {
      totalIncome += calculateOptimisticIncome(day.incomeEvents)
    } else {
      totalIncome += calculatePessimisticIncome(day.incomeEvents)
    }

    // Expenses are same for both scenarios
    totalExpenses += calculateTotalExpenses(day.expenseEvents)

    // Track danger days
    const isDanger = isOptimistic ? day.isOptimisticDanger : day.isPessimisticDanger
    const balance = isOptimistic ? day.optimisticBalance : day.pessimisticBalance

    if (isDanger) {
      dangerDays.push({
        date: day.date,
        dayOffset: day.dayOffset,
        balance,
      })
    }
  }

  const endBalance = days.length > 0
    ? (isOptimistic ? days[days.length - 1].optimisticBalance : days[days.length - 1].pessimisticBalance)
    : 0

  return {
    totalIncome,
    totalExpenses,
    endBalance,
    dangerDays,
    dangerDayCount: dangerDays.length,
  }
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate cashflow projection over the specified period.
 *
 * @param input - All financial entities and configuration options
 * @returns Complete projection with daily snapshots and summaries
 * @throws {CashflowCalculationError} If input validation fails
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
 * ```
 */
export function calculateCashflow(input: CashflowEngineInput): CashflowProjection {
  // Validate and filter input
  const validated = validateAndFilterInput(input)

  // Calculate starting balance
  const startingBalance = calculateStartingBalance(validated.accounts)

  // Determine projection period
  const startDate = startOfDay(validated.options.startDate ?? new Date())
  const projectionDays = validated.options.projectionDays ?? 30
  const endDate = addDays(startDate, projectionDays - 1)

  // Track first occurrences for biweekly/weekly calculations
  const optimisticFirstOccurrences = new Map<string, number>()
  const pessimisticFirstOccurrences = new Map<string, number>()

  // Initialize running balances
  let optimisticBalance = startingBalance
  let pessimisticBalance = startingBalance

  // Generate daily snapshots
  const days: DailySnapshot[] = []

  for (let dayOffset = 0; dayOffset < projectionDays; dayOffset++) {
    const date = addDays(startDate, dayOffset)

    // Create income events for optimistic scenario (all active projects)
    const allIncomeEvents = createIncomeEvents(
      date,
      dayOffset,
      validated.activeProjects,
      optimisticFirstOccurrences
    )

    // Create income events for pessimistic scenario (guaranteed only)
    // We track separately for correct biweekly/weekly calculations
    // Note: guaranteedIncomeEvents not used directly - pessimistic income is filtered from allIncomeEvents
    createIncomeEvents(
      date,
      dayOffset,
      validated.guaranteedProjects,
      pessimisticFirstOccurrences
    )

    // Create expense events (same for both scenarios)
    const fixedExpenseEvents = createFixedExpenseEvents(date, validated.activeExpenses)
    const creditCardEvents = createCreditCardEvents(date, validated.creditCards)
    const expenseEvents = [...fixedExpenseEvents, ...creditCardEvents]

    // Calculate daily totals
    const optimisticIncome = calculateOptimisticIncome(allIncomeEvents)
    const pessimisticIncome = calculatePessimisticIncome(allIncomeEvents)
    const totalExpenses = calculateTotalExpenses(expenseEvents)

    // Update running balances
    optimisticBalance = optimisticBalance + optimisticIncome - totalExpenses
    pessimisticBalance = pessimisticBalance + pessimisticIncome - totalExpenses

    // Create snapshot
    const snapshot: DailySnapshot = {
      date,
      dayOffset,
      optimisticBalance,
      pessimisticBalance,
      incomeEvents: allIncomeEvents,
      expenseEvents,
      isOptimisticDanger: optimisticBalance < 0,
      isPessimisticDanger: pessimisticBalance < 0,
    }

    days.push(snapshot)
  }

  // Generate scenario summaries
  const optimistic = generateScenarioSummary(days, true)
  const pessimistic = generateScenarioSummary(days, false)

  return {
    startDate,
    endDate,
    startingBalance,
    days,
    optimistic,
    pessimistic,
  }
}

