/**
 * Payment Frequency Handlers
 *
 * Pure functions for determining if a payment is due on a specific date
 * based on different frequency types (monthly, biweekly, weekly).
 */

import { getDate, getDaysInMonth, getISODay } from 'date-fns'

// =============================================================================
// MONTH-END HANDLING
// =============================================================================

/**
 * Get the effective payment day for a given month.
 * Handles month-end edge cases (e.g., day 31 in February → last day of February).
 *
 * @param paymentDay - The configured payment day (1-31)
 * @param date - The date to check against
 * @returns The effective day in the month (adjusted for month length)
 */
export function getEffectiveDay(paymentDay: number, date: Date): number {
  const daysInMonth = getDaysInMonth(date)
  return Math.min(paymentDay, daysInMonth)
}

// =============================================================================
// MONTHLY FREQUENCY
// =============================================================================

/**
 * Check if a monthly payment is due on a specific date.
 * Handles month-end edge cases automatically.
 *
 * @param date - The date to check
 * @param paymentDay - The configured payment day (1-31)
 * @returns True if payment is due on this date
 */
export function isMonthlyPaymentDue(date: Date, paymentDay: number): boolean {
  const effectiveDay = getEffectiveDay(paymentDay, date)
  const currentDay = getDate(date)
  return currentDay === effectiveDay
}

// =============================================================================
// BIWEEKLY FREQUENCY
// =============================================================================

/**
 * Check if a biweekly payment is due on a specific date.
 * Payment occurs every 14 days from the first occurrence in the projection period.
 *
 * First occurrence is determined by finding when the payment day first matches
 * within the projection, then subsequent payments are every 14 days.
 *
 * @param date - The date to check
 * @param dayOffset - Days since projection start (0-indexed)
 * @param paymentDay - The configured payment day (1-31)
 * @param sourceId - Unique identifier for the payment source
 * @param firstOccurrences - Map tracking first occurrence per source
 * @returns True if payment is due on this date
 */
export function isBiweeklyPaymentDue(
  date: Date,
  dayOffset: number,
  paymentDay: number,
  sourceId: string,
  firstOccurrences: Map<string, number>
): boolean {
  const effectiveDay = getEffectiveDay(paymentDay, date)
  const currentDay = getDate(date)

  // Check if this is the first occurrence
  if (!firstOccurrences.has(sourceId)) {
    // First occurrence is when payment day matches
    if (currentDay === effectiveDay) {
      firstOccurrences.set(sourceId, dayOffset)
      return true
    }
    return false
  }

  // Check if 14 days have passed since first occurrence (or multiple of 14)
  const firstOccurrence = firstOccurrences.get(sourceId)!
  const daysSinceFirst = dayOffset - firstOccurrence

  return daysSinceFirst > 0 && daysSinceFirst % 14 === 0
}

// =============================================================================
// WEEKLY FREQUENCY
// =============================================================================

/**
 * Check if a weekly payment is due on a specific date.
 * Payment occurs every 7 days from the first occurrence in the projection period.
 *
 * First occurrence is determined by finding when the payment day first matches
 * within the projection, then subsequent payments are every 7 days.
 *
 * @param date - The date to check
 * @param dayOffset - Days since projection start (0-indexed)
 * @param paymentDay - The configured payment day (1-31)
 * @param sourceId - Unique identifier for the payment source
 * @param firstOccurrences - Map tracking first occurrence per source
 * @returns True if payment is due on this date
 */
export function isWeeklyPaymentDue(
  date: Date,
  dayOffset: number,
  paymentDay: number,
  sourceId: string,
  firstOccurrences: Map<string, number>
): boolean {
  const effectiveDay = getEffectiveDay(paymentDay, date)
  const currentDay = getDate(date)

  // Check if this is the first occurrence
  if (!firstOccurrences.has(sourceId)) {
    // First occurrence is when payment day matches
    if (currentDay === effectiveDay) {
      firstOccurrences.set(sourceId, dayOffset)
      return true
    }
    return false
  }

  // Check if 7 days have passed since first occurrence (or multiple of 7)
  const firstOccurrence = firstOccurrences.get(sourceId)!
  const daysSinceFirst = dayOffset - firstOccurrence

  return daysSinceFirst > 0 && daysSinceFirst % 7 === 0
}

// =============================================================================
// DAY-OF-WEEK FREQUENCY (FOR FLEXIBLE PAYMENT SCHEDULE)
// =============================================================================

/**
 * Check if a payment is due on a specific day of week.
 * Used for weekly and biweekly frequencies with the new PaymentSchedule system.
 *
 * @param date - The date to check
 * @param dayOfWeek - The configured day of week (1-7, ISO 8601: 1=Monday, 7=Sunday)
 * @returns True if the date falls on the specified day of week
 */
export function isDayOfWeekPaymentDue(date: Date, dayOfWeek: number): boolean {
  return getISODay(date) === dayOfWeek
}

// =============================================================================
// TWICE-MONTHLY FREQUENCY
// =============================================================================

/**
 * Check if a twice-monthly payment is due on a specific date.
 * Payment occurs on two fixed days each month.
 * Handles month-end edge cases (e.g., day 31 in February → last day of February).
 *
 * @param date - The date to check
 * @param firstDay - The first payment day of month (1-31)
 * @param secondDay - The second payment day of month (1-31)
 * @returns True if payment is due on this date
 */
export function isTwiceMonthlyPaymentDue(
  date: Date,
  firstDay: number,
  secondDay: number
): boolean {
  const currentDay = getDate(date)
  const effectiveFirstDay = getEffectiveDay(firstDay, date)
  const effectiveSecondDay = getEffectiveDay(secondDay, date)
  return currentDay === effectiveFirstDay || currentDay === effectiveSecondDay
}

