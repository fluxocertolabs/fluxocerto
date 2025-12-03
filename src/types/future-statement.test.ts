/**
 * Future Statement Type Tests
 *
 * Unit tests for future statement schemas, validation, and helper functions.
 */

import { describe, expect, it } from 'vitest'
import {
  FutureStatementInputSchema,
  FutureStatementSchema,
  FutureStatementUpdateSchema,
  getAvailableMonthOptions,
  formatMonthYear,
  isMonthInPast,
  isCurrentMonth,
} from './future-statement'

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('FutureStatementInputSchema', () => {
  it('validates a correct future statement input', () => {
    const input = {
      creditCardId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      targetMonth: 6,
      targetYear: 2025,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty creditCardId', () => {
    const input = {
      creditCardId: '',
      targetMonth: 6,
      targetYear: 2025,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID creditCardId', () => {
    const input = {
      creditCardId: 'card-123', // Not a valid UUID
      targetMonth: 6,
      targetYear: 2025,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects month below 1', () => {
    const input = {
      creditCardId: 'card-123',
      targetMonth: 0,
      targetYear: 2025,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects month above 12', () => {
    const input = {
      creditCardId: 'card-123',
      targetMonth: 13,
      targetYear: 2025,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects year below 2020', () => {
    const input = {
      creditCardId: 'card-123',
      targetMonth: 6,
      targetYear: 2019,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects year above 2100', () => {
    const input = {
      creditCardId: 'card-123',
      targetMonth: 6,
      targetYear: 2101,
      amount: 150000,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const input = {
      creditCardId: 'card-123',
      targetMonth: 6,
      targetYear: 2025,
      amount: -100,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('accepts zero amount', () => {
    const input = {
      creditCardId: '550e8400-e29b-41d4-a716-446655440000',
      targetMonth: 6,
      targetYear: 2025,
      amount: 0,
    }

    const result = FutureStatementInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts boundary month values (1 and 12)', () => {
    const input1 = {
      creditCardId: '550e8400-e29b-41d4-a716-446655440000',
      targetMonth: 1,
      targetYear: 2025,
      amount: 100000,
    }

    const input12 = {
      creditCardId: '550e8400-e29b-41d4-a716-446655440000',
      targetMonth: 12,
      targetYear: 2025,
      amount: 100000,
    }

    expect(FutureStatementInputSchema.safeParse(input1).success).toBe(true)
    expect(FutureStatementInputSchema.safeParse(input12).success).toBe(true)
  })
})

describe('FutureStatementSchema', () => {
  it('validates a complete future statement', () => {
    const statement = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      creditCardId: '550e8400-e29b-41d4-a716-446655440000',
      householdId: '550e8400-e29b-41d4-a716-446655440002',
      targetMonth: 6,
      targetYear: 2025,
      amount: 150000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = FutureStatementSchema.safeParse(statement)
    expect(result.success).toBe(true)
  })

  it('rejects statement without id', () => {
    const statement = {
      creditCardId: '550e8400-e29b-41d4-a716-446655440000',
      householdId: '550e8400-e29b-41d4-a716-446655440002',
      targetMonth: 6,
      targetYear: 2025,
      amount: 150000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = FutureStatementSchema.safeParse(statement)
    expect(result.success).toBe(false)
  })
})

describe('FutureStatementUpdateSchema', () => {
  it('validates partial update with only amount', () => {
    const update = { amount: 200000 }
    const result = FutureStatementUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it('validates partial update with only targetMonth', () => {
    const update = { targetMonth: 8 }
    const result = FutureStatementUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it('validates partial update with only targetYear', () => {
    const update = { targetYear: 2026 }
    const result = FutureStatementUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it('validates empty update (all optional)', () => {
    const update = {}
    const result = FutureStatementUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it('rejects invalid amount in update', () => {
    const update = { amount: -100 }
    const result = FutureStatementUpdateSchema.safeParse(update)
    expect(result.success).toBe(false)
  })

  it('rejects invalid month in update', () => {
    const update = { targetMonth: 15 }
    const result = FutureStatementUpdateSchema.safeParse(update)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('getAvailableMonthOptions', () => {
  it('returns 12 months starting from current month', () => {
    const options = getAvailableMonthOptions()
    expect(options.length).toBe(12)
  })

  it('first option is current month', () => {
    const options = getAvailableMonthOptions()
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    expect(options[0].value.month).toBe(currentMonth)
    expect(options[0].value.year).toBe(currentYear)
  })

  it('handles year rollover correctly', () => {
    const options = getAvailableMonthOptions()
    const now = new Date()
    const currentMonth = now.getMonth() + 1

    // If current month is December (12), next month should be January of next year
    if (currentMonth === 12) {
      expect(options[1].value.month).toBe(1)
      expect(options[1].value.year).toBe(now.getFullYear() + 1)
    }
  })

  it('all options have valid month values (1-12)', () => {
    const options = getAvailableMonthOptions()
    options.forEach((opt) => {
      expect(opt.value.month).toBeGreaterThanOrEqual(1)
      expect(opt.value.month).toBeLessThanOrEqual(12)
    })
  })

  it('options are in chronological order', () => {
    const options = getAvailableMonthOptions()
    for (let i = 1; i < options.length; i++) {
      const prev = options[i - 1]
      const curr = options[i]
      const prevDate = new Date(prev.value.year, prev.value.month - 1)
      const currDate = new Date(curr.value.year, curr.value.month - 1)
      expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime())
    }
  })

  it('each option has a label', () => {
    const options = getAvailableMonthOptions()
    options.forEach((opt) => {
      expect(opt.label).toBeDefined()
      expect(opt.label.length).toBeGreaterThan(0)
    })
  })
})

describe('formatMonthYear', () => {
  it('formats January correctly', () => {
    expect(formatMonthYear(1, 2025)).toBe('Janeiro/2025')
  })

  it('formats December correctly', () => {
    expect(formatMonthYear(12, 2025)).toBe('Dezembro/2025')
  })

  it('formats all months correctly', () => {
    const expectedMonths = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]

    expectedMonths.forEach((monthName, index) => {
      const formatted = formatMonthYear(index + 1, 2025)
      expect(formatted).toBe(`${monthName}/2025`)
    })
  })

  it('handles different years', () => {
    expect(formatMonthYear(6, 2024)).toBe('Junho/2024')
    expect(formatMonthYear(6, 2030)).toBe('Junho/2030')
  })
})

describe('isMonthInPast', () => {
  it('returns true for past months in current year', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    if (currentMonth > 1) {
      expect(isMonthInPast(currentMonth - 1, currentYear)).toBe(true)
    }
  })

  it('returns true for past years', () => {
    const now = new Date()
    const currentYear = now.getFullYear()

    expect(isMonthInPast(12, currentYear - 1)).toBe(true)
    expect(isMonthInPast(1, currentYear - 1)).toBe(true)
  })

  it('returns false for current month', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    expect(isMonthInPast(currentMonth, currentYear)).toBe(false)
  })

  it('returns false for future months in current year', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    if (currentMonth < 12) {
      expect(isMonthInPast(currentMonth + 1, currentYear)).toBe(false)
    }
  })

  it('returns false for future years', () => {
    const now = new Date()
    const currentYear = now.getFullYear()

    expect(isMonthInPast(1, currentYear + 1)).toBe(false)
    expect(isMonthInPast(12, currentYear + 1)).toBe(false)
  })
})

describe('isCurrentMonth', () => {
  it('returns true for current month and year', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    expect(isCurrentMonth(currentMonth, currentYear)).toBe(true)
  })

  it('returns false for past months', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    if (currentMonth > 1) {
      expect(isCurrentMonth(currentMonth - 1, currentYear)).toBe(false)
    }
  })

  it('returns false for future months', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    if (currentMonth < 12) {
      expect(isCurrentMonth(currentMonth + 1, currentYear)).toBe(false)
    }
  })

  it('returns false for different year even if same month', () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    expect(isCurrentMonth(currentMonth, currentYear - 1)).toBe(false)
    expect(isCurrentMonth(currentMonth, currentYear + 1)).toBe(false)
  })
})

