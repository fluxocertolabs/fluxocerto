/**
 * Tests for use-cashflow-projection hook utilities.
 * Tests the pure transformation functions.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import {
  calculateProjectionWithEstimate,
  transformToChartData,
  getDangerRanges,
} from './use-cashflow-projection'
import type { DailySnapshot } from '@/lib/cashflow/types'
import type { ChartDataPoint } from '@/components/cashflow/types'
import type {
  BankAccount,
  CreditCard,
  FixedExpense,
  FutureStatement,
  Project,
  SingleShotExpense,
  SingleShotIncome,
} from '@/types'

/**
 * Helper to create a mock DailySnapshot for testing.
 */
function createMockSnapshot(overrides: Partial<DailySnapshot> = {}): DailySnapshot {
  return {
    date: new Date('2025-01-15'),
    dayOffset: 0,
    optimisticBalance: 100000, // R$1,000.00 in cents
    pessimisticBalance: 80000, // R$800.00 in cents
    incomeEvents: [],
    expenseEvents: [],
    isOptimisticDanger: false,
    isPessimisticDanger: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('transformToChartData', () => {
  describe('investment total calculation', () => {
    it('should add investment total to optimistic balance for investment-inclusive balance', () => {
      const days: DailySnapshot[] = [
        createMockSnapshot({
          optimisticBalance: 100000, // R$1,000.00 in cents
        }),
      ]
      const investmentTotal = 50000 // R$500.00 in cents

      const result = transformToChartData(days, investmentTotal)

      // investmentInclusiveBalance = (optimisticBalance + investmentTotal) / 100
      // = (100000 + 50000) / 100 = 1500 dollars
      expect(result[0].investmentInclusiveBalance).toBe(1500)
    })

    it('should return optimistic balance when investment total is zero', () => {
      const days: DailySnapshot[] = [
        createMockSnapshot({
          optimisticBalance: 100000, // R$1,000.00 in cents
        }),
      ]
      const investmentTotal = 0

      const result = transformToChartData(days, investmentTotal)

      // investmentInclusiveBalance = optimisticBalance / 100 when no investments
      expect(result[0].investmentInclusiveBalance).toBe(1000)
      expect(result[0].optimisticBalance).toBe(1000)
    })

    it('should handle multiple days with consistent investment total', () => {
      const days: DailySnapshot[] = [
        createMockSnapshot({
          dayOffset: 0,
          optimisticBalance: 100000,
        }),
        createMockSnapshot({
          dayOffset: 1,
          date: new Date('2025-01-16'),
          optimisticBalance: 95000, // Decreased after expense
        }),
        createMockSnapshot({
          dayOffset: 2,
          date: new Date('2025-01-17'),
          optimisticBalance: 105000, // Increased after income
        }),
      ]
      const investmentTotal = 100000 // R$1,000.00 in cents

      const result = transformToChartData(days, investmentTotal)

      // Each day should have investmentTotal added to optimistic
      expect(result[0].investmentInclusiveBalance).toBe(2000) // (100000 + 100000) / 100
      expect(result[1].investmentInclusiveBalance).toBe(1950) // (95000 + 100000) / 100
      expect(result[2].investmentInclusiveBalance).toBe(2050) // (105000 + 100000) / 100
    })

    it('should handle negative optimistic balance with investment buffer', () => {
      const days: DailySnapshot[] = [
        createMockSnapshot({
          optimisticBalance: -20000, // R$-200.00 in cents (danger zone)
          isOptimisticDanger: true,
        }),
      ]
      const investmentTotal = 50000 // R$500.00 in cents

      const result = transformToChartData(days, investmentTotal)

      // investmentInclusiveBalance = (-20000 + 50000) / 100 = 300 dollars
      // Investment buffer brings balance positive
      expect(result[0].investmentInclusiveBalance).toBe(300)
      expect(result[0].optimisticBalance).toBe(-200)
    })

    it('should preserve other chart data point fields', () => {
      const testDate = new Date('2025-01-15')
      const days: DailySnapshot[] = [
        createMockSnapshot({
          date: testDate,
          dayOffset: 5,
          optimisticBalance: 150000,
          pessimisticBalance: 80000,
          isOptimisticDanger: false,
          isPessimisticDanger: true,
        }),
      ]
      const investmentTotal = 25000

      const result = transformToChartData(days, investmentTotal)

      expect(result[0]).toMatchObject({
        timestamp: testDate.getTime(),
        optimisticBalance: 1500, // 150000 / 100
        pessimisticBalance: 800, // 80000 / 100
        investmentInclusiveBalance: 1750, // (150000 + 25000) / 100
        isOptimisticDanger: false,
        isPessimisticDanger: true,
      })
      expect(result[0].snapshot).toBe(days[0])
    })
  })

  describe('cents to dollars conversion', () => {
    it('should correctly convert all balance fields from cents to dollars', () => {
      const days: DailySnapshot[] = [
        createMockSnapshot({
          optimisticBalance: 123456, // R$1,234.56
          pessimisticBalance: 78901, // R$789.01
        }),
      ]
      const investmentTotal = 11111 // R$111.11

      const result = transformToChartData(days, investmentTotal)

      expect(result[0].optimisticBalance).toBe(1234.56)
      expect(result[0].pessimisticBalance).toBe(789.01)
      expect(result[0].investmentInclusiveBalance).toBe(1345.67) // (123456 + 11111) / 100
    })
  })
})

// =============================================================================
// getDangerRanges TESTS
// =============================================================================

/**
 * Helper to create a mock ChartDataPoint for testing danger ranges.
 */
function createMockChartPoint(overrides: Partial<ChartDataPoint> = {}): ChartDataPoint {
  return {
    date: '15 Jan',
    timestamp: new Date('2025-01-15').getTime(),
    optimisticBalance: 1000,
    pessimisticBalance: 800,
    investmentInclusiveBalance: 1500,
    isOptimisticDanger: false,
    isPessimisticDanger: false,
    snapshot: createMockSnapshot(),
    ...overrides,
  }
}

describe('getDangerRanges', () => {
  describe('empty and no-danger scenarios', () => {
    it('should return empty array for empty input', () => {
      const result = getDangerRanges([])
      expect(result).toEqual([])
    })

    it('should return empty array when no danger days', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      expect(result).toEqual([])
    })
  })

  describe('single danger day scenarios', () => {
    it('should create range for single optimistic danger day', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '2 Jan',
        end: '2 Jan',
        scenario: 'optimistic',
      })
    })

    it('should create range for single pessimistic danger day', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '2 Jan',
        end: '2 Jan',
        scenario: 'pessimistic',
      })
    })

    it('should create range for single day with both scenarios in danger', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '2 Jan',
        end: '2 Jan',
        scenario: 'both',
      })
    })
  })

  describe('consecutive danger days consolidation', () => {
    it('should consolidate consecutive optimistic danger days', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '1 Jan',
        end: '3 Jan',
        scenario: 'optimistic',
      })
    })

    it('should consolidate consecutive pessimistic danger days', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        createMockChartPoint({ date: '4 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '1 Jan',
        end: '3 Jan',
        scenario: 'pessimistic',
      })
    })

    it('should consolidate consecutive both-scenario danger days', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '1 Jan',
        end: '2 Jan',
        scenario: 'both',
      })
    })
  })

  describe('scenario transitions', () => {
    it('should create separate ranges when scenario changes', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(3)
      expect(result[0]).toEqual({ start: '1 Jan', end: '1 Jan', scenario: 'pessimistic' })
      expect(result[1]).toEqual({ start: '2 Jan', end: '2 Jan', scenario: 'both' })
      expect(result[2]).toEqual({ start: '3 Jan', end: '3 Jan', scenario: 'optimistic' })
    })

    it('should handle alternating danger and safe days', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: true, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(2)
      expect(result[0]).toEqual({ start: '1 Jan', end: '1 Jan', scenario: 'optimistic' })
      expect(result[1]).toEqual({ start: '3 Jan', end: '3 Jan', scenario: 'optimistic' })
    })
  })

  describe('edge cases', () => {
    it('should handle danger at start of period', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({ start: '1 Jan', end: '1 Jan', scenario: 'both' })
    })

    it('should handle danger at end of period', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({ start: '2 Jan', end: '2 Jan', scenario: 'pessimistic' })
    })

    it('should handle entire period in danger', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        start: '1 Jan',
        end: '3 Jan',
        scenario: 'both',
      })
    })

    it('should handle single day input with danger', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({ start: '1 Jan', end: '1 Jan', scenario: 'pessimistic' })
    })

    it('should handle single day input without danger', () => {
      const chartData: ChartDataPoint[] = [
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result).toEqual([])
    })
  })

  describe('complex real-world scenarios', () => {
    it('should handle typical month with multiple danger ranges', () => {
      const chartData: ChartDataPoint[] = [
        // Week 1 - Safe
        createMockChartPoint({ date: '1 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        createMockChartPoint({ date: '2 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        // Week 2 - Pessimistic danger (waiting for income)
        createMockChartPoint({ date: '3 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        createMockChartPoint({ date: '4 Jan', isOptimisticDanger: false, isPessimisticDanger: true }),
        // Week 3 - Safe (after income)
        createMockChartPoint({ date: '5 Jan', isOptimisticDanger: false, isPessimisticDanger: false }),
        // Week 4 - Both in danger (end of month)
        createMockChartPoint({ date: '6 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
        createMockChartPoint({ date: '7 Jan', isOptimisticDanger: true, isPessimisticDanger: true }),
      ]

      const result = getDangerRanges(chartData)
      
      expect(result.length).toBe(2)
      expect(result[0]).toEqual({ start: '3 Jan', end: '4 Jan', scenario: 'pessimistic' })
      expect(result[1]).toEqual({ start: '6 Jan', end: '7 Jan', scenario: 'both' })
    })
  })
})

// =============================================================================
// calculateProjectionWithEstimate TESTS (Estimated today + rebase)
// =============================================================================

function createCheckingAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Conta Corrente',
    type: 'checking',
    balance: overrides.balance ?? 0,
    ownerId: overrides.ownerId,
    owner: overrides.owner ?? null,
    balanceUpdatedAt: overrides.balanceUpdatedAt,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

function createSingleShotIncome(overrides: Partial<SingleShotIncome> & Pick<SingleShotIncome, 'date' | 'amount' | 'certainty'>): SingleShotIncome {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: 'single_shot',
    name: overrides.name ?? 'Receita',
    amount: overrides.amount,
    date: overrides.date,
    certainty: overrides.certainty,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

function createSingleShotExpense(overrides: Partial<SingleShotExpense> & Pick<SingleShotExpense, 'date' | 'amount'>): SingleShotExpense {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: 'single_shot',
    name: overrides.name ?? 'Despesa',
    amount: overrides.amount,
    date: overrides.date,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

describe('calculateProjectionWithEstimate', () => {
  const emptyProjects: Project[] = []
  const emptyFixedExpenses: FixedExpense[] = []
  const emptyCreditCards: CreditCard[] = []
  const emptyFutureStatements: FutureStatement[] = []

  it('rebases the projection from estimated-today when a reliable base exists', () => {
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

    const accounts = [
      createCheckingAccount({
        balance: 10_000,
        balanceUpdatedAt: new Date('2025-01-05T12:00:00Z'),
      }),
    ]

    const { projection, estimate } = calculateProjectionWithEstimate({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [
        createSingleShotExpense({ date: new Date(2025, 0, 10), amount: 2_000 }),
      ],
      singleShotIncome: [],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      projectionDays: 7,
    })

    expect(estimate.hasBase).toBe(true)
    expect(projection.days).toHaveLength(7)

    // Synthetic today snapshot equals estimated balances (rebased start)
    expect(projection.startingBalance).toBe(estimate.pessimisticCents)
    expect(projection.days[0].pessimisticBalance).toBe(estimate.pessimisticCents)
    expect(projection.days[0].optimisticBalance).toBe(estimate.optimisticCents)

    // Forward projection starts tomorrow (no double counting)
    const tomorrow = new Date(estimate.today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(projection.days[1].date.getFullYear()).toBe(tomorrow.getFullYear())
    expect(projection.days[1].date.getMonth()).toBe(tomorrow.getMonth())
    expect(projection.days[1].date.getDate()).toBe(tomorrow.getDate())
  })

  it('keeps existing behavior when there is no reliable base (projection starts today and can include today events)', () => {
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

    const accounts = [createCheckingAccount({ balance: 0, balanceUpdatedAt: undefined })]
    const today = new Date(2025, 0, 15)

    const { projection, estimate } = calculateProjectionWithEstimate({
      accounts,
      projects: emptyProjects,
      fixedExpenses: emptyFixedExpenses,
      singleShotExpenses: [],
      singleShotIncome: [
        createSingleShotIncome({ date: today, amount: 5_000, certainty: 'guaranteed' }),
      ],
      creditCards: emptyCreditCards,
      futureStatements: emptyFutureStatements,
      projectionDays: 7,
    })

    expect(estimate.hasBase).toBe(false)
    expect(projection.days).toHaveLength(7)
    expect(projection.days[0].incomeEvents.length).toBeGreaterThan(0)
  })
})

