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
import { calculateCashflow, calculateStartingBalance } from './calculate'
import type { CashflowProjection, DailySnapshot, DangerDay, ScenarioSummary } from './types'
import { getTodayDateOnlyInTimeZone, toDateOnlyInTimeZone } from '../dates/timezone'

export type BalanceUpdateBase =
  | { kind: 'single'; date: Date }
  | { kind: 'range'; from: Date; to: Date }

export interface EstimatedTodayBalance {
  today: Date
  hasBase: boolean
  base?: BalanceUpdateBase
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
): { base: BalanceUpdateBase; baseForComputation: Date } | null {
  const checkingAccounts = accounts.filter((a) => a.type === 'checking')
  if (checkingAccounts.length === 0) return null

  const dateOnlyBases: Date[] = []

  for (const account of checkingAccounts) {
    if (!account.balanceUpdatedAt) {
      // No reliable base (FR-009)
      return null
    }
    dateOnlyBases.push(toDateOnlyInTimeZone(account.balanceUpdatedAt, timeZone))
  }

  dateOnlyBases.sort((a, b) => a.getTime() - b.getTime())
  const earliest = dateOnlyBases[0]
  const latest = dateOnlyBases[dateOnlyBases.length - 1]

  if (earliest.getTime() === latest.getTime()) {
    return {
      base: { kind: 'single', date: earliest },
      baseForComputation: earliest,
    }
  }

  return {
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
  if (!baseResult) {
    return {
      today,
      hasBase: false,
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

  const optimistic = summarizeScenario(days, true)
  const pessimistic = summarizeScenario(days, false)

  return {
    startDate,
    endDate,
    startingBalance,
    days,
    optimistic,
    pessimistic,
  }
}

function summarizeScenario(days: DailySnapshot[], isOptimistic: boolean): ScenarioSummary {
  let totalIncome = 0
  let totalExpenses = 0
  const dangerDays: DangerDay[] = []

  for (const day of days) {
    if (isOptimistic) {
      totalIncome += day.incomeEvents.reduce((sum, ev) => sum + ev.amount, 0)
    } else {
      totalIncome += day.incomeEvents
        .filter((ev) => ev.certainty === 'guaranteed')
        .reduce((sum, ev) => sum + ev.amount, 0)
    }

    totalExpenses += day.expenseEvents.reduce((sum, ev) => sum + ev.amount, 0)

    const balance = isOptimistic ? day.optimisticBalance : day.pessimisticBalance
    const isDanger = isOptimistic ? day.isOptimisticDanger : day.isPessimisticDanger

    if (isDanger) {
      dangerDays.push({
        date: day.date,
        dayOffset: day.dayOffset,
        balance,
      })
    }
  }

  const endBalance =
    days.length > 0
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


