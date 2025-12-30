/**
 * Timezone-aware, date-only helpers.
 *
 * IMPORTANT:
 * - A "date-only" value is represented as a JS Date at local midnight for a
 *   YYYY-MM-DD label derived from the provided IANA timezone.
 * - These helpers are intended for day-level comparisons/arithmetic only.
 */

/**
 * Format a Date into a YYYY-MM-DD string in a specific IANA timezone.
 */
export function formatDateOnlyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to format date-only parts')
  }

  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string into a JS Date at local midnight.
 */
export function parseDateOnly(dateOnly: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly)
  if (!match) {
    throw new Error(`Invalid date-only string: ${dateOnly}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // month is 1-12 in string, 0-11 in Date constructor
  const date = new Date(year, month - 1, day)

  // Validate the date wasn't auto-corrected (e.g., Feb 30 -> Mar 2)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date-only string: ${dateOnly}`)
  }

  return date
}

/**
 * Convert any Date (timestamp) into a date-only Date for the given timezone.
 */
export function toDateOnlyInTimeZone(date: Date, timeZone: string): Date {
  return parseDateOnly(formatDateOnlyInTimeZone(date, timeZone))
}

/**
 * Get "today" as a date-only Date for the given timezone.
 *
 * Accepts an optional `now` for deterministic testing.
 */
export function getTodayDateOnlyInTimeZone(timeZone: string, now: Date = new Date()): Date {
  return toDateOnlyInTimeZone(now, timeZone)
}


