/**
 * Format a number in cents to Brazilian Real currency format.
 */
export function formatCurrency(cents: number): string {
  const reais = cents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(reais)
}

/**
 * Format a date as a relative time string in Portuguese.
 */
export function formatRelativeTime(date: Date | undefined): string {
  if (!date) return 'Nunca atualizado'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `Há ${diffDays} dias`
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
  return `Há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`
}

/**
 * Check if a balance update date is considered stale (more than 7 days old).
 */
export function isStale(date: Date | undefined): boolean {
  if (!date) return true
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays > 7
}

/**
 * Balance freshness levels for UI indicators.
 * - 'fresh': Updated today or yesterday (green indicator)
 * - 'warning': Updated 2-7 days ago (yellow indicator)
 * - 'stale': Updated more than 7 days ago or never (red indicator)
 */
export type BalanceFreshness = 'fresh' | 'warning' | 'stale'

/**
 * Get the freshness classification for a balance update date.
 * Used to display visual indicators (left color bar) on account/card cards.
 *
 * @param date - The date when the balance was last updated
 * @returns 'fresh' if updated today/yesterday, 'warning' if 2-7 days ago, 'stale' if >7 days or never
 */
export function getBalanceFreshness(date: Date | undefined): BalanceFreshness {
  if (!date) return 'stale'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Fresh: updated today (0 days) or yesterday (1 day)
  if (diffDays <= 1) return 'fresh'

  // Warning: updated 2-7 days ago
  if (diffDays <= 7) return 'warning'

  // Stale: updated more than 7 days ago
  return 'stale'
}

