/**
 * Currency and date formatting utilities for the dashboard.
 * Uses Portuguese locale for consistent display.
 */

/**
 * Format cents as currency.
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
    return new Intl.NumberFormat('pt-BR', {
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
      .format(thousands)
      .replace(/[\d,.]+/, `${thousands.toFixed(1)}`) + 'K'
  }

  // Standard formatting without cents for whole amounts
  return new Intl.NumberFormat('pt-BR', {
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

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais)
}

/**
 * Format date for chart X-axis labels.
 * Uses Portuguese locale for consistent display.
 *
 * @param date - Date object
 * @returns Short date string in Portuguese (e.g., "26 nov.")
 */
export function formatChartDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Format date for tooltip header.
 * Uses Portuguese locale for consistent display.
 *
 * @param date - Date object
 * @returns Full date string in Portuguese (e.g., "quarta-feira, 26 de novembro")
 */
export function formatTooltipDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Format a number string to Brazilian currency format (1.234,56).
 * Used for input masking in currency fields.
 *
 * @param value - Raw string input (may contain non-digit characters)
 * @returns Formatted BRL string without currency symbol (e.g., "1.234,56")
 */
export function formatToBRL(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''

  const paddedDigits = digits.padStart(3, '0')
  const cents = paddedDigits.slice(-2)
  const reais = paddedDigits.slice(0, -2).replace(/^0+/, '') || '0'
  const formattedReais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${formattedReais},${cents}`
}

/**
 * Parse a BRL formatted string back to cents.
 * Handles various input formats including currency symbol prefix.
 *
 * @param formatted - BRL formatted string (e.g., "R$ 1.234,56" or "1.234,56")
 * @returns Amount in cents as integer (e.g., 123456)
 */
export function parseBRLToCents(formatted: string): number {
  const cleaned = formatted.replace(/R\$\s?/g, '').trim()
  if (!cleaned) return 0

  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : Math.round(num * 100)
}

/**
 * Parse a decimal string that may use comma or period as decimal separator.
 * Handles Brazilian format (comma) and international format (period).
 *
 * @param value - Decimal string (e.g., "120,50" or "120.50")
 * @returns Parsed number (e.g., 120.5), or 0 if invalid
 */
export function parseDecimal(value: string): number {
  if (!value || typeof value !== 'string') return 0

  // Remove any non-numeric characters except comma, period, and minus
  const cleaned = value.replace(/[^\d.,-]/g, '')
  if (!cleaned) return 0

  // Replace comma with period for parsing
  const normalized = cleaned.replace(',', '.')
  const num = parseFloat(normalized)

  return isNaN(num) ? 0 : num
}

/**
 * Format a number to Brazilian decimal format (with comma).
 * Used for displaying values in input fields.
 *
 * @param value - Number to format (e.g., 120.5)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with comma separator (e.g., "120,50")
 */
export function formatDecimalBR(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',')
}
