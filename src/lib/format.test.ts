/**
 * Format Utilities Tests
 *
 * Tests for currency and date formatting functions.
 */

import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatChartCurrency,
  formatCurrencyWithCents,
  formatChartDate,
  formatTooltipDate,
  formatToBRL,
  parseBRLToCents,
  parseDecimal,
  formatDecimalBR,
} from './format'

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
  describe('standard formatting (under R$ 10K)', () => {
    it('formats zero correctly', () => {
      expect(normalizeSpaces(formatCurrency(0))).toBe('R$ 0')
    })

    it('formats small amounts correctly', () => {
      expect(normalizeSpaces(formatCurrency(100))).toBe('R$ 1') // 1 real
      expect(normalizeSpaces(formatCurrency(1000))).toBe('R$ 10') // 10 reais
      expect(normalizeSpaces(formatCurrency(12345))).toBe('R$ 123') // 123.45 reais (rounds)
    })

    it('formats amounts just under R$ 10K', () => {
      expect(normalizeSpaces(formatCurrency(999900))).toBe('R$ 9.999') // R$ 9,999.00
    })

    it('handles negative values', () => {
      expect(normalizeSpaces(formatCurrency(-100))).toBe('-R$ 1')
      expect(normalizeSpaces(formatCurrency(-50000))).toBe('-R$ 500')
    })
  })

  describe('thousands abbreviation (R$ 10K+)', () => {
    it('abbreviates amounts at R$ 10K threshold', () => {
      const result = normalizeSpaces(formatCurrency(1000000)) // R$ 10,000
      expect(result).toContain('K')
      expect(result).toContain('10.0')
    })

    it('abbreviates R$ 50K correctly', () => {
      const result = normalizeSpaces(formatCurrency(5000000)) // R$ 50,000
      expect(result).toContain('K')
      expect(result).toContain('50.0')
    })

    it('abbreviates amounts just under R$ 1M', () => {
      const result = normalizeSpaces(formatCurrency(99999900)) // R$ 999,999
      expect(result).toContain('K')
      expect(result).toContain('1000.0') // 999.999K rounds to 1000.0K
    })

    it('handles negative thousands', () => {
      const result = normalizeSpaces(formatCurrency(-2500000)) // -R$ 25,000
      expect(result).toContain('K')
      expect(result).toContain('-')
    })
  })

  describe('millions abbreviation (R$ 1M+)', () => {
    it('abbreviates amounts at R$ 1M threshold', () => {
      const result = normalizeSpaces(formatCurrency(100000000)) // R$ 1,000,000
      expect(result).toContain('M')
      expect(result).toContain('1.0')
    })

    it('abbreviates R$ 2.5M correctly', () => {
      const result = normalizeSpaces(formatCurrency(250000000)) // R$ 2,500,000
      expect(result).toContain('M')
      expect(result).toContain('2.5')
    })

    it('handles negative millions', () => {
      const result = normalizeSpaces(formatCurrency(-150000000)) // -R$ 1,500,000
      expect(result).toContain('M')
      expect(result).toContain('-')
    })
  })
})

// =============================================================================
// formatChartCurrency TESTS
// =============================================================================

describe('formatChartCurrency', () => {
  describe('standard formatting (under R$ 1K)', () => {
    it('formats zero correctly', () => {
      expect(formatChartCurrency(0)).toBe('R$ 0')
    })

    it('formats small amounts correctly', () => {
      expect(formatChartCurrency(100)).toBe('R$ 100')
      expect(formatChartCurrency(500)).toBe('R$ 500')
      expect(formatChartCurrency(999)).toBe('R$ 999')
    })

    it('rounds decimal values', () => {
      expect(formatChartCurrency(123.45)).toBe('R$ 123')
      expect(formatChartCurrency(999.9)).toBe('R$ 1000')
    })

    it('handles negative values', () => {
      expect(formatChartCurrency(-100)).toBe('R$ -100')
      expect(formatChartCurrency(-500)).toBe('R$ -500')
    })
  })

  describe('thousands abbreviation (R$ 1K+)', () => {
    it('abbreviates at R$ 1K threshold', () => {
      expect(formatChartCurrency(1000)).toBe('R$ 1.0K')
    })

    it('abbreviates R$ 1.5K correctly', () => {
      expect(formatChartCurrency(1500)).toBe('R$ 1.5K')
    })

    it('abbreviates R$ 10K correctly', () => {
      expect(formatChartCurrency(10000)).toBe('R$ 10.0K')
    })

    it('abbreviates R$ 999K correctly', () => {
      expect(formatChartCurrency(999000)).toBe('R$ 999.0K')
    })

    it('handles negative thousands', () => {
      expect(formatChartCurrency(-5000)).toBe('R$ -5.0K')
    })
  })

  describe('millions abbreviation (R$ 1M+)', () => {
    it('abbreviates at R$ 1M threshold', () => {
      expect(formatChartCurrency(1000000)).toBe('R$ 1.0M')
    })

    it('abbreviates R$ 2.5M correctly', () => {
      expect(formatChartCurrency(2500000)).toBe('R$ 2.5M')
    })

    it('handles negative millions', () => {
      expect(formatChartCurrency(-1500000)).toBe('R$ -1.5M')
    })
  })
})

// =============================================================================
// formatCurrencyWithCents TESTS
// =============================================================================

describe('formatCurrencyWithCents', () => {
  it('formats zero with cents', () => {
    expect(normalizeSpaces(formatCurrencyWithCents(0))).toBe('R$ 0,00')
  })

  it('formats whole amounts with decimal places', () => {
    expect(normalizeSpaces(formatCurrencyWithCents(100))).toBe('R$ 1,00')
    expect(normalizeSpaces(formatCurrencyWithCents(1000))).toBe('R$ 10,00')
    expect(normalizeSpaces(formatCurrencyWithCents(100000))).toBe('R$ 1.000,00')
  })

  it('formats amounts with cents', () => {
    expect(normalizeSpaces(formatCurrencyWithCents(123))).toBe('R$ 1,23')
    expect(normalizeSpaces(formatCurrencyWithCents(12345))).toBe('R$ 123,45')
    expect(normalizeSpaces(formatCurrencyWithCents(999999))).toBe('R$ 9.999,99')
  })

  it('handles negative values', () => {
    expect(normalizeSpaces(formatCurrencyWithCents(-100))).toBe('-R$ 1,00')
    expect(normalizeSpaces(formatCurrencyWithCents(-12345))).toBe('-R$ 123,45')
  })

  it('handles large values with cents', () => {
    expect(normalizeSpaces(formatCurrencyWithCents(100000050))).toBe('R$ 1.000.000,50')
  })
})

// =============================================================================
// formatChartDate TESTS
// =============================================================================

describe('formatChartDate', () => {
  it('formats dates in Portuguese short format', () => {
    const date = new Date(2025, 0, 15) // January 15, 2025
    const result = formatChartDate(date)
    // Portuguese format: "15 de jan."
    expect(result).toMatch(/15/)
    expect(result.toLowerCase()).toMatch(/jan/)
  })

  it('formats different months correctly', () => {
    const november = new Date(2025, 10, 26) // November 26
    const result = formatChartDate(november)
    expect(result).toMatch(/26/)
    expect(result.toLowerCase()).toMatch(/nov/)
  })

  it('handles first day of month', () => {
    const firstDay = new Date(2025, 5, 1) // June 1
    const result = formatChartDate(firstDay)
    expect(result).toMatch(/1/)
    expect(result.toLowerCase()).toMatch(/jun/)
  })

  it('handles last day of month', () => {
    const lastDay = new Date(2025, 11, 31) // December 31
    const result = formatChartDate(lastDay)
    expect(result).toMatch(/31/)
    expect(result.toLowerCase()).toMatch(/dez/)
  })
})

// =============================================================================
// formatTooltipDate TESTS
// =============================================================================

describe('formatTooltipDate', () => {
  it('formats dates with weekday, day, and month in Portuguese', () => {
    const wednesday = new Date(2025, 10, 26) // Wednesday, November 26, 2025
    const result = formatTooltipDate(wednesday)
    // Portuguese format includes weekday and full month
    expect(result).toMatch(/26/)
    expect(result.toLowerCase()).toMatch(/novembro/)
  })

  it('includes weekday in Portuguese', () => {
    // Monday, January 6, 2025
    const monday = new Date(2025, 0, 6)
    const result = formatTooltipDate(monday)
    expect(result.toLowerCase()).toMatch(/segunda/)
  })

  it('handles weekend days', () => {
    // Saturday, January 11, 2025
    const saturday = new Date(2025, 0, 11)
    const result = formatTooltipDate(saturday)
    expect(result.toLowerCase()).toMatch(/sábado/)
  })

  it('formats February dates correctly', () => {
    const february = new Date(2025, 1, 14) // February 14
    const result = formatTooltipDate(february)
    expect(result).toMatch(/14/)
    expect(result.toLowerCase()).toMatch(/fevereiro/)
  })
})

// =============================================================================
// formatToBRL TESTS
// =============================================================================

describe('formatToBRL', () => {
  describe('basic formatting', () => {
    it('returns empty string for empty input', () => {
      expect(formatToBRL('')).toBe('')
    })

    it('returns empty string for non-digit input', () => {
      expect(formatToBRL('abc')).toBe('')
      expect(formatToBRL('!@#')).toBe('')
    })

    it('formats single digit as cents', () => {
      expect(formatToBRL('1')).toBe('0,01')
      expect(formatToBRL('5')).toBe('0,05')
    })

    it('formats two digits as cents', () => {
      expect(formatToBRL('10')).toBe('0,10')
      expect(formatToBRL('99')).toBe('0,99')
    })

    it('formats three digits correctly', () => {
      expect(formatToBRL('100')).toBe('1,00')
      expect(formatToBRL('123')).toBe('1,23')
    })
  })

  describe('thousands formatting', () => {
    it('formats thousands with dot separator', () => {
      expect(formatToBRL('100000')).toBe('1.000,00')
      expect(formatToBRL('1234567')).toBe('12.345,67')
    })

    it('formats millions correctly', () => {
      expect(formatToBRL('100000000')).toBe('1.000.000,00')
    })
  })

  describe('input cleaning', () => {
    it('strips non-digit characters and re-formats', () => {
      // formatToBRL extracts only digits and re-formats as BRL
      // 'R$ 1.234,56' -> digits '123456' -> '1.234,56'
      expect(formatToBRL('R$ 1.234,56')).toBe('1.234,56')
      // '1,00' -> digits '100' -> '1,00'
      expect(formatToBRL('1,00')).toBe('1,00')
    })

    it('handles mixed input', () => {
      expect(formatToBRL('a1b2c3')).toBe('1,23')
    })
  })

  describe('edge cases', () => {
    it('handles leading zeros', () => {
      expect(formatToBRL('00100')).toBe('1,00')
      expect(formatToBRL('000001')).toBe('0,01')
    })

    it('handles very large numbers', () => {
      expect(formatToBRL('99999999999')).toBe('999.999.999,99')
    })
  })
})

// =============================================================================
// parseBRLToCents TESTS
// =============================================================================

describe('parseBRLToCents', () => {
  describe('basic parsing', () => {
    it('returns 0 for empty string', () => {
      expect(parseBRLToCents('')).toBe(0)
    })

    it('returns 0 for whitespace only', () => {
      expect(parseBRLToCents('   ')).toBe(0)
    })

    it('parses simple decimal values', () => {
      expect(parseBRLToCents('1,00')).toBe(100)
      expect(parseBRLToCents('10,50')).toBe(1050)
      expect(parseBRLToCents('0,99')).toBe(99)
    })
  })

  describe('currency symbol handling', () => {
    it('strips R$ prefix', () => {
      expect(parseBRLToCents('R$ 1,00')).toBe(100)
      expect(parseBRLToCents('R$1,00')).toBe(100)
    })

    it('handles R$ with various spacing', () => {
      expect(parseBRLToCents('R$  100,00')).toBe(10000)
    })
  })

  describe('thousands separator handling', () => {
    it('parses values with dot separators', () => {
      expect(parseBRLToCents('1.000,00')).toBe(100000)
      expect(parseBRLToCents('1.234,56')).toBe(123456)
    })

    it('parses millions correctly', () => {
      expect(parseBRLToCents('1.000.000,00')).toBe(100000000)
    })

    it('parses complex formatted values', () => {
      expect(parseBRLToCents('R$ 12.345,67')).toBe(1234567)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for invalid input', () => {
      expect(parseBRLToCents('abc')).toBe(0)
      expect(parseBRLToCents('R$')).toBe(0)
    })

    it('handles partial cents by rounding', () => {
      // '1,005' -> normalized '1.005' -> parseFloat 1.005 -> 1.005 * 100 = 100.5 -> Math.round = 100
      expect(parseBRLToCents('1,005')).toBe(100)
    })

    it('handles negative values', () => {
      // The function does not strip negative signs, so -1,00 parses as -100 cents
      expect(parseBRLToCents('-1,00')).toBe(-100)
    })
  })

  describe('roundtrip with formatToBRL', () => {
    it('roundtrips simple values', () => {
      const original = 12345 // 123.45 reais
      const formatted = formatToBRL(original.toString())
      expect(parseBRLToCents(formatted)).toBe(original)
    })

    it('roundtrips large values', () => {
      const original = 123456789 // 1,234,567.89 reais
      const formatted = formatToBRL(original.toString())
      expect(parseBRLToCents(formatted)).toBe(original)
    })

    it('roundtrips small values', () => {
      const original = 1 // 0.01 reais
      const formatted = formatToBRL(original.toString())
      expect(parseBRLToCents(formatted)).toBe(original)
    })
  })
})

// =============================================================================
// parseDecimal TESTS
// =============================================================================

describe('parseDecimal', () => {
  describe('Brazilian format (comma as decimal separator)', () => {
    it('parses simple comma-separated values', () => {
      expect(parseDecimal('120,50')).toBe(120.5)
      expect(parseDecimal('1,00')).toBe(1)
      expect(parseDecimal('0,99')).toBe(0.99)
    })

    it('parses values with only integer part', () => {
      expect(parseDecimal('120')).toBe(120)
      expect(parseDecimal('1000')).toBe(1000)
    })

    it('parses values with single decimal digit', () => {
      expect(parseDecimal('120,5')).toBe(120.5)
      expect(parseDecimal('0,5')).toBe(0.5)
    })

    it('parses values with many decimal digits', () => {
      expect(parseDecimal('120,567')).toBe(120.567)
    })
  })

  describe('international format (period as decimal separator)', () => {
    it('parses simple period-separated values', () => {
      expect(parseDecimal('120.50')).toBe(120.5)
      expect(parseDecimal('1.00')).toBe(1)
      expect(parseDecimal('0.99')).toBe(0.99)
    })

    it('parses values with single decimal digit', () => {
      expect(parseDecimal('120.5')).toBe(120.5)
      expect(parseDecimal('0.5')).toBe(0.5)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty string', () => {
      expect(parseDecimal('')).toBe(0)
    })

    it('returns 0 for whitespace only', () => {
      expect(parseDecimal('   ')).toBe(0)
    })

    it('returns 0 for invalid input', () => {
      expect(parseDecimal('abc')).toBe(0)
      expect(parseDecimal('!@#')).toBe(0)
    })

    it('returns 0 for null/undefined-like values', () => {
      expect(parseDecimal(null as unknown as string)).toBe(0)
      expect(parseDecimal(undefined as unknown as string)).toBe(0)
    })

    it('handles negative values', () => {
      expect(parseDecimal('-120,50')).toBe(-120.5)
      expect(parseDecimal('-120.50')).toBe(-120.5)
    })

    it('handles values with extra whitespace', () => {
      expect(parseDecimal(' 120,50 ')).toBe(120.5)
    })

    it('handles values with currency symbols', () => {
      // parseDecimal strips non-numeric chars except comma, period, minus
      expect(parseDecimal('R$ 120,50')).toBe(120.5)
    })
  })

  describe('practical use cases', () => {
    it('handles typical Brazilian user input', () => {
      expect(parseDecimal('1500,00')).toBe(1500)
      expect(parseDecimal('2500,50')).toBe(2500.5)
      expect(parseDecimal('99,99')).toBe(99.99)
    })

    it('converts correctly for cents calculation', () => {
      // Simulating what balance-list-item does
      const input = '1500,50'
      const valueInCents = Math.round(parseDecimal(input) * 100)
      expect(valueInCents).toBe(150050)
    })
  })
})

// =============================================================================
// formatDecimalBR TESTS
// =============================================================================

describe('formatDecimalBR', () => {
  describe('basic formatting', () => {
    it('formats numbers with comma separator', () => {
      expect(formatDecimalBR(120.5)).toBe('120,50')
      expect(formatDecimalBR(1)).toBe('1,00')
      expect(formatDecimalBR(0.99)).toBe('0,99')
    })

    it('formats zero correctly', () => {
      expect(formatDecimalBR(0)).toBe('0,00')
    })

    it('formats whole numbers with .00', () => {
      expect(formatDecimalBR(100)).toBe('100,00')
      expect(formatDecimalBR(1000)).toBe('1000,00')
    })
  })

  describe('decimal places', () => {
    it('uses 2 decimal places by default', () => {
      expect(formatDecimalBR(123.456)).toBe('123,46') // rounds
      expect(formatDecimalBR(123.4)).toBe('123,40')
    })

    it('respects custom decimal places', () => {
      expect(formatDecimalBR(123.456, 3)).toBe('123,456')
      expect(formatDecimalBR(123.4, 1)).toBe('123,4')
      expect(formatDecimalBR(123, 0)).toBe('123')
    })
  })

  describe('negative values', () => {
    it('formats negative numbers correctly', () => {
      expect(formatDecimalBR(-120.5)).toBe('-120,50')
      expect(formatDecimalBR(-0.99)).toBe('-0,99')
    })
  })

  describe('roundtrip with parseDecimal', () => {
    it('roundtrips simple values', () => {
      const original = 120.5
      const formatted = formatDecimalBR(original)
      expect(parseDecimal(formatted)).toBe(original)
    })

    it('roundtrips values with many decimals (with rounding)', () => {
      const original = 123.456
      const formatted = formatDecimalBR(original) // "123,46"
      expect(parseDecimal(formatted)).toBe(123.46) // rounded
    })

    it('roundtrips zero', () => {
      const formatted = formatDecimalBR(0)
      expect(parseDecimal(formatted)).toBe(0)
    })
  })
})

