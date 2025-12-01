/**
 * Staleness Detection Tests
 *
 * Tests for staleness detection utilities used to determine if financial data needs updating.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { isStale, getDaysSinceUpdate, STALE_THRESHOLD_DAYS } from './staleness'

// =============================================================================
// isStale TESTS
// =============================================================================

describe('isStale', () => {
  beforeEach(() => {
    // Mock current date to 2025-01-31 for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 31)) // January 31, 2025
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undefined/null handling', () => {
    it('returns true for undefined updatedAt', () => {
      expect(isStale(undefined)).toBe(true)
    })
  })

  describe('threshold detection', () => {
    it('returns false for data updated today', () => {
      const today = new Date(2025, 0, 31)
      expect(isStale(today)).toBe(false)
    })

    it('returns false for data updated yesterday', () => {
      const yesterday = new Date(2025, 0, 30)
      expect(isStale(yesterday)).toBe(false)
    })

    it('returns false for data updated exactly at threshold', () => {
      // 30 days ago from Jan 31 is Jan 1
      const exactThreshold = new Date(2025, 0, 1)
      expect(isStale(exactThreshold)).toBe(false)
    })

    it('returns true for data updated just over threshold', () => {
      // 31 days ago from Jan 31 is Dec 31, 2024
      const justOverThreshold = new Date(2024, 11, 31)
      expect(isStale(justOverThreshold)).toBe(true)
    })

    it('returns true for very old data', () => {
      const veryOld = new Date(2020, 0, 1)
      expect(isStale(veryOld)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('returns false for data updated 29 days ago', () => {
      const twentyNineDaysAgo = new Date(2025, 0, 2) // Jan 2
      expect(isStale(twentyNineDaysAgo)).toBe(false)
    })

    it('handles future dates (should not be stale)', () => {
      const futureDate = new Date(2025, 1, 15) // Feb 15
      expect(isStale(futureDate)).toBe(false)
    })
  })
})

// =============================================================================
// getDaysSinceUpdate TESTS
// =============================================================================

describe('getDaysSinceUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 31)) // January 31, 2025
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undefined/null handling', () => {
    it('returns null for undefined updatedAt', () => {
      expect(getDaysSinceUpdate(undefined)).toBe(null)
    })
  })

  describe('day calculation', () => {
    it('returns 0 for data updated today', () => {
      const today = new Date(2025, 0, 31)
      expect(getDaysSinceUpdate(today)).toBe(0)
    })

    it('returns 1 for data updated yesterday', () => {
      const yesterday = new Date(2025, 0, 30)
      expect(getDaysSinceUpdate(yesterday)).toBe(1)
    })

    it('returns 7 for data updated one week ago', () => {
      const oneWeekAgo = new Date(2025, 0, 24)
      expect(getDaysSinceUpdate(oneWeekAgo)).toBe(7)
    })

    it('returns 30 for data updated at threshold', () => {
      const thirtyDaysAgo = new Date(2025, 0, 1)
      expect(getDaysSinceUpdate(thirtyDaysAgo)).toBe(30)
    })

    it('returns 31 for data updated just over threshold', () => {
      const thirtyOneDaysAgo = new Date(2024, 11, 31)
      expect(getDaysSinceUpdate(thirtyOneDaysAgo)).toBe(31)
    })
  })

  describe('edge cases', () => {
    it('handles large day differences', () => {
      const yearAgo = new Date(2024, 0, 31)
      expect(getDaysSinceUpdate(yearAgo)).toBe(366) // 2024 is a leap year (366 days)
    })

    it('returns negative for future dates (past midnight)', () => {
      const tomorrow = new Date(2025, 1, 1)
      const result = getDaysSinceUpdate(tomorrow)
      expect(result).toBeLessThan(0)
    })

    it('floors partial days', () => {
      // Test that time of day doesn't affect day count
      // 30 days ago at 23:59:59 should still be 30 days
      const almostThirtyOneDays = new Date(2025, 0, 1, 0, 0, 1) // Jan 1 at 00:00:01
      expect(getDaysSinceUpdate(almostThirtyOneDays)).toBe(29) // Not quite 30 full days
    })
  })
})

// =============================================================================
// STALE_THRESHOLD_DAYS CONSTANT TEST
// =============================================================================

describe('STALE_THRESHOLD_DAYS', () => {
  it('is set to 30 days', () => {
    expect(STALE_THRESHOLD_DAYS).toBe(30)
  })
})

