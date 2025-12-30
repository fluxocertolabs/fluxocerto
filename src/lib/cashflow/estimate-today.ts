/**
 * Today's estimated balance helpers.
 *
 * Pure module (no side effects): derives a "since last balance update" base,
 * computes today's estimated balance for both scenarios, and rebases the
 * projection to avoid double counting.
 */

import type {
  BankAccount,
  CreditCard,
  FixedExpense,
  Project,
  SingleShotExpense,
  SingleShotIncome,
  FutureStatement,
} from '../../types'
import { addDays, differenceInCalendarDays, isAfter } from 'date-fns'
import { calculateCashflow, calculateStartingBalance, generateScenarioSummary } from './calculate'
import type { CashflowProjection, DailySnapshot } from './types'
import { getTodayDateOnlyInTimeZone, toDateOnlyInTimeZone } from '../dates/timezone'

export type BalanceUpdateBase =
  | { kind: 'single'; date: Date }
  | { kind: 'range'; from: Date; to: Date }

export type BalanceUpdateBaseFailureReason = 'no_checking_accounts' | 'missing_timestamps'

export type CheckingBalanceUpdateBaseResult =
  | { success: true; base: BalanceUpdateBase; baseForComputation: Date }
  | { success: false; reason: BalanceUpdateBaseFailureReason }

export interface EstimatedTodayBalance {
  today: Date
  hasBase: boolean
  base?: BalanceUpdateBase
  baseFailureReason?: BalanceUpdateBaseFailureReason
  optimisticCents: number
  pessimisticCents: number
  isEstimated: {
    optimistic: boolean
    pessimistic: boolean
    any: boolean
  }
}

export function getCheckingBalanceUpdateBase(
  accounts: BankAccount[],
  timeZone: string
): CheckingBalanceUpdateBaseResult {
  const checkingAccounts = accounts.filter((a) => a.type === 'checking')
  if (checkingAccounts.length === 0) {
    return { success: false, reason: 'no_checking_accounts' }
  }

  const dateOnlyBases: Date[] = []

  for (const account of checkingAccounts) {
    if (!account.balanceUpdatedAt) {
      // No reliable base (FR-009)
      return { success: false, reason: 'missing_timestamps' }
    }
    dateOnlyBases.push(toDateOnlyInTimeZone(account.balanceUpdatedAt, timeZone))
  }

  dateOnlyBases.sort((a, b) => a.getTime() - b.getTime())
  const earliest = dateOnlyBases[0]
  const latest = dateOnlyBases[dateOnlyBases.length - 1]

  if (earliest.getTime() === latest.getTime()) {
    return {
      success: true,
      base: { kind: 'single', date: earliest },
      baseForComputation: earliest,
    }
  }

  return {
    success: true,
    base: { kind: 'range', from: earliest, to: latest },
    baseForComputation: earliest,
  }
}

export interface EstimateTodayInput {
  accounts: BankAccount[]
  projects: Project[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  singleShotIncome: SingleShotIncome[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
  timeZone: string
}

export function calculateEstimatedTodayBalance(input: EstimateTodayInput): EstimatedTodayBalance {
  const today = getTodayDateOnlyInTimeZone(input.timeZone)
  const startingBalance = calculateStartingBalance(input.accounts)

  const baseResult = getCheckingBalanceUpdateBase(input.accounts, input.timeZone)
  if (!baseResult.success) {
    return {
      today,
      hasBase: false,
      baseFailureReason: baseResult.reason,
      optimisticCents: startingBalance,
      pessimisticCents: startingBalance,
      isEstimated: { optimistic: false, pessimistic: false, any: false },
    }
  }

  const { base, baseForComputation } = baseResult
  const intervalStart = addDays(baseForComputation, 1)

  // Empty interval (base is today or in the future) => no movements included
  if (isAfter(intervalStart, today)) {
    return {
      today,
      hasBase: true,
      base,
      optimisticCents: startingBalance,
      pessimisticCents: startingBalance,
      isEstimated: { optimistic: false, pessimistic: false, any: false },
    }
  }

  const projectionDays = differenceInCalendarDays(today, intervalStart) + 1

  const intervalProjection = calculateCashflow({
    accounts: input.accounts,
    projects: input.projects,
    expenses: input.fixedExpenses,
    singleShotExpenses: input.singleShotExpenses,
    singleShotIncome: input.singleShotIncome,
    creditCards: input.creditCards,
    futureStatements: input.futureStatements,
    options: { startDate: intervalStart, projectionDays },
  })

  const lastDay = intervalProjection.days[intervalProjection.days.length - 1]
  const optimisticCents = lastDay.optimisticBalance
  const pessimisticCents = lastDay.pessimisticBalance

  const hasAnyExpense = intervalProjection.days.some((d) => d.expenseEvents.length > 0)
  const hasAnyIncome = intervalProjection.days.some((d) => d.incomeEvents.length > 0)
  const hasAnyGuaranteedIncome = intervalProjection.days.some((d) =>
    d.incomeEvents.some((ev) => ev.certainty === 'guaranteed')
  )

  const optimisticEstimated = hasAnyExpense || hasAnyIncome
  const pessimisticEstimated = hasAnyExpense || hasAnyGuaranteedIncome

  return {
    today,
    hasBase: true,
    base,
    optimisticCents,
    pessimisticCents,
    isEstimated: {
      optimistic: optimisticEstimated,
      pessimistic: pessimisticEstimated,
      any: optimisticEstimated || pessimisticEstimated,
    },
  }
}

export interface RebaseProjectionInput {
  projectionDays: number
  estimatedToday: EstimatedTodayBalance
  accounts: BankAccount[]
  projects: Project[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  singleShotIncome: SingleShotIncome[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
}

export function rebaseProjectionFromEstimatedToday(
  input: RebaseProjectionInput
): CashflowProjection {
  const projectionDays = input.projectionDays
  const today = input.estimatedToday.today

  const originalStartingBalance = calculateStartingBalance(input.accounts)
  const baseOffset = input.estimatedToday.pessimisticCents - originalStartingBalance
  const optimisticOffset =
    input.estimatedToday.optimisticCents - input.estimatedToday.pessimisticCents

  const syntheticToday: DailySnapshot = {
    date: today,
    dayOffset: 0,
    optimisticBalance: input.estimatedToday.optimisticCents,
    pessimisticBalance: input.estimatedToday.pessimisticCents,
    incomeEvents: [],
    expenseEvents: [],
    isOptimisticDanger: input.estimatedToday.optimisticCents < 0,
    isPessimisticDanger: input.estimatedToday.pessimisticCents < 0,
  }

  const forwardDays = Math.max(0, projectionDays - 1)
  const tomorrow = addDays(today, 1)

  const days: DailySnapshot[] = [syntheticToday]

  if (forwardDays > 0) {
    const forwardProjection = calculateCashflow({
      accounts: input.accounts,
      projects: input.projects,
      expenses: input.fixedExpenses,
      singleShotExpenses: input.singleShotExpenses,
      singleShotIncome: input.singleShotIncome,
      creditCards: input.creditCards,
      futureStatements: input.futureStatements,
      options: { startDate: tomorrow, projectionDays: forwardDays },
    })

    for (const forwardDay of forwardProjection.days) {
      const pessimisticBalance = forwardDay.pessimisticBalance + baseOffset
      const optimisticBalance = forwardDay.optimisticBalance + baseOffset + optimisticOffset

      days.push({
        ...forwardDay,
        dayOffset: days.length,
        pessimisticBalance,
        optimisticBalance,
        isPessimisticDanger: pessimisticBalance < 0,
        isOptimisticDanger: optimisticBalance < 0,
      })
    }
  }

  const startDate = today
  const endDate = days[days.length - 1].date
  const startingBalance = input.estimatedToday.pessimisticCents

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
