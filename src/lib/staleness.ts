/**
 * Staleness detection utilities.
 * Used to determine if financial data is outdated and needs updating.
 */

/** Number of days after which data is considered stale */
export const STALE_THRESHOLD_DAYS = 30

/**
 * Check if a timestamp is stale (older than threshold).
 * @param updatedAt - The timestamp to check (undefined = stale)
 * @returns true if stale, false otherwise
 */
export function isStale(updatedAt: Date | undefined): boolean {
  if (!updatedAt) return true // Legacy data without timestamp is stale

  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() - STALE_THRESHOLD_DAYS)

  return updatedAt < thresholdDate
}

/**
 * Get the number of days since the last update.
 * @param updatedAt - The timestamp to check
 * @returns Number of days since update, or null if no timestamp
 */
export function getDaysSinceUpdate(updatedAt: Date | undefined): number | null {
  if (!updatedAt) return null

  const now = new Date()
  const diffMs = now.getTime() - updatedAt.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

