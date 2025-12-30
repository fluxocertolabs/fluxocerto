import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseISO } from 'date-fns'
import {
  calculateEstimatedTodayBalance,
  getCheckingBalanceUpdateBase,
  rebaseProjectionFromEstimatedToday,
} from './estimate-today'
import type {
  BankAccount,
  CreditCard,
  FixedExpense,
  FutureStatement,
  Project,
  SingleShotExpense,
  SingleShotIncome,
} from '../../types'

const TIME_ZONE = 'America/Sao_Paulo'

function dateOnly(year: number, month: number, day: number): Date {
  // Use date-fns for consistent parsing across environments.
  // NOTE: parseISO('YYYY-MM-DD') yields a Date at local midnight for that calendar day.
  const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return parseISO(isoString)
}

function createCheckingAccount(
  overrides: Partial<BankAccount> = {}
): BankAccount {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Checking',
    type: 'checking',
    balance: overrides.balance ?? 0,
    ownerId: overrides.ownerId,
    owner: overrides.owner ?? null,
    balanceUpdatedAt: overrides.balanceUpdatedAt,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

function createSingleShotIncome(
  overrides: Partial<SingleShotIncome> & Pick<SingleShotIncome, 'date' | 'certainty' | 'amount'>,
): SingleShotIncome {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: 'single_shot',
    name: overrides.name ?? 'Income',
    amount: overrides.amount,
    date: overrides.date,
    certainty: overrides.certainty,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

function createSingleShotExpense(
  overrides: Partial<SingleShotExpense> & Pick<SingleShotExpense, 'date' | 'amount'>,
): SingleShotExpense {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: 'single_shot',
    name: overrides.name ?? 'Expense',
    amount: overrides.amount,
    date: overrides.date,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getCheckingBalanceUpdateBase', () => {
  it('returns missing_timestamps when user never updated balances (no checking balanceUpdatedAt)', () => {
    const accounts = [createCheckingAccount({ balanceUpdatedAt: undefined })]
    const result = getCheckingBalanceUpdateBase(accounts, TIME_ZONE)
    expect(result.success).toBe(false)
    if (result.success) throw new Error('expected failure')
    expect(result.reason).toBe('missing_timestamps')
  })

  it('returns missing_timestamps when any checking account is missing balanceUpdatedAt', () => {
    const accounts = [
      createCheckingAccount({ balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') }),
      createCheckingAccount({ balanceUpdatedAt: undefined }),
    ]
    const result = getCheckingBalanceUpdateBase(accounts, TIME_ZONE)
    expect(result.success).toBe(false)
    if (result.success) throw new Error('expected failure')
    expect(result.reason).toBe('missing_timestamps')
  })

  it('returns a single base when all checking accounts share the same date-only base', () => {
    const accounts = [
      createCheckingAccount({ balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') }),
      createCheckingAccount({ balanceUpdatedAt: new Date('2025-01-10T23:59:59Z') }),
    ]

    const result = getCheckingBalanceUpdateBase(accounts, TIME_ZONE)
    expect(result.success).toBe(true)
    if (!result.success) throw new Error('expected success')
    expect(result.base.kind).toBe('single')
    if (result.base.kind !== 'single') throw new Error('expected single base')

    expect(result.base.date.getFullYear()).toBe(2025)
    expect(result.base.date.getMonth()).toBe(0)
    expect(result.base.date.getDate()).toBe(10)
    expect(result.baseForComputation.getTime()).toBe(result.base.date.getTime())
  })

  it('returns a range base when checking accounts have different date-only bases and uses earliest for computation', () => {
    const accounts = [
      createCheckingAccount({ balanceUpdatedAt: new Date('2025-01-11T12:00:00Z') }),
      createCheckingAccount({ balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') }),
    ]

    const result = getCheckingBalanceUpdateBase(accounts, TIME_ZONE)
    expect(result.success).toBe(true)
    if (!result.success) throw new Error('expected success')
    expect(result.base.kind).toBe('range')
    if (result.base.kind !== 'range') throw new Error('expected range base')

    expect(result.base.from.getDate()).toBe(10)
    expect(result.base.to.getDate()).toBe(11)
    expect(result.baseForComputation.getDate()).toBe(10)
  })
})

describe('calculateEstimatedTodayBalance', () => {
  const emptyProjects: Project[] = []
  const emptyFixedExpenses: FixedExpense[] = []
  const emptyCreditCards: CreditCard[] = []
  const emptyFutureStatements: FutureStatement[] = []

  it('computes today as date-only in America/Sao_Paulo (even when UTC date differs)', () => {
    // 2025-01-01T01:00:00Z is still 2024-12-31 in America/Sao_Paulo (UTC-3)
    vi.setSystemTime(new Date('2025-01-01T01:00:00Z'))

    const estimate = calculateEstimatedTodayBalance({
      accounts: [createCheckingAccount({ balance: 0, balanceUpdatedAt: new Date('2024-12-30T12:00:00Z') })],
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    expect(estimate.today.getFullYear()).toBe(2024)
    expect(estimate.today.getMonth()).toBe(11) // December
    expect(estimate.today.getDate()).toBe(31)
  })

  it('treats the estimation interval as (baseDate, today] (start exclusive, end inclusive)', () => {
    vi.setSystemTime(new Date('2025-01-12T12:00:00Z')) // today = 2025-01-12 in Sao Paulo

    const baseUpdatedAt = new Date('2025-01-10T12:00:00Z') // base date-only = 2025-01-10
    const accounts = [createCheckingAccount({ balance: 100_000, balanceUpdatedAt: baseUpdatedAt })]

    const estimate = calculateEstimatedTodayBalance({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [
        // Should be EXCLUDED (on base date)
        createSingleShotExpense({ date: dateOnly(2025, 1, 10), amount: 10_000 }),
        // Should be INCLUDED (on today)
        createSingleShotExpense({ date: dateOnly(2025, 1, 12), amount: 20_000 }),
      ],
      singleShotIncome: [],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    expect(estimate.hasBase).toBe(true)
    expect(estimate.pessimisticCents).toBe(80_000)
    expect(estimate.optimisticCents).toBe(80_000)
    expect(estimate.isEstimated.optimistic).toBe(true)
    expect(estimate.isEstimated.pessimistic).toBe(true)
  })

  it('returns hasBase=false when there is no reliable base (never updated OR any checking missing balanceUpdatedAt)', () => {
    vi.setSystemTime(new Date('2025-01-12T12:00:00Z'))

    const neverUpdated = calculateEstimatedTodayBalance({
      accounts: [createCheckingAccount({ balanceUpdatedAt: undefined })],
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })
    expect(neverUpdated.hasBase).toBe(false)

    const partiallyUpdated = calculateEstimatedTodayBalance({
      accounts: [
        createCheckingAccount({ balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') }),
        createCheckingAccount({ balanceUpdatedAt: undefined }),
      ],
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })
    expect(partiallyUpdated.hasBase).toBe(false)
  })

  it('applies scenario rules: optimistic includes probable/uncertain, pessimistic includes guaranteed only', () => {
    vi.setSystemTime(new Date('2025-01-12T12:00:00Z'))

    const accounts = [createCheckingAccount({ balance: 0, balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') })]

    const estimate = calculateEstimatedTodayBalance({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [
        createSingleShotIncome({
          date: dateOnly(2025, 1, 12),
          amount: 50_000,
          certainty: 'probable',
        }),
      ],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    expect(estimate.optimisticCents).toBe(50_000)
    expect(estimate.pessimisticCents).toBe(0)
  })

  it('sets scenario-specific isEstimated flags (only probable/uncertain income => optimistic=true, pessimistic=false)', () => {
    vi.setSystemTime(new Date('2025-01-12T12:00:00Z'))

    const accounts = [createCheckingAccount({ balance: 0, balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') })]

    const estimate = calculateEstimatedTodayBalance({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [
        createSingleShotIncome({
          date: dateOnly(2025, 1, 11),
          amount: 10_000,
          certainty: 'uncertain',
        }),
      ],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    expect(estimate.isEstimated.optimistic).toBe(true)
    expect(estimate.isEstimated.pessimistic).toBe(false)
    expect(estimate.isEstimated.any).toBe(true)
  })

  it('sets isEstimated=false for both scenarios when no movements exist in (baseDate, today]', () => {
    vi.setSystemTime(new Date('2025-01-12T12:00:00Z'))

    const accounts = [
      createCheckingAccount({
        balance: 100_000,
        balanceUpdatedAt: new Date('2025-01-10T12:00:00Z'),
      }),
    ]

    const estimate = calculateEstimatedTodayBalance({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    expect(estimate.isEstimated.optimistic).toBe(false)
    expect(estimate.isEstimated.pessimistic).toBe(false)
    expect(estimate.isEstimated.any).toBe(false)
  })
})

describe('rebaseProjectionFromEstimatedToday', () => {
  const emptyProjects: Project[] = []
  const emptyFixedExpenses: FixedExpense[] = []
  const emptyCreditCards: CreditCard[] = []
  const emptyFutureStatements: FutureStatement[] = []

  it('prepends a synthetic today point, starts forward projection tomorrow, and applies optimistic offset to balances and danger flags', () => {
    vi.setSystemTime(new Date('2025-01-20T12:00:00Z')) // today = 2025-01-20 in Sao Paulo

    const accounts = [
      createCheckingAccount({ balance: 0, balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') }),
    ]

    const singleShotExpenses = [
      // Included in estimate (today)
      createSingleShotExpense({ date: dateOnly(2025, 1, 20), amount: 10_000 }),
    ]
    const singleShotIncome = [
      // Included in optimistic estimate only (today)
      createSingleShotIncome({
        date: dateOnly(2025, 1, 20),
        amount: 20_000,
        certainty: 'probable',
      }),
    ]

    const estimatedToday = calculateEstimatedTodayBalance({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    // Sanity: pessimistic should be negative, optimistic non-negative (offset > 0)
    expect(estimatedToday.pessimisticCents).toBe(-10_000)
    expect(estimatedToday.optimisticCents).toBe(10_000)

    const projectionDays = 3
    const rebased = rebaseProjectionFromEstimatedToday({
      projectionDays,
      estimatedToday,
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
    })

    expect(rebased.days).toHaveLength(projectionDays)

    // Synthetic "today" prepended
    expect(rebased.days[0].date.getFullYear()).toBe(estimatedToday.today.getFullYear())
    expect(rebased.days[0].date.getMonth()).toBe(estimatedToday.today.getMonth())
    expect(rebased.days[0].date.getDate()).toBe(estimatedToday.today.getDate())
    expect(rebased.days[0].pessimisticBalance).toBe(estimatedToday.pessimisticCents)
    expect(rebased.days[0].optimisticBalance).toBe(estimatedToday.optimisticCents)

    // Forward projection starts tomorrow: no double counting of today's events
    expect(rebased.days[1].pessimisticBalance).toBe(estimatedToday.pessimisticCents)
    expect(rebased.days[1].optimisticBalance).toBe(estimatedToday.optimisticCents)

    // Optimistic offset applied to derived danger flags
    expect(rebased.days[0].isPessimisticDanger).toBe(true)
    expect(rebased.days[0].isOptimisticDanger).toBe(false)
    expect(rebased.days[1].isPessimisticDanger).toBe(true)
    expect(rebased.days[1].isOptimisticDanger).toBe(false)
  })

  it('when projectionDays=1, returns only a synthetic today point (no forward projection)', () => {
    vi.setSystemTime(new Date('2025-01-20T12:00:00Z')) // today = 2025-01-20 in Sao Paulo

    const accounts = [
      createCheckingAccount({ balance: 0, balanceUpdatedAt: new Date('2025-01-10T12:00:00Z') }),
    ]

    const singleShotExpenses = [
      // Included in estimate (today)
      createSingleShotExpense({ date: dateOnly(2025, 1, 20), amount: 10_000 }),
    ]
    const singleShotIncome = [
      // Included in optimistic estimate only (today)
      createSingleShotIncome({
        date: dateOnly(2025, 1, 20),
        amount: 20_000,
        certainty: 'probable',
      }),
    ]

    const estimatedToday = calculateEstimatedTodayBalance({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      timeZone: TIME_ZONE,
    })

    // Sanity: pessimistic should be negative, optimistic non-negative (offset > 0)
    expect(estimatedToday.pessimisticCents).toBe(-10_000)
    expect(estimatedToday.optimisticCents).toBe(10_000)

    const projectionDays = 1
    const rebased = rebaseProjectionFromEstimatedToday({
      projectionDays,
      estimatedToday,
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
    })

    expect(rebased.days).toHaveLength(projectionDays)
    expect(rebased.days[1]).toBeUndefined()

    // Dates should start/end on today
    expect(rebased.startDate.getFullYear()).toBe(estimatedToday.today.getFullYear())
    expect(rebased.startDate.getMonth()).toBe(estimatedToday.today.getMonth())
    expect(rebased.startDate.getDate()).toBe(estimatedToday.today.getDate())
    expect(rebased.endDate.getFullYear()).toBe(estimatedToday.today.getFullYear())
    expect(rebased.endDate.getMonth()).toBe(estimatedToday.today.getMonth())
    expect(rebased.endDate.getDate()).toBe(estimatedToday.today.getDate())

    // Synthetic "today" only
    expect(rebased.days[0].dayOffset).toBe(0)
    expect(rebased.days[0].date.getFullYear()).toBe(estimatedToday.today.getFullYear())
    expect(rebased.days[0].date.getMonth()).toBe(estimatedToday.today.getMonth())
    expect(rebased.days[0].date.getDate()).toBe(estimatedToday.today.getDate())
    expect(rebased.days[0].pessimisticBalance).toBe(estimatedToday.pessimisticCents)
    expect(rebased.days[0].optimisticBalance).toBe(estimatedToday.optimisticCents)
    expect(rebased.days[0].incomeEvents).toHaveLength(0)
    expect(rebased.days[0].expenseEvents).toHaveLength(0)
    expect(rebased.days[0].isPessimisticDanger).toBe(true)
    expect(rebased.days[0].isOptimisticDanger).toBe(false)

    // Starting balance is rebased to pessimistic estimate
    expect(rebased.startingBalance).toBe(estimatedToday.pessimisticCents)

    // Summaries should reflect single-day projection
    expect(rebased.optimistic.endBalance).toBe(estimatedToday.optimisticCents)
    expect(rebased.pessimistic.endBalance).toBe(estimatedToday.pessimisticCents)
    expect(rebased.optimistic.dangerDayCount).toBe(0)
    expect(rebased.pessimistic.dangerDayCount).toBe(1)
    expect(rebased.pessimistic.dangerDays).toHaveLength(1)
    expect(rebased.pessimistic.dangerDays[0].dayOffset).toBe(0)
    expect(rebased.pessimistic.dangerDays[0].balance).toBe(estimatedToday.pessimisticCents)
  })
})


