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

