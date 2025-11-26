/**
 * Payment Frequency Handler Tests
 *
 * Tests for monthly, biweekly, and weekly payment frequency calculations,
 * including month-end edge cases.
 */

import { describe, expect, it } from 'vitest'
import {
  getEffectiveDay,
  isMonthlyPaymentDue,
  isBiweeklyPaymentDue,
  isWeeklyPaymentDue,
} from './frequencies'

// Helper to create dates in local timezone to avoid UTC offset issues
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day) // month is 0-indexed
}

// =============================================================================
// MONTH-END HANDLING TESTS (US5)
// =============================================================================

describe('getEffectiveDay', () => {
  it('returns payment day when within month length', () => {
    const date = localDate(2025, 1, 15) // January has 31 days
    expect(getEffectiveDay(15, date)).toBe(15)
  })

  it('returns last day of month when payment day exceeds month length', () => {
    const february = localDate(2025, 2, 15) // February 2025 has 28 days
    expect(getEffectiveDay(31, february)).toBe(28)
    expect(getEffectiveDay(30, february)).toBe(28)
    expect(getEffectiveDay(29, february)).toBe(28)
  })

  it('handles leap year February correctly', () => {
    const leapFebruary = localDate(2024, 2, 15) // 2024 is a leap year
    expect(getEffectiveDay(31, leapFebruary)).toBe(29)
    expect(getEffectiveDay(30, leapFebruary)).toBe(29)
    expect(getEffectiveDay(29, leapFebruary)).toBe(29)
    expect(getEffectiveDay(28, leapFebruary)).toBe(28)
  })

  it('handles 30-day months correctly', () => {
    const april = localDate(2025, 4, 15) // April has 30 days
    expect(getEffectiveDay(31, april)).toBe(30)
    expect(getEffectiveDay(30, april)).toBe(30)
    expect(getEffectiveDay(15, april)).toBe(15)
  })

  it('handles 31-day months correctly', () => {
    const january = localDate(2025, 1, 15) // January has 31 days
    expect(getEffectiveDay(31, january)).toBe(31)
    expect(getEffectiveDay(15, january)).toBe(15)
  })
})

// =============================================================================
// MONTHLY FREQUENCY TESTS
// =============================================================================

describe('isMonthlyPaymentDue', () => {
  it('returns true when day matches payment day', () => {
    const date = localDate(2025, 1, 15)
    expect(isMonthlyPaymentDue(date, 15)).toBe(true)
  })

  it('returns false when day does not match', () => {
    const date = localDate(2025, 1, 15)
    expect(isMonthlyPaymentDue(date, 10)).toBe(false)
    expect(isMonthlyPaymentDue(date, 20)).toBe(false)
  })

  it('handles first day of month', () => {
    const date = localDate(2025, 1, 1)
    expect(isMonthlyPaymentDue(date, 1)).toBe(true)
    expect(isMonthlyPaymentDue(date, 2)).toBe(false)
  })

  it('handles last day of month', () => {
    const date = localDate(2025, 1, 31)
    expect(isMonthlyPaymentDue(date, 31)).toBe(true)
  })

  it('handles month-end edge case (day 31 in February)', () => {
    const febLast = localDate(2025, 2, 28)
    expect(isMonthlyPaymentDue(febLast, 31)).toBe(true) // Effective day is 28
    expect(isMonthlyPaymentDue(febLast, 30)).toBe(true) // Effective day is 28
    expect(isMonthlyPaymentDue(febLast, 29)).toBe(true) // Effective day is 28
    expect(isMonthlyPaymentDue(febLast, 28)).toBe(true)
  })

  it('handles leap year February 29', () => {
    const leapFeb29 = localDate(2024, 2, 29)
    expect(isMonthlyPaymentDue(leapFeb29, 31)).toBe(true) // Effective day is 29
    expect(isMonthlyPaymentDue(leapFeb29, 30)).toBe(true) // Effective day is 29
    expect(isMonthlyPaymentDue(leapFeb29, 29)).toBe(true)
    expect(isMonthlyPaymentDue(leapFeb29, 28)).toBe(false)
  })
})

// =============================================================================
// BIWEEKLY FREQUENCY TESTS
// =============================================================================

describe('isBiweeklyPaymentDue', () => {
  it('triggers on first occurrence when payment day matches', () => {
    const firstOccurrences = new Map<string, number>()
    const date = localDate(2025, 1, 15)

    expect(isBiweeklyPaymentDue(date, 14, 15, 'project-1', firstOccurrences)).toBe(true)
    expect(firstOccurrences.get('project-1')).toBe(14)
  })

  it('does not trigger before first occurrence', () => {
    const firstOccurrences = new Map<string, number>()
    const date = localDate(2025, 1, 10)

    expect(isBiweeklyPaymentDue(date, 9, 15, 'project-1', firstOccurrences)).toBe(false)
  })

  it('triggers every 14 days after first occurrence', () => {
    const firstOccurrences = new Map<string, number>()
    firstOccurrences.set('project-1', 0) // First occurrence on day 0

    // Day 14 should trigger (14 days after day 0)
    expect(isBiweeklyPaymentDue(localDate(2025, 1, 15), 14, 1, 'project-1', firstOccurrences)).toBe(true)

    // Day 28 should trigger (28 days after day 0)
    expect(isBiweeklyPaymentDue(localDate(2025, 1, 29), 28, 1, 'project-1', firstOccurrences)).toBe(true)

    // Day 7 should not trigger (only 7 days after day 0)
    expect(isBiweeklyPaymentDue(localDate(2025, 1, 8), 7, 1, 'project-1', firstOccurrences)).toBe(false)
  })

  it('does not trigger on non-14-day intervals', () => {
    const firstOccurrences = new Map<string, number>()
    firstOccurrences.set('project-1', 0)

    // Day 10 should not trigger
    expect(isBiweeklyPaymentDue(localDate(2025, 1, 11), 10, 1, 'project-1', firstOccurrences)).toBe(false)

    // Day 21 should not trigger
    expect(isBiweeklyPaymentDue(localDate(2025, 1, 22), 21, 1, 'project-1', firstOccurrences)).toBe(false)
  })

  it('tracks separate first occurrences per source', () => {
    const firstOccurrences = new Map<string, number>()

    // Project 1 first occurrence on day 5 (Jan 6th, day 6 of month)
    const date1 = localDate(2025, 1, 6)
    isBiweeklyPaymentDue(date1, 5, 6, 'project-1', firstOccurrences)

    // Project 2 first occurrence on day 10 (Jan 11th, day 11 of month)
    const date2 = localDate(2025, 1, 11)
    isBiweeklyPaymentDue(date2, 10, 11, 'project-2', firstOccurrences)

    expect(firstOccurrences.get('project-1')).toBe(5)
    expect(firstOccurrences.get('project-2')).toBe(10)
  })
})

// =============================================================================
// WEEKLY FREQUENCY TESTS
// =============================================================================

describe('isWeeklyPaymentDue', () => {
  it('triggers on first occurrence when payment day matches', () => {
    const firstOccurrences = new Map<string, number>()
    const date = localDate(2025, 1, 15)

    expect(isWeeklyPaymentDue(date, 14, 15, 'project-1', firstOccurrences)).toBe(true)
    expect(firstOccurrences.get('project-1')).toBe(14)
  })

  it('does not trigger before first occurrence', () => {
    const firstOccurrences = new Map<string, number>()
    const date = localDate(2025, 1, 10)

    expect(isWeeklyPaymentDue(date, 9, 15, 'project-1', firstOccurrences)).toBe(false)
  })

  it('triggers every 7 days after first occurrence', () => {
    const firstOccurrences = new Map<string, number>()
    firstOccurrences.set('project-1', 0) // First occurrence on day 0

    // Day 7 should trigger
    expect(isWeeklyPaymentDue(localDate(2025, 1, 8), 7, 1, 'project-1', firstOccurrences)).toBe(true)

    // Day 14 should trigger
    expect(isWeeklyPaymentDue(localDate(2025, 1, 15), 14, 1, 'project-1', firstOccurrences)).toBe(true)

    // Day 21 should trigger
    expect(isWeeklyPaymentDue(localDate(2025, 1, 22), 21, 1, 'project-1', firstOccurrences)).toBe(true)
  })

  it('does not trigger on non-7-day intervals', () => {
    const firstOccurrences = new Map<string, number>()
    firstOccurrences.set('project-1', 0)

    // Day 5 should not trigger
    expect(isWeeklyPaymentDue(localDate(2025, 1, 6), 5, 1, 'project-1', firstOccurrences)).toBe(false)

    // Day 10 should not trigger
    expect(isWeeklyPaymentDue(localDate(2025, 1, 11), 10, 1, 'project-1', firstOccurrences)).toBe(false)
  })

  it('tracks separate first occurrences per source', () => {
    const firstOccurrences = new Map<string, number>()

    // Project 1 first occurrence on day 3 (Jan 4th, day 4 of month)
    const date1 = localDate(2025, 1, 4)
    isWeeklyPaymentDue(date1, 3, 4, 'project-1', firstOccurrences)

    // Project 2 first occurrence on day 5 (Jan 6th, day 6 of month)
    const date2 = localDate(2025, 1, 6)
    isWeeklyPaymentDue(date2, 5, 6, 'project-2', firstOccurrences)

    expect(firstOccurrences.get('project-1')).toBe(3)
    expect(firstOccurrences.get('project-2')).toBe(5)
  })
})

// =============================================================================
// INTEGRATION TESTS - FREQUENCY WITH MONTH-END
// =============================================================================

describe('frequency handlers with month-end edge cases', () => {
  it('monthly payment on day 31 triggers on Feb 28 (non-leap year)', () => {
    const feb28 = localDate(2025, 2, 28)
    expect(isMonthlyPaymentDue(feb28, 31)).toBe(true)
  })

  it('monthly payment on day 31 triggers on Feb 29 (leap year)', () => {
    const feb29 = localDate(2024, 2, 29)
    expect(isMonthlyPaymentDue(feb29, 31)).toBe(true)
  })

  it('monthly payment on day 30 triggers on Feb 28 (non-leap year)', () => {
    const feb28 = localDate(2025, 2, 28)
    expect(isMonthlyPaymentDue(feb28, 30)).toBe(true)
  })

  it('monthly payment on day 31 triggers on April 30', () => {
    const apr30 = localDate(2025, 4, 30)
    expect(isMonthlyPaymentDue(apr30, 31)).toBe(true)
  })
})

