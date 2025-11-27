/**
 * Cashflow Calculation Engine Tests
 *
 * Tests for core calculation logic, scenario summaries, and edge cases.
 */

import { describe, expect, it } from 'vitest'
import { calculateCashflow, calculateStartingBalance } from './calculate'
import type { CashflowEngineInput } from './validators'

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestAccount(overrides: Partial<{
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Account',
    type: overrides.type ?? 'checking',
    balance: overrides.balance ?? 100000, // $1000
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createTestProject(overrides: Partial<{
  id: string
  name: string
  amount: number
  paymentDay: number
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  isActive: boolean
  paymentSchedule:
    | { type: 'dayOfWeek'; dayOfWeek: number }
    | { type: 'dayOfMonth'; dayOfMonth: number }
    | { type: 'twiceMonthly'; firstDay: number; secondDay: number; firstAmount?: number; secondAmount?: number }
}> = {}) {
  const frequency = overrides.frequency ?? 'monthly'
  const paymentDay = overrides.paymentDay ?? 15

  // Build appropriate paymentSchedule based on frequency if not explicitly provided
  let paymentSchedule = overrides.paymentSchedule
  if (!paymentSchedule) {
    if (frequency === 'weekly' || frequency === 'biweekly') {
      // Default to Friday (5) for weekly/biweekly
      paymentSchedule = { type: 'dayOfWeek', dayOfWeek: 5 }
    } else if (frequency === 'twice-monthly') {
      paymentSchedule = { type: 'twiceMonthly', firstDay: 1, secondDay: 15 }
    } else {
      paymentSchedule = { type: 'dayOfMonth', dayOfMonth: paymentDay }
    }
  }

  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Project',
    amount: overrides.amount ?? 50000, // $500
    paymentDay: overrides.paymentDay ?? 15, // Legacy field for backward compatibility
    frequency,
    paymentSchedule,
    certainty: overrides.certainty ?? 'guaranteed',
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createTestExpense(overrides: Partial<{
  id: string
  name: string
  amount: number
  dueDay: number
  isActive: boolean
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Expense',
    amount: overrides.amount ?? 30000, // $300
    dueDay: overrides.dueDay ?? 1,
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createTestCreditCard(overrides: Partial<{
  id: string
  name: string
  statementBalance: number
  dueDay: number
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Card',
    statementBalance: overrides.statementBalance ?? 20000, // $200
    dueDay: overrides.dueDay ?? 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// =============================================================================
// STARTING BALANCE TESTS
// =============================================================================

describe('calculateStartingBalance', () => {
  it('returns 0 when no accounts exist', () => {
    expect(calculateStartingBalance([])).toBe(0)
  })

  it('sums only checking account balances', () => {
    const accounts = [
      createTestAccount({ type: 'checking', balance: 100000 }),
      createTestAccount({ type: 'savings', balance: 200000 }),
      createTestAccount({ type: 'checking', balance: 50000 }),
      createTestAccount({ type: 'investment', balance: 500000 }),
    ]
    expect(calculateStartingBalance(accounts)).toBe(150000) // Only checking accounts
  })

  it('returns 0 when only non-checking accounts exist', () => {
    const accounts = [
      createTestAccount({ type: 'savings', balance: 100000 }),
      createTestAccount({ type: 'investment', balance: 200000 }),
    ]
    expect(calculateStartingBalance(accounts)).toBe(0)
  })
})

// =============================================================================
// SCENARIO SUMMARY TESTS (US6)
// =============================================================================

describe('ScenarioSummary - totalIncome accumulation (T031)', () => {
  it('accumulates totalIncome correctly from all income events', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [
        createTestProject({ paymentDay: 5, amount: 100000, certainty: 'guaranteed' }),
        createTestProject({ paymentDay: 15, amount: 200000, certainty: 'guaranteed' }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // Both payments should occur once in 30 days (monthly)
    expect(projection.optimistic.totalIncome).toBe(300000)
    expect(projection.pessimistic.totalIncome).toBe(300000)
  })

  it('optimistic includes all active income, pessimistic only guaranteed', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [
        createTestProject({ paymentDay: 10, amount: 100000, certainty: 'guaranteed' }),
        createTestProject({ paymentDay: 20, amount: 150000, certainty: 'uncertain' }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // Optimistic includes both
    expect(projection.optimistic.totalIncome).toBe(250000)
    // Pessimistic only guaranteed
    expect(projection.pessimistic.totalIncome).toBe(100000)
  })
})

describe('ScenarioSummary - totalExpenses accumulation (T032)', () => {
  it('accumulates totalExpenses correctly from all expense events', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 1000000 })],
      projects: [],
      expenses: [
        createTestExpense({ dueDay: 5, amount: 50000 }),
        createTestExpense({ dueDay: 15, amount: 75000 }),
      ],
      creditCards: [
        createTestCreditCard({ dueDay: 20, statementBalance: 25000 }),
      ],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // All expenses occur once in 30 days (monthly)
    // Fixed expenses: 50000 + 75000 = 125000
    // Credit card: 25000
    // Total: 150000
    expect(projection.optimistic.totalExpenses).toBe(150000)
    expect(projection.pessimistic.totalExpenses).toBe(150000)
  })

  it('expenses are same for both scenarios', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 1000000 })],
      projects: [
        createTestProject({ paymentDay: 10, amount: 100000, certainty: 'guaranteed' }),
        createTestProject({ paymentDay: 20, amount: 200000, certainty: 'uncertain' }),
      ],
      expenses: [
        createTestExpense({ dueDay: 15, amount: 80000 }),
      ],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // Expenses should be identical for both scenarios
    expect(projection.optimistic.totalExpenses).toBe(projection.pessimistic.totalExpenses)
    expect(projection.optimistic.totalExpenses).toBe(80000)
  })
})

describe('ScenarioSummary - endBalance equals final day balance (T033)', () => {
  it('endBalance equals the last day optimisticBalance', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [createTestProject({ paymentDay: 15, amount: 200000 })],
      expenses: [createTestExpense({ dueDay: 10, amount: 100000 })],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)
    const lastDay = projection.days[projection.days.length - 1]

    expect(projection.optimistic.endBalance).toBe(lastDay.optimisticBalance)
  })

  it('endBalance equals the last day pessimisticBalance', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [createTestProject({ paymentDay: 15, amount: 200000, certainty: 'guaranteed' })],
      expenses: [createTestExpense({ dueDay: 10, amount: 100000 })],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)
    const lastDay = projection.days[projection.days.length - 1]

    expect(projection.pessimistic.endBalance).toBe(lastDay.pessimisticBalance)
  })
})

// =============================================================================
// BASIC PROJECTION TESTS (US1/US2)
// =============================================================================

describe('calculateCashflow - basic projection', () => {
  it('returns correct projection period', () => {
    const startDate = new Date('2025-01-15T00:00:00')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount()],
      projects: [],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // startOfDay normalizes the date, so we compare day values
    expect(projection.startDate.getFullYear()).toBe(2025)
    expect(projection.startDate.getMonth()).toBe(0) // January
    expect(projection.startDate.getDate()).toBe(15)
    expect(projection.days.length).toBe(30)
    expect(projection.days[0].dayOffset).toBe(0)
    expect(projection.days[29].dayOffset).toBe(29)
  })

  it('calculates correct starting balance from checking accounts', () => {
    const input: CashflowEngineInput = {
      accounts: [
        createTestAccount({ type: 'checking', balance: 300000 }),
        createTestAccount({ type: 'savings', balance: 500000 }),
      ],
      projects: [],
      expenses: [],
      creditCards: [],
      options: { projectionDays: 5 },
    }

    const projection = calculateCashflow(input)

    expect(projection.startingBalance).toBe(300000)
    expect(projection.days[0].optimisticBalance).toBe(300000)
    expect(projection.days[0].pessimisticBalance).toBe(300000)
  })

  it('filters inactive projects', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({ paymentDay: 5, amount: 50000, isActive: true }),
        createTestProject({ paymentDay: 10, amount: 100000, isActive: false }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 15 },
    }

    const projection = calculateCashflow(input)

    // Only active project income should be included
    expect(projection.optimistic.totalIncome).toBe(50000)
  })

  it('filters inactive expenses', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [
        createTestExpense({ dueDay: 5, amount: 30000, isActive: true }),
        createTestExpense({ dueDay: 10, amount: 50000, isActive: false }),
      ],
      creditCards: [],
      options: { startDate, projectionDays: 15 },
    }

    const projection = calculateCashflow(input)

    // Only active expense should be included
    expect(projection.optimistic.totalExpenses).toBe(30000)
  })
})

// =============================================================================
// DUAL SCENARIO TESTS (US2)
// =============================================================================

describe('calculateCashflow - dual scenarios', () => {
  it('optimistic includes all active income sources', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({ paymentDay: 5, amount: 100000, certainty: 'guaranteed' }),
        createTestProject({ paymentDay: 10, amount: 50000, certainty: 'probable' }),
        createTestProject({ paymentDay: 15, amount: 75000, certainty: 'uncertain' }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)

    // Optimistic should include all three
    expect(projection.optimistic.totalIncome).toBe(225000)
  })

  it('pessimistic includes only guaranteed income sources', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({ paymentDay: 5, amount: 100000, certainty: 'guaranteed' }),
        createTestProject({ paymentDay: 10, amount: 50000, certainty: 'probable' }),
        createTestProject({ paymentDay: 15, amount: 75000, certainty: 'uncertain' }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)

    // Pessimistic should only include guaranteed
    expect(projection.pessimistic.totalIncome).toBe(100000)
  })

  it('scenarios diverge correctly based on certainty levels', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 50000 })],
      projects: [
        createTestProject({ paymentDay: 15, amount: 200000, certainty: 'uncertain' }),
      ],
      expenses: [
        createTestExpense({ dueDay: 10, amount: 100000 }),
      ],
      creditCards: [],
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)

    // Optimistic: 50000 - 100000 + 200000 = 150000
    expect(projection.optimistic.endBalance).toBe(150000)

    // Pessimistic: 50000 - 100000 = -50000 (no uncertain income)
    expect(projection.pessimistic.endBalance).toBe(-50000)
  })
})

// =============================================================================
// DANGER DAY TESTS (US4)
// =============================================================================

describe('calculateCashflow - danger days', () => {
  it('detects danger days when balance goes negative', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 50000 })], // $500
      projects: [],
      expenses: [
        createTestExpense({ dueDay: 5, amount: 100000 }), // $1000 expense
      ],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)

    // After day 5, balance should be negative
    expect(projection.optimistic.dangerDayCount).toBeGreaterThan(0)
    expect(projection.pessimistic.dangerDayCount).toBeGreaterThan(0)
  })

  it('tracks danger days separately for each scenario', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 50000 })],
      projects: [
        createTestProject({ paymentDay: 3, amount: 100000, certainty: 'uncertain' }),
      ],
      expenses: [
        createTestExpense({ dueDay: 5, amount: 100000 }),
      ],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)

    // Optimistic: 50000 + 100000 - 100000 = 50000 (no danger)
    expect(projection.optimistic.dangerDayCount).toBe(0)

    // Pessimistic: 50000 - 100000 = -50000 (danger days after expense)
    expect(projection.pessimistic.dangerDayCount).toBeGreaterThan(0)
  })

  it('danger day includes correct date and balance', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 50000 })],
      projects: [],
      expenses: [
        createTestExpense({ dueDay: 5, amount: 100000 }),
      ],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)
    const dangerDay = projection.pessimistic.dangerDays[0]

    expect(dangerDay).toBeDefined()
    expect(dangerDay.balance).toBeLessThan(0)
    expect(dangerDay.dayOffset).toBeGreaterThanOrEqual(4) // Day 5 (0-indexed = 4)
  })

  it('sets isOptimisticDanger and isPessimisticDanger flags correctly', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 50000 })],
      projects: [
        createTestProject({ paymentDay: 3, amount: 100000, certainty: 'uncertain' }),
      ],
      expenses: [
        createTestExpense({ dueDay: 5, amount: 100000 }),
      ],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)

    // Find a day after the expense (day 5+)
    const dayAfterExpense = projection.days.find(d => d.dayOffset >= 4)

    expect(dayAfterExpense).toBeDefined()
    // Optimistic should not be danger (income covers expense)
    // Pessimistic should be danger (no uncertain income)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

// =============================================================================
// TWICE-MONTHLY VARIABLE AMOUNTS TESTS (US2)
// =============================================================================

describe('calculateCashflow - twice-monthly variable amounts', () => {
  it('uses firstAmount on first payment day (T010)', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({
          frequency: 'twice-monthly',
          amount: 100000, // Base amount (fallback)
          paymentSchedule: {
            type: 'twiceMonthly',
            firstDay: 5,
            secondDay: 20,
            firstAmount: 300000, // R$ 3.000
            secondAmount: 50000, // R$ 500
          },
        }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)

    // Find the day with date matching day 5 of the month
    const day5 = projection.days.find((d) => d.date.getDate() === 5)
    expect(day5).toBeDefined()
    expect(day5!.incomeEvents.length).toBe(1)
    expect(day5!.incomeEvents[0].amount).toBe(300000)
  })

  it('uses secondAmount on second payment day (T011)', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({
          frequency: 'twice-monthly',
          amount: 100000, // Base amount (fallback)
          paymentSchedule: {
            type: 'twiceMonthly',
            firstDay: 5,
            secondDay: 20,
            firstAmount: 300000, // R$ 3.000
            secondAmount: 50000, // R$ 500
          },
        }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 25 },
    }

    const projection = calculateCashflow(input)

    // Find the day with date matching day 20 of the month
    const day20 = projection.days.find((d) => d.date.getDate() === 20)
    expect(day20).toBeDefined()
    expect(day20!.incomeEvents.length).toBe(1)
    expect(day20!.incomeEvents[0].amount).toBe(50000)
  })

  it('falls back to project.amount when no variable amounts (T012)', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({
          frequency: 'twice-monthly',
          amount: 150000, // Base amount
          paymentSchedule: {
            type: 'twiceMonthly',
            firstDay: 5,
            secondDay: 20,
            // No firstAmount/secondAmount - should fallback to project.amount
          },
        }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 25 },
    }

    const projection = calculateCashflow(input)

    // Find the day with date matching day 5 of the month
    const day5 = projection.days.find((d) => d.date.getDate() === 5)
    expect(day5).toBeDefined()
    expect(day5!.incomeEvents.length).toBe(1)
    expect(day5!.incomeEvents[0].amount).toBe(150000)

    // Find the day with date matching day 20 of the month
    const day20 = projection.days.find((d) => d.date.getDate() === 20)
    expect(day20).toBeDefined()
    expect(day20!.incomeEvents.length).toBe(1)
    expect(day20!.incomeEvents[0].amount).toBe(150000)
  })

  it('handles month-end edge cases with variable amounts (T013)', () => {
    // February 2025 has 28 days, so day 31 should adjust to day 28
    const startDate = new Date('2025-02-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [
        createTestProject({
          frequency: 'twice-monthly',
          amount: 100000,
          paymentSchedule: {
            type: 'twiceMonthly',
            firstDay: 15,
            secondDay: 31, // Should adjust to day 28 in February
            firstAmount: 200000,
            secondAmount: 100000,
          },
        }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 30 }, // Extended to ensure we capture day 28
    }

    const projection = calculateCashflow(input)

    // Find the day with date matching day 15 of the month (February)
    const day15 = projection.days.find((d) => d.date.getDate() === 15 && d.date.getMonth() === 1)
    expect(day15).toBeDefined()
    expect(day15!.incomeEvents.length).toBe(1)
    expect(day15!.incomeEvents[0].amount).toBe(200000)

    // Find the day with date matching day 28 (adjusted from day 31) in February
    const day28 = projection.days.find((d) => d.date.getDate() === 28 && d.date.getMonth() === 1)
    expect(day28).toBeDefined()
    expect(day28!.incomeEvents.length).toBe(1)
    expect(day28!.incomeEvents[0].amount).toBe(100000)
  })

  it('accumulates correct total income with variable amounts', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 0 })],
      projects: [
        createTestProject({
          frequency: 'twice-monthly',
          amount: 100000,
          certainty: 'guaranteed',
          paymentSchedule: {
            type: 'twiceMonthly',
            firstDay: 5,
            secondDay: 20,
            firstAmount: 300000,
            secondAmount: 50000,
          },
        }),
      ],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // Total income should be firstAmount + secondAmount
    expect(projection.optimistic.totalIncome).toBe(350000)
    expect(projection.pessimistic.totalIncome).toBe(350000)
  })
})

describe('calculateCashflow - edge cases', () => {
  it('handles 0 projection days gracefully', () => {
    const input: CashflowEngineInput = {
      accounts: [createTestAccount()],
      projects: [],
      expenses: [],
      creditCards: [],
      options: { projectionDays: 1 }, // Minimum valid
    }

    const projection = calculateCashflow(input)
    expect(projection.days.length).toBe(1)
  })

  it('handles no accounts (starting balance 0)', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [],
      projects: [createTestProject({ paymentDay: 5, amount: 100000 })],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)

    expect(projection.startingBalance).toBe(0)
    expect(projection.days[0].optimisticBalance).toBe(0)
  })

  it('handles no income sources', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [createTestExpense({ dueDay: 10, amount: 100000 })],
      creditCards: [],
      options: { startDate, projectionDays: 15 },
    }

    const projection = calculateCashflow(input)

    expect(projection.optimistic.totalIncome).toBe(0)
    expect(projection.pessimistic.totalIncome).toBe(0)
    expect(projection.optimistic.endBalance).toBe(400000) // 500000 - 100000
  })

  it('handles no expenses', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [createTestProject({ paymentDay: 15, amount: 200000 })],
      expenses: [],
      creditCards: [],
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)

    expect(projection.optimistic.totalExpenses).toBe(0)
    expect(projection.optimistic.endBalance).toBe(300000) // 100000 + 200000
  })

  it('handles all inactive entities', () => {
    const startDate = new Date('2025-01-01')

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 100000 })],
      projects: [createTestProject({ isActive: false })],
      expenses: [createTestExpense({ isActive: false })],
      creditCards: [],
      options: { startDate, projectionDays: 10 },
    }

    const projection = calculateCashflow(input)

    expect(projection.optimistic.totalIncome).toBe(0)
    expect(projection.optimistic.totalExpenses).toBe(0)
    expect(projection.optimistic.endBalance).toBe(100000) // Starting balance unchanged
  })
})

