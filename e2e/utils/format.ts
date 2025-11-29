/**
 * Formatting utilities for BRL currency and dates in E2E tests
 * Implements IFormatUtils contract from specs/019-e2e-testing/contracts/fixtures.ts
 */

/**
 * Format cents to BRL currency string
 * @param cents - Value in cents
 * @returns Formatted string (e.g., "R$ 1.000,00")
 */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/**
 * Parse BRL currency string to cents
 * @param value - Formatted string (e.g., "R$ 1.000,00" or "1.000,00")
 * @returns Value in cents
 */
export function parseBRL(value: string): number {
  // Check for negative
  const isNegative = value.includes('-');
  
  // Remove currency symbol, whitespace, and negative sign
  const cleaned = value.replace(/R\$\s?/g, '').replace(/-/g, '').trim();
  
  // Split by comma (decimal separator in pt-BR)
  const parts = cleaned.split(',');
  
  // Get integer part (remove thousands separators)
  const integerPart = parseInt(parts[0].replace(/\./g, '') || '0', 10);
  
  // Get cents part (pad or truncate to 2 digits)
  let centsPart = 0;
  if (parts.length > 1) {
    const centsStr = parts[1].padEnd(2, '0').slice(0, 2);
    centsPart = parseInt(centsStr, 10);
  }
  
  const result = integerPart * 100 + centsPart;
  return isNegative ? -result : result;
}

/**
 * Format date for display (pt-BR locale)
 * @param date - Date or ISO string
 * @returns Formatted date (e.g., "15/12/2025")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Parse pt-BR date string to ISO
 * @param value - Date string (e.g., "15/12/2025")
 * @returns ISO date string (e.g., "2025-12-15")
 */
export function parseDate(value: string): string {
  const [day, month, year] = value.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Format balance for input fields (without currency symbol)
 * @param cents - Value in cents
 * @returns Formatted string (e.g., "1.000,00")
 */
export function formatBalanceInput(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

