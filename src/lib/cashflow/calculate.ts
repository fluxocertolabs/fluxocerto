/**
 * Cashflow Calculation Engine - Core Logic
 *
 * Pure functions for calculating cashflow projections.
 * No side effects, no input mutation.
 */

import { addDays, startOfDay } from 'date-fns'
import type { BankAccount, CreditCard, FixedExpense, SingleShotExpense, SingleShotIncome, Project, FutureStatement } from '../../types'
import { isSameDay } from 'date-fns'
import {
  isMonthlyPaymentDue,
  isBiweeklyPaymentDue,
  isWeeklyPaymentDue,
  isDayOfWeekPaymentDue,
  isTwiceMonthlyPaymentDue,
  getEffectiveDay,
} from './frequencies'
import { getDate } from 'date-fns'
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
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the amount for a twice-monthly payment on a specific day.
 * Uses variable amounts if configured, otherwise falls back to project's base amount.
 *
 * @param project - The project with payment configuration
 * @param schedule - The twice-monthly schedule with optional variable amounts
 * @param date - The date to check (used to determine which payment day)
 * @returns The amount for this payment day
 */
function getAmountForTwiceMonthlyPayment(
  project: Project,
  schedule: { firstDay: number; secondDay: number; firstAmount?: number; secondAmount?: number },
  date: Date
): number {
  const currentDay = getDate(date)
  const effectiveFirstDay = getEffectiveDay(schedule.firstDay, date)
  const effectiveSecondDay = getEffectiveDay(schedule.secondDay, date)

  // Check if variable amounts are configured (both must be present)
  if (schedule.firstAmount !== undefined && schedule.secondAmount !== undefined) {
    if (currentDay === effectiveFirstDay) {
      return schedule.firstAmount
    }
    if (currentDay === effectiveSecondDay) {
      return schedule.secondAmount
    }
  }

  // Fallback to project's base amount
  return project.amount
}

// =============================================================================
// EVENT CREATION
// =============================================================================

/**
 * Create income events for a specific day based on project payment schedules.
 * Supports both new PaymentSchedule system and legacy paymentDay field for backward compatibility.
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
    let resolvedAmount = project.amount // Default to project's base amount
    const schedule = project.paymentSchedule

    // Use new PaymentSchedule system if available
    if (schedule) {
      switch (project.frequency) {
        case 'monthly':
          if (schedule.type === 'dayOfMonth') {
            isDue = isMonthlyPaymentDue(date, schedule.dayOfMonth)
          }
          break
        case 'twice-monthly':
          if (schedule.type === 'twiceMonthly') {
            isDue = isTwiceMonthlyPaymentDue(date, schedule.firstDay, schedule.secondDay)
            if (isDue) {
              // Use variable amounts if configured
              resolvedAmount = getAmountForTwiceMonthlyPayment(project, schedule, date)
            }
          }
          break
        case 'biweekly':
          if (schedule.type === 'dayOfWeek') {
            // For biweekly with day-of-week: check if it's the right day AND 14-day interval
            if (isDayOfWeekPaymentDue(date, schedule.dayOfWeek)) {
              // Track first occurrence for biweekly interval
              if (!firstOccurrences.has(project.id)) {
                firstOccurrences.set(project.id, dayOffset)
                isDue = true
              } else {
                const firstOccurrence = firstOccurrences.get(project.id)!
                const daysSinceFirst = dayOffset - firstOccurrence
                isDue = daysSinceFirst > 0 && daysSinceFirst % 14 === 0
              }
            }
          }
          break
        case 'weekly':
          if (schedule.type === 'dayOfWeek') {
            isDue = isDayOfWeekPaymentDue(date, schedule.dayOfWeek)
          }
          break
      }
    } else if (project.paymentDay !== undefined) {
      // Backward compatibility: fall back to legacy paymentDay field
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
    }

    if (isDue) {
      events.push({
        projectId: project.id,
        projectName: project.name,
        amount: resolvedAmount,
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
 * Create expense events for a specific day from single-shot expenses.
 * Single-shot expenses occur on their exact date.
 */
function createSingleShotExpenseEvents(date: Date, expenses: SingleShotExpense[]): ExpenseEvent[] {
  const events: ExpenseEvent[] = []

  for (const expense of expenses) {
    if (isSameDay(expense.date, date)) {
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
 * Get the credit card amount for a specific date.
 * 
 * Logic:
 * - Current month or next month: use statementBalance (the bill coming due)
 * - Future months (2+ months ahead): use futureStatement if defined, else 0 (FR-006)
 * - Past months: use statementBalance
 * 
 * @param card - The credit card
 * @param futureStatements - Array of future statements for all cards
 * @param date - The date to get the amount for
 * @returns The amount in cents (0 if not defined for future months per FR-006)
 */
export function getCreditCardAmountForDate(
  card: CreditCard,
  futureStatements: FutureStatement[],
  date: Date
): number {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const targetMonth = date.getMonth() + 1
  const targetYear = date.getFullYear()

  // Calculate next month (handling year rollover)
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear

  // Check if target date is in the distant future (more than 1 month ahead)
  const isDistantFuture =
    targetYear > nextMonthYear ||
    (targetYear === nextMonthYear && targetMonth > nextMonth)

  // Current month, past month, or next month: use statementBalance
  // (The statementBalance represents what needs to be paid on the next due date)
  if (!isDistantFuture) {
    return card.statementBalance
  }

  // Distant future month: lookup future statement
  const statement = futureStatements.find(
    (s) =>
      s.creditCardId === card.id &&
      s.targetMonth === targetMonth &&
      s.targetYear === targetYear
  )

  // Return amount or 0 if not defined (FR-006)
  return statement?.amount ?? 0
}

/**
 * Create expense events for a specific day from credit cards.
 * Uses future statements for future months, current balance for current month.
 */
function createCreditCardEvents(
  date: Date,
  creditCards: CreditCard[],
  futureStatements: FutureStatement[]
): ExpenseEvent[] {
  const events: ExpenseEvent[] = []

  for (const card of creditCards) {
    if (isMonthlyPaymentDue(date, card.dueDay)) {
      const amount = getCreditCardAmountForDate(card, futureStatements, date)
      events.push({
        sourceId: card.id,
        sourceName: card.name,
        sourceType: 'credit_card',
        amount,
      })
    }
  }

  return events
}

/**
 * Create income events for a specific day from single-shot income.
 * Single-shot income occurs on their exact date.
 */
function createSingleShotIncomeEvents(date: Date, income: SingleShotIncome[]): IncomeEvent[] {
  const events: IncomeEvent[] = []

  for (const item of income) {
    if (isSameDay(item.date, date)) {
      events.push({
        projectId: item.id,
        projectName: item.name,
        amount: item.amount,
        certainty: item.certainty,
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
export function generateScenarioSummary(
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
    const recurringIncomeEvents = createIncomeEvents(
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

    // Create single-shot income events
    const singleShotIncomeEvents = createSingleShotIncomeEvents(date, validated.singleShotIncome)

    // Combine all income events
    const allIncomeEvents = [...recurringIncomeEvents, ...singleShotIncomeEvents]

    // Create expense events (same for both scenarios)
    const fixedExpenseEvents = createFixedExpenseEvents(date, validated.activeExpenses)
    const singleShotExpenseEvents = createSingleShotExpenseEvents(date, validated.singleShotExpenses)
    const creditCardEvents = createCreditCardEvents(date, validated.creditCards, validated.futureStatements)
    const expenseEvents = [...fixedExpenseEvents, ...singleShotExpenseEvents, ...creditCardEvents]

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

