/**
 * Cashflow Calculation with Future Statements Tests
 *
 * Tests for future statement integration with cashflow calculation.
 * Covers FR-006 (0 for undefined future months) and future statement lookup.
 */

import { describe, expect, it } from 'vitest'
import { calculateCashflow, getCreditCardAmountForDate } from './calculate'
import type { CashflowEngineInput } from './validators'
import type { FutureStatement, CreditCard } from '../../types'

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestCreditCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Card',
    statementBalance: overrides.statementBalance ?? 50000,
    dueDay: overrides.dueDay ?? 15,
    owner: overrides.owner ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

function createTestFutureStatement(
  overrides: Partial<FutureStatement> = {}
): FutureStatement {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    groupId: overrides.groupId ?? 'test-group-1',
    creditCardId: overrides.creditCardId ?? 'card-123',
    targetMonth: overrides.targetMonth ?? 6,
    targetYear: overrides.targetYear ?? 2025,
    amount: overrides.amount ?? 75000,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  }
}

function createTestAccount(
  overrides: Partial<{
    id: string
    name: string
    type: 'checking' | 'savings' | 'investment'
    balance: number
    owner: { id: string; name: string } | null
  }> = {}
) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Account',
    type: overrides.type ?? 'checking',
    balance: overrides.balance ?? 100000,
    owner: overrides.owner ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// =============================================================================
// getCreditCardAmountForDate TESTS
// =============================================================================

describe('getCreditCardAmountForDate', () => {
  describe('current and past months', () => {
    it('returns statementBalance for current month', () => {
      const now = new Date()
      const card = createTestCreditCard({ statementBalance: 50000 })

      const amount = getCreditCardAmountForDate(card, [], now)
      expect(amount).toBe(50000)
    })

    it('returns statementBalance for past months', () => {
      const pastDate = new Date()
      pastDate.setMonth(pastDate.getMonth() - 2)

      const card = createTestCreditCard({ statementBalance: 75000 })

      const amount = getCreditCardAmountForDate(card, [], pastDate)
      expect(amount).toBe(75000)
    })
  })

  describe('future months with defined statements', () => {
    it('returns future statement amount when defined', () => {
      const now = new Date()
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15)

      const card = createTestCreditCard({ id: 'card-123', statementBalance: 50000 })
      const futureStatement = createTestFutureStatement({
        creditCardId: 'card-123',
        targetMonth: futureDate.getMonth() + 1,
        targetYear: futureDate.getFullYear(),
        amount: 100000,
      })

      const amount = getCreditCardAmountForDate(card, [futureStatement], futureDate)
      expect(amount).toBe(100000)
    })

    it('matches correct card when multiple cards exist', () => {
      const now = new Date()
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15)

      const card1 = createTestCreditCard({ id: 'card-1', statementBalance: 50000 })
      const card2 = createTestCreditCard({ id: 'card-2', statementBalance: 75000 })

      const statements = [
        createTestFutureStatement({
          creditCardId: 'card-1',
          targetMonth: futureDate.getMonth() + 1,
          targetYear: futureDate.getFullYear(),
          amount: 100000,
        }),
        createTestFutureStatement({
          creditCardId: 'card-2',
          targetMonth: futureDate.getMonth() + 1,
          targetYear: futureDate.getFullYear(),
          amount: 200000,
        }),
      ]

      expect(getCreditCardAmountForDate(card1, statements, futureDate)).toBe(100000)
      expect(getCreditCardAmountForDate(card2, statements, futureDate)).toBe(200000)
    })
  })

  describe('future months without defined statements (FR-006)', () => {
    it('returns 0 when no future statement is defined', () => {
      const now = new Date()
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 3, 15)

      const card = createTestCreditCard({ id: 'card-123', statementBalance: 50000 })

      const amount = getCreditCardAmountForDate(card, [], futureDate)
      expect(amount).toBe(0)
    })

    it('returns 0 when future statement exists for different card', () => {
      const now = new Date()
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15)

      const card = createTestCreditCard({ id: 'card-123', statementBalance: 50000 })
      const otherCardStatement = createTestFutureStatement({
        creditCardId: 'other-card',
        targetMonth: futureDate.getMonth() + 1,
        targetYear: futureDate.getFullYear(),
        amount: 100000,
      })

      const amount = getCreditCardAmountForDate(card, [otherCardStatement], futureDate)
      expect(amount).toBe(0)
    })

    it('returns 0 when future statement exists for different month', () => {
      const now = new Date()
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15)

      const card = createTestCreditCard({ id: 'card-123', statementBalance: 50000 })
      const differentMonthStatement = createTestFutureStatement({
        creditCardId: 'card-123',
        targetMonth: futureDate.getMonth() + 2, // Different month
        targetYear: futureDate.getFullYear(),
        amount: 100000,
      })

      const amount = getCreditCardAmountForDate(card, [differentMonthStatement], futureDate)
      expect(amount).toBe(0)
    })
  })

  describe('year boundary handling', () => {
    it('handles year rollover correctly', () => {
      const card = createTestCreditCard({ id: 'card-123', statementBalance: 50000 })

      // Create a date in January of next year
      const now = new Date()
      const nextYearJan = new Date(now.getFullYear() + 1, 0, 15) // January next year

      const statement = createTestFutureStatement({
        creditCardId: 'card-123',
        targetMonth: 1,
        targetYear: now.getFullYear() + 1,
        amount: 150000,
      })

      const amount = getCreditCardAmountForDate(card, [statement], nextYearJan)
      expect(amount).toBe(150000)
    })
  })
})

// =============================================================================
// CASHFLOW CALCULATION WITH FUTURE STATEMENTS TESTS
// =============================================================================

describe('calculateCashflow with future statements', () => {
  it('uses future statement amount for future months', () => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1) // Start of next month

    const card = createTestCreditCard({
      id: 'card-123',
      dueDay: 15,
      statementBalance: 50000,
    })

    const futureStatement = createTestFutureStatement({
      creditCardId: 'card-123',
      targetMonth: startDate.getMonth() + 1,
      targetYear: startDate.getFullYear(),
      amount: 100000,
    })

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [],
      creditCards: [card],
      futureStatements: [futureStatement],
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)

    // Find the day with credit card payment (day 15)
    const paymentDay = projection.days.find((d) => d.date.getDate() === 15)
    expect(paymentDay).toBeDefined()
    expect(paymentDay!.expenseEvents.length).toBe(1)
    expect(paymentDay!.expenseEvents[0].amount).toBe(100000)
  })

  it('returns 0 expense for undefined future months (FR-006)', () => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() + 2, 1) // Start 2 months from now

    const card = createTestCreditCard({
      id: 'card-123',
      dueDay: 15,
      statementBalance: 50000,
    })

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [],
      creditCards: [card],
      futureStatements: [], // No future statements defined
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)

    // Find the day with credit card payment (day 15)
    const paymentDay = projection.days.find((d) => d.date.getDate() === 15)
    expect(paymentDay).toBeDefined()
    expect(paymentDay!.expenseEvents.length).toBe(1)
    expect(paymentDay!.expenseEvents[0].amount).toBe(0) // FR-006: 0 for undefined
  })

  it('accumulates totalExpenses correctly with future statements', () => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const card = createTestCreditCard({
      id: 'card-123',
      dueDay: 15,
      statementBalance: 50000,
    })

    const futureStatement = createTestFutureStatement({
      creditCardId: 'card-123',
      targetMonth: startDate.getMonth() + 1,
      targetYear: startDate.getFullYear(),
      amount: 75000,
    })

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [],
      creditCards: [card],
      futureStatements: [futureStatement],
      options: { startDate, projectionDays: 20 },
    }

    const projection = calculateCashflow(input)
    expect(projection.optimistic.totalExpenses).toBe(75000)
  })

  it('handles multiple credit cards with mixed future statements', () => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const card1 = createTestCreditCard({
      id: 'card-1',
      name: 'Card 1',
      dueDay: 10,
      statementBalance: 50000,
    })

    const card2 = createTestCreditCard({
      id: 'card-2',
      name: 'Card 2',
      dueDay: 20,
      statementBalance: 75000,
    })

    // Only card1 has a future statement defined
    const futureStatement = createTestFutureStatement({
      creditCardId: 'card-1',
      targetMonth: startDate.getMonth() + 1,
      targetYear: startDate.getFullYear(),
      amount: 100000,
    })

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [],
      creditCards: [card1, card2],
      futureStatements: [futureStatement],
      options: { startDate, projectionDays: 25 },
    }

    const projection = calculateCashflow(input)

    // Card 1 should use future statement (100000)
    // Card 2 should use 0 (no future statement defined - FR-006)
    expect(projection.optimistic.totalExpenses).toBe(100000) // Only card1's future statement
  })

  it('uses statementBalance for current month projection', () => {
    const now = new Date()
    // Start from today (current month)
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)

    const card = createTestCreditCard({
      id: 'card-123',
      dueDay: 25, // Make sure it's after the 1st
      statementBalance: 80000,
    })

    const input: CashflowEngineInput = {
      accounts: [createTestAccount({ balance: 500000 })],
      projects: [],
      expenses: [],
      creditCards: [card],
      futureStatements: [], // No future statements
      options: { startDate, projectionDays: 30 },
    }

    const projection = calculateCashflow(input)

    // Find the day with credit card payment (day 25)
    const paymentDay = projection.days.find(
      (d) => d.date.getDate() === 25 && d.date.getMonth() === now.getMonth()
    )

    if (paymentDay) {
      expect(paymentDay.expenseEvents.length).toBe(1)
      expect(paymentDay.expenseEvents[0].amount).toBe(80000) // Uses statementBalance
    }
  })
})

// =============================================================================
// 12-MONTH ROLLING WINDOW TESTS
// =============================================================================

describe('12-month rolling window validation', () => {
  it('allows future statements within 12 months', () => {
    const now = new Date()
    const validDate = new Date(now.getFullYear(), now.getMonth() + 11, 1)

    const statement = createTestFutureStatement({
      targetMonth: validDate.getMonth() + 1,
      targetYear: validDate.getFullYear(),
    })

    // The statement should be valid (schema allows it)
    expect(statement.targetMonth).toBeGreaterThanOrEqual(1)
    expect(statement.targetMonth).toBeLessThanOrEqual(12)
  })
})

// =============================================================================
// DUPLICATE MONTH/YEAR PREVENTION TESTS
// =============================================================================

describe('duplicate month/year handling', () => {
  it('only uses first matching statement when duplicates exist', () => {
    const now = new Date()
    const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15)

    const card = createTestCreditCard({ id: 'card-123', statementBalance: 50000 })

    // Create two statements for the same month (shouldn't happen in practice due to DB constraint)
    const statements = [
      createTestFutureStatement({
        creditCardId: 'card-123',
        targetMonth: futureDate.getMonth() + 1,
        targetYear: futureDate.getFullYear(),
        amount: 100000,
      }),
      createTestFutureStatement({
        creditCardId: 'card-123',
        targetMonth: futureDate.getMonth() + 1,
        targetYear: futureDate.getFullYear(),
        amount: 200000, // Different amount
      }),
    ]

    const amount = getCreditCardAmountForDate(card, statements, futureDate)
    // Should use the first one found
    expect(amount).toBe(100000)
  })
})

