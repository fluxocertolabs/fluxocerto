/**
 * Currency and date formatting utilities for the dashboard.
 * Uses browser locale for currency formatting per spec requirements.
 */

/**
 * Format cents as currency using browser locale.
 * Handles edge cases: large numbers with abbreviations, decimal precision.
 *
 * @param cents - Amount in cents (integer)
 * @returns Formatted currency string (e.g., "R$ 1.234" or "R$ 1.2M")
 */
export function formatCurrency(cents: number): string {
  const reais = cents / 100

  // For very large numbers, use abbreviations
  if (Math.abs(reais) >= 1_000_000) {
    const millions = reais / 1_000_000
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
      .format(millions)
      .replace(/[\d,.]+/, `${millions.toFixed(1)}`) + 'M'
  }

  if (Math.abs(reais) >= 10_000) {
    const thousands = reais / 1_000
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
      .format(thousands)
      .replace(/[\d,.]+/, `${thousands.toFixed(1)}`) + 'K'
  }

  // Standard formatting without cents for whole amounts
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(reais)
}

/**
 * Format currency for chart Y-axis (compact format).
 * Used by Recharts tickFormatter.
 *
 * @param reais - Amount in reais (already converted from cents)
 * @returns Compact formatted string (e.g., "R$ 1.2K", "R$ 500")
 */
export function formatChartCurrency(reais: number): string {
  if (Math.abs(reais) >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toFixed(1)}M`
  }

  if (Math.abs(reais) >= 1_000) {
    return `R$ ${(reais / 1_000).toFixed(1)}K`
  }

  return `R$ ${Math.round(reais)}`
}

/**
 * Format currency with cents for detailed display.
 *
 * @param cents - Amount in cents (integer)
 * @returns Formatted currency string with cents (e.g., "R$ 1.234,56")
 */
export function formatCurrencyWithCents(cents: number): string {
  const reais = cents / 100

  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais)
}

/**
 * Format date for chart X-axis labels.
 *
 * @param date - Date object
 * @returns Short date string (e.g., "Nov 26")
 */
export function formatChartDate(date: Date): string {
  return new Intl.DateTimeFormat(navigator.language, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Format date for tooltip header.
 *
 * @param date - Date object
 * @returns Full date string (e.g., "Wednesday, November 26")
 */
export function formatTooltipDate(date: Date): string {
  return new Intl.DateTimeFormat(navigator.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

