/**
 * Component Format Utilities Tests
 *
 * Tests for currency formatting, relative time, and staleness detection
 * used in manage components.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { formatCurrency, formatRelativeTime, isStale, getBalanceFreshness } from './format-utils'

/**
 * Normalize spaces in currency strings for comparison.
 * Intl.NumberFormat uses non-breaking spaces (U+00A0) which differ from regular spaces.
 */
function normalizeSpaces(str: string): string {
  return str.replace(/\u00A0/g, ' ')
}

// =============================================================================
// formatCurrency TESTS
// =============================================================================

describe('formatCurrency', () => {
  it('formats zero correctly', () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe('R$ 0,00')
  })

  it('formats small amounts correctly', () => {
    expect(normalizeSpaces(formatCurrency(100))).toBe('R$ 1,00')
    expect(normalizeSpaces(formatCurrency(1000))).toBe('R$ 10,00')
  })

  it('formats amounts with cents', () => {
    expect(normalizeSpaces(formatCurrency(123))).toBe('R$ 1,23')
    expect(normalizeSpaces(formatCurrency(12345))).toBe('R$ 123,45')
    expect(normalizeSpaces(formatCurrency(999999))).toBe('R$ 9.999,99')
  })

  it('handles negative values', () => {
    expect(normalizeSpaces(formatCurrency(-100))).toBe('-R$ 1,00')
    expect(normalizeSpaces(formatCurrency(-12345))).toBe('-R$ 123,45')
  })

  it('handles large values', () => {
    expect(normalizeSpaces(formatCurrency(100000000))).toBe('R$ 1.000.000,00')
  })
})

// =============================================================================
// formatRelativeTime TESTS
// =============================================================================

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 31, 12, 0, 0)) // January 31, 2025 at noon
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undefined/null handling', () => {
    it('returns "Nunca atualizado" for undefined', () => {
      expect(formatRelativeTime(undefined)).toBe('Nunca atualizado')
    })
  })

  describe('today', () => {
    it('returns "Hoje" for same day', () => {
      const today = new Date(2025, 0, 31, 10, 0, 0) // Earlier today
      expect(formatRelativeTime(today)).toBe('Hoje')
    })

    it('returns "Hoje" for midnight today', () => {
      const midnight = new Date(2025, 0, 31, 0, 0, 0)
      expect(formatRelativeTime(midnight)).toBe('Hoje')
    })
  })

  describe('yesterday', () => {
    it('returns "Ontem" for one day ago', () => {
      const yesterday = new Date(2025, 0, 30, 12, 0, 0)
      expect(formatRelativeTime(yesterday)).toBe('Ontem')
    })
  })

  describe('days (2-6)', () => {
    it('returns "Há 2 dias" for 2 days ago', () => {
      const twoDaysAgo = new Date(2025, 0, 29, 12, 0, 0)
      expect(formatRelativeTime(twoDaysAgo)).toBe('Há 2 dias')
    })

    it('returns "Há 6 dias" for 6 days ago', () => {
      const sixDaysAgo = new Date(2025, 0, 25, 12, 0, 0)
      expect(formatRelativeTime(sixDaysAgo)).toBe('Há 6 dias')
    })
  })

  describe('weeks', () => {
    it('returns "Há 1 semana" for 7 days ago', () => {
      const oneWeekAgo = new Date(2025, 0, 24, 12, 0, 0)
      expect(formatRelativeTime(oneWeekAgo)).toBe('Há 1 semana')
    })

    it('returns "Há 2 semanas" for 14 days ago', () => {
      const twoWeeksAgo = new Date(2025, 0, 17, 12, 0, 0)
      expect(formatRelativeTime(twoWeeksAgo)).toBe('Há 2 semanas')
    })

    it('returns "Há 4 semanas" for 28 days ago', () => {
      const fourWeeksAgo = new Date(2025, 0, 3, 12, 0, 0)
      expect(formatRelativeTime(fourWeeksAgo)).toBe('Há 4 semanas')
    })
  })

  describe('months', () => {
    it('returns "Há 1 mês" for 30 days ago', () => {
      const oneMonthAgo = new Date(2025, 0, 1, 12, 0, 0)
      expect(formatRelativeTime(oneMonthAgo)).toBe('Há 1 mês')
    })

    it('returns "Há 2 mêses" for 60 days ago', () => {
      const twoMonthsAgo = new Date(2024, 11, 2, 12, 0, 0) // Dec 2, 2024
      expect(formatRelativeTime(twoMonthsAgo)).toBe('Há 2 mêses')
    })

    it('returns "Há 12 mêses" for about a year ago', () => {
      const yearAgo = new Date(2024, 0, 31, 12, 0, 0) // Jan 31, 2024
      expect(formatRelativeTime(yearAgo)).toBe('Há 12 mêses')
    })
  })
})

// =============================================================================
// isStale TESTS (7-day threshold for components)
// =============================================================================

describe('isStale', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 31)) // January 31, 2025
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undefined/null handling', () => {
    it('returns true for undefined', () => {
      expect(isStale(undefined)).toBe(true)
    })
  })

  describe('threshold detection (7 days)', () => {
    it('returns false for data updated today', () => {
      const today = new Date(2025, 0, 31)
      expect(isStale(today)).toBe(false)
    })

    it('returns false for data updated 7 days ago', () => {
      const sevenDaysAgo = new Date(2025, 0, 24)
      expect(isStale(sevenDaysAgo)).toBe(false)
    })

    it('returns true for data updated 8 days ago', () => {
      const eightDaysAgo = new Date(2025, 0, 23)
      expect(isStale(eightDaysAgo)).toBe(true)
    })

    it('returns true for very old data', () => {
      const veryOld = new Date(2020, 0, 1)
      expect(isStale(veryOld)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('returns false for future dates', () => {
      const future = new Date(2025, 1, 15)
      expect(isStale(future)).toBe(false)
    })

    it('returns false for data updated 6 days ago', () => {
      const sixDaysAgo = new Date(2025, 0, 25)
      expect(isStale(sixDaysAgo)).toBe(false)
    })
  })
})

// =============================================================================
// getBalanceFreshness TESTS (tri-state freshness indicator)
// =============================================================================

describe('getBalanceFreshness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 31, 12, 0, 0)) // January 31, 2025 at noon
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undefined/null handling', () => {
    it('returns "stale" for undefined', () => {
      expect(getBalanceFreshness(undefined)).toBe('stale')
    })
  })

  describe('fresh (today/yesterday)', () => {
    it('returns "fresh" for data updated today', () => {
      const today = new Date(2025, 0, 31, 10, 0, 0)
      expect(getBalanceFreshness(today)).toBe('fresh')
    })

    it('returns "fresh" for data updated at midnight today', () => {
      const midnight = new Date(2025, 0, 31, 0, 0, 0)
      expect(getBalanceFreshness(midnight)).toBe('fresh')
    })

    it('returns "fresh" for data updated yesterday', () => {
      const yesterday = new Date(2025, 0, 30, 12, 0, 0)
      expect(getBalanceFreshness(yesterday)).toBe('fresh')
    })

    it('returns "fresh" for data updated 1 day ago', () => {
      const oneDayAgo = new Date(2025, 0, 30, 12, 0, 0)
      expect(getBalanceFreshness(oneDayAgo)).toBe('fresh')
    })
  })

  describe('warning (2-7 days)', () => {
    it('returns "warning" for data updated 2 days ago', () => {
      const twoDaysAgo = new Date(2025, 0, 29, 12, 0, 0)
      expect(getBalanceFreshness(twoDaysAgo)).toBe('warning')
    })

    it('returns "warning" for data updated 5 days ago', () => {
      const fiveDaysAgo = new Date(2025, 0, 26, 12, 0, 0)
      expect(getBalanceFreshness(fiveDaysAgo)).toBe('warning')
    })

    it('returns "warning" for data updated 7 days ago', () => {
      const sevenDaysAgo = new Date(2025, 0, 24, 12, 0, 0)
      expect(getBalanceFreshness(sevenDaysAgo)).toBe('warning')
    })
  })

  describe('stale (>7 days)', () => {
    it('returns "stale" for data updated 8 days ago', () => {
      const eightDaysAgo = new Date(2025, 0, 23, 12, 0, 0)
      expect(getBalanceFreshness(eightDaysAgo)).toBe('stale')
    })

    it('returns "stale" for data updated 14 days ago', () => {
      const twoWeeksAgo = new Date(2025, 0, 17, 12, 0, 0)
      expect(getBalanceFreshness(twoWeeksAgo)).toBe('stale')
    })

    it('returns "stale" for very old data', () => {
      const veryOld = new Date(2020, 0, 1)
      expect(getBalanceFreshness(veryOld)).toBe('stale')
    })
  })

  describe('edge cases', () => {
    it('returns "fresh" for future dates', () => {
      const future = new Date(2025, 1, 15)
      expect(getBalanceFreshness(future)).toBe('fresh')
    })

    it('boundary: 1 day returns fresh, 2 days returns warning', () => {
      // Exactly at 1 day boundary
      const oneDayExact = new Date(2025, 0, 30, 12, 0, 0)
      expect(getBalanceFreshness(oneDayExact)).toBe('fresh')

      // Just past 1 day (2 days)
      const twoDays = new Date(2025, 0, 29, 12, 0, 0)
      expect(getBalanceFreshness(twoDays)).toBe('warning')
    })

    it('boundary: 7 days returns warning, 8 days returns stale', () => {
      // Exactly at 7 day boundary
      const sevenDays = new Date(2025, 0, 24, 12, 0, 0)
      expect(getBalanceFreshness(sevenDays)).toBe('warning')

      // Just past 7 days (8 days)
      const eightDays = new Date(2025, 0, 23, 12, 0, 0)
      expect(getBalanceFreshness(eightDays)).toBe('stale')
    })
  })
})

