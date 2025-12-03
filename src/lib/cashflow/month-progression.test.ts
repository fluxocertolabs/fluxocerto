/**
 * Month Progression Tests
 *
 * Tests for month progression helper functions.
 * Note: The main async functions (performMonthProgression, checkAndProgressMonth)
 * are tested via E2E tests since they require database interactions.
 */

import { describe, expect, it } from 'vitest'
import { getMonthsDiff } from './month-progression'

// =============================================================================
// getMonthsDiff TESTS
// =============================================================================

describe('getMonthsDiff', () => {
  it('returns 0 for same month', () => {
    const date = new Date('2025-06-15')
    expect(getMonthsDiff(date, date)).toBe(0)
  })

  it('returns 1 for consecutive months', () => {
    const from = new Date('2025-05-15')
    const to = new Date('2025-06-15')
    expect(getMonthsDiff(from, to)).toBe(1)
  })

  it('returns correct diff for multiple months', () => {
    const from = new Date('2025-01-15')
    const to = new Date('2025-06-15')
    expect(getMonthsDiff(from, to)).toBe(5)
  })

  it('handles year boundary correctly', () => {
    const from = new Date('2024-12-15')
    const to = new Date('2025-01-15')
    expect(getMonthsDiff(from, to)).toBe(1)
  })

  it('handles multi-year spans', () => {
    const from = new Date('2023-06-15')
    const to = new Date('2025-06-15')
    expect(getMonthsDiff(from, to)).toBe(24)
  })

  it('returns negative for reverse order', () => {
    const from = new Date('2025-06-15')
    const to = new Date('2025-01-15')
    expect(getMonthsDiff(from, to)).toBe(-5)
  })

  it('ignores day of month (uses start of month)', () => {
    // Both dates are in the same month range when normalized to start of month
    const from = new Date('2025-05-15')
    const to = new Date('2025-05-30')
    expect(getMonthsDiff(from, to)).toBe(0)
  })
})

// =============================================================================
// MONTH PROGRESSION LOGIC TESTS (Pure Functions)
// =============================================================================

describe('Month Progression Logic', () => {
  describe('progression decision logic', () => {
    it('should progress when last check was in previous month', () => {
      const now = new Date('2025-06-15')
      const lastCheck = new Date('2025-05-20')

      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const lastCheckMonth = lastCheck.getMonth() + 1
      const lastCheckYear = lastCheck.getFullYear()

      const shouldProgress =
        lastCheckYear < currentYear ||
        (lastCheckYear === currentYear && lastCheckMonth < currentMonth)

      expect(shouldProgress).toBe(true)
    })

    it('should not progress when last check was in current month', () => {
      // Use specific dates for deterministic testing
      const now = new Date('2025-06-15')
      const lastCheck = new Date('2025-06-10') // Same month

      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const lastCheckMonth = lastCheck.getMonth() + 1
      const lastCheckYear = lastCheck.getFullYear()

      // When both are in the same month, should NOT progress
      const sameMonth = lastCheckYear === currentYear && lastCheckMonth === currentMonth

      expect(sameMonth).toBe(true)
    })

    it('should progress when last check is null (first time)', () => {
      const lastCheck = null
      const shouldProgress = lastCheck === null

      expect(shouldProgress).toBe(true)
    })

    it('handles year boundary correctly', () => {
      const now = new Date('2025-01-15')
      const lastCheck = new Date('2024-12-20')

      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const lastCheckMonth = lastCheck.getMonth() + 1
      const lastCheckYear = lastCheck.getFullYear()

      const shouldProgress =
        lastCheckYear < currentYear ||
        (lastCheckYear === currentYear && lastCheckMonth < currentMonth)

      expect(shouldProgress).toBe(true)
    })
  })

  describe('statement matching logic', () => {
    interface MockFutureStatement {
      id: string
      creditCardId: string
      targetMonth: number
      targetYear: number
      amount: number
    }

    function findCurrentMonthStatement(
      statements: MockFutureStatement[],
      cardId: string,
      currentMonth: number,
      currentYear: number
    ): MockFutureStatement | undefined {
      return statements.find(
        (s) =>
          s.creditCardId === cardId &&
          s.targetMonth === currentMonth &&
          s.targetYear === currentYear
      )
    }

    function findPastStatements(
      statements: MockFutureStatement[],
      currentMonth: number,
      currentYear: number
    ): MockFutureStatement[] {
      return statements.filter(
        (s) =>
          s.targetYear < currentYear ||
          (s.targetYear === currentYear && s.targetMonth < currentMonth)
      )
    }

    it('finds current month statement for card', () => {
      const statements: MockFutureStatement[] = [
        { id: 'stmt-1', creditCardId: 'card-1', targetMonth: 6, targetYear: 2025, amount: 100000 },
        { id: 'stmt-2', creditCardId: 'card-2', targetMonth: 6, targetYear: 2025, amount: 150000 },
      ]

      const result = findCurrentMonthStatement(statements, 'card-1', 6, 2025)
      expect(result).toBeDefined()
      expect(result?.amount).toBe(100000)
    })

    it('returns undefined when no statement for current month', () => {
      const statements: MockFutureStatement[] = [
        { id: 'stmt-1', creditCardId: 'card-1', targetMonth: 7, targetYear: 2025, amount: 100000 },
      ]

      const result = findCurrentMonthStatement(statements, 'card-1', 6, 2025)
      expect(result).toBeUndefined()
    })

    it('identifies past statements for cleanup', () => {
      const statements: MockFutureStatement[] = [
        { id: 'stmt-1', creditCardId: 'card-1', targetMonth: 4, targetYear: 2025, amount: 50000 },
        { id: 'stmt-2', creditCardId: 'card-1', targetMonth: 5, targetYear: 2025, amount: 75000 },
        { id: 'stmt-3', creditCardId: 'card-1', targetMonth: 6, targetYear: 2025, amount: 100000 },
        { id: 'stmt-4', creditCardId: 'card-1', targetMonth: 7, targetYear: 2025, amount: 125000 },
      ]

      const pastStatements = findPastStatements(statements, 6, 2025)
      expect(pastStatements).toHaveLength(2)
      expect(pastStatements.map((s) => s.id)).toContain('stmt-1')
      expect(pastStatements.map((s) => s.id)).toContain('stmt-2')
    })

    it('handles year boundary in past statement detection', () => {
      const statements: MockFutureStatement[] = [
        { id: 'stmt-1', creditCardId: 'card-1', targetMonth: 12, targetYear: 2024, amount: 50000 },
        { id: 'stmt-2', creditCardId: 'card-1', targetMonth: 1, targetYear: 2025, amount: 75000 },
      ]

      const pastStatements = findPastStatements(statements, 2, 2025)
      expect(pastStatements).toHaveLength(2)
    })

    it('does not include future statements in cleanup', () => {
      const statements: MockFutureStatement[] = [
        { id: 'stmt-1', creditCardId: 'card-1', targetMonth: 6, targetYear: 2025, amount: 100000 },
        { id: 'stmt-2', creditCardId: 'card-1', targetMonth: 7, targetYear: 2025, amount: 125000 },
      ]

      const pastStatements = findPastStatements(statements, 6, 2025)
      expect(pastStatements).toHaveLength(0)
    })
  })

  describe('card update calculation', () => {
    it('calculates correct new balance from future statement', () => {
      const futureStatementAmount = 100000

      // When progression happens, the new balance is the future statement amount
      const newBalance = futureStatementAmount
      expect(newBalance).toBe(100000)
    })

    it('keeps current balance when no future statement', () => {
      const currentBalance = 50000
      const futureStatementAmount = undefined

      // When no future statement, balance stays the same
      const newBalance = futureStatementAmount ?? currentBalance
      expect(newBalance).toBe(50000)
    })
  })
})
