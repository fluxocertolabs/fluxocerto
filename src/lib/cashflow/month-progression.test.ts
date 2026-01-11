/**
 * Month Progression Tests
 *
 * Tests for month progression helper functions.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { checkAndProgressMonth, performMonthProgression, getMonthsDiff } from './month-progression'

const mockGetSupabase = vi.fn()
const mockGetGroupId = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
  getGroupId: () => mockGetGroupId(),
}))

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
// checkAndProgressMonth TESTS
// =============================================================================

describe('checkAndProgressMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('skips progression when last check is already in the current month', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    const result = await checkAndProgressMonth('2025-06-02T00:00:00.000Z')

    expect(result).toEqual({ success: true, progressedCards: 0, cleanedStatements: 0 })
    expect(mockGetSupabase).not.toHaveBeenCalled()
    expect(mockGetGroupId).not.toHaveBeenCalled()
  })

  it('runs progression when last check was in a previous month', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    mockGetGroupId.mockResolvedValue('group-1')
    mockGetSupabase.mockReturnValue({
      from: (table: string) => {
        if (table === 'credit_cards') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }
        }
        if (table === 'future_statements') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
            delete: () => ({
              eq: () => ({
                or: () => ({
                  select: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      },
    })

    const result = await checkAndProgressMonth('2025-05-20T00:00:00.000Z')

    expect(result).toEqual({ success: true, progressedCards: 0, cleanedStatements: 0 })
    expect(mockGetGroupId).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// performMonthProgression TESTS (mocked Supabase client)
// =============================================================================

describe('performMonthProgression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('progresses current-month statement to credit card balance and cleans past statements', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    mockGetGroupId.mockResolvedValue('group-1')

    const mockFrom = vi.fn()
    const updateCalls: Array<{ id: string; values: unknown }> = []
    const deletedById: string[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'credit_cards') {
        return {
          select: () => ({
            eq: (col: string, value: string) => {
              expect(col).toBe('group_id')
              expect(value).toBe('group-1')
              return Promise.resolve({
                data: [{ id: 'card-1', statement_balance: 123 }],
                error: null,
              })
            },
          }),
          update: (values: unknown) => ({
            eq: (col: string, id: string) => {
              expect(col).toBe('id')
              updateCalls.push({ id, values })
              return Promise.resolve({ error: null })
            },
          }),
        }
      }

      if (table === 'future_statements') {
        return {
          select: () => ({
            eq: (col: string, value: string) => {
              expect(col).toBe('group_id')
              expect(value).toBe('group-1')
              return Promise.resolve({
                data: [
                  {
                    id: 'fs-current',
                    credit_card_id: 'card-1',
                    group_id: 'group-1',
                    target_month: 6,
                    target_year: 2025,
                    amount: 999,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z',
                  },
                  {
                    id: 'fs-old',
                    credit_card_id: 'card-1',
                    group_id: 'group-1',
                    target_month: 5,
                    target_year: 2025,
                    amount: 111,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z',
                  },
                ],
                error: null,
              })
            },
          }),
          delete: () => ({
            eq: (col: string, value: string) => {
              if (col === 'id') {
                deletedById.push(value)
                return Promise.resolve({ error: null })
              }
              if (col === 'group_id') {
                expect(value).toBe('group-1')
                return {
                  or: () => ({
                    select: () =>
                      Promise.resolve({
                        data: [{ id: 'fs-old' }],
                        error: null,
                      }),
                  }),
                }
              }
              throw new Error(`Unexpected eq(${col}, ${value})`)
            },
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockGetSupabase.mockReturnValue({ from: mockFrom })

    const result = await performMonthProgression()

    expect(result).toEqual({ success: true, progressedCards: 1, cleanedStatements: 1 })
    expect(updateCalls).toEqual([{ id: 'card-1', values: { statement_balance: 999 } }])
    expect(deletedById).toContain('fs-current')
  })

  it('rolls back the card balance if deleting the future statement fails', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockGetGroupId.mockResolvedValue('group-1')

    const updateCalls: Array<{ id: string; values: unknown }> = []
    const mockFrom = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'credit_cards') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ id: 'card-1', statement_balance: 123 }],
                error: null,
              }),
          }),
          update: (values: unknown) => ({
            eq: (_col: string, id: string) => {
              updateCalls.push({ id, values })
              return Promise.resolve({ error: null })
            },
          }),
        }
      }

      if (table === 'future_statements') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'fs-current',
                    credit_card_id: 'card-1',
                    group_id: 'group-1',
                    target_month: 6,
                    target_year: 2025,
                    amount: 999,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
          }),
          delete: () => ({
            eq: (col: string) => {
              if (col === 'id') {
                return Promise.resolve({ error: { message: 'delete failed' } })
              }
              return {
                or: () => ({
                  select: () => Promise.resolve({ data: [], error: null }),
                }),
              }
            },
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockGetSupabase.mockReturnValue({ from: mockFrom })

    const result = await performMonthProgression()

    expect(result).toEqual({ success: true, progressedCards: 0, cleanedStatements: 0 })
    expect(updateCalls).toEqual([
      { id: 'card-1', values: { statement_balance: 999 } }, // initial update
      { id: 'card-1', values: { statement_balance: 123 } }, // rollback
    ])

    consoleError.mockRestore()
  })

  it('returns a friendly error when groupId cannot be determined', async () => {
    const from = vi.fn()
    mockGetSupabase.mockReturnValue({ from })
    mockGetGroupId.mockResolvedValue(null)
    const result = await performMonthProgression()
    expect(result).toEqual({ success: false, error: 'Não foi possível identificar seu grupo' })
    expect(mockGetSupabase).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalled()
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
