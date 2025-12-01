/**
 * Health Indicator Pure Functions Tests
 *
 * Tests for the pure calculation functions used by useHealthIndicator hook.
 */

import { describe, expect, it } from 'vitest'
import { calculateHealthStatus, getHealthMessage } from './use-health-indicator'

// =============================================================================
// calculateHealthStatus TESTS
// =============================================================================

describe('calculateHealthStatus', () => {
  describe('danger status', () => {
    it('returns "danger" when optimistic danger days > 0', () => {
      expect(calculateHealthStatus(1, 0)).toBe('danger')
      expect(calculateHealthStatus(5, 0)).toBe('danger')
      expect(calculateHealthStatus(10, 5)).toBe('danger')
    })

    it('returns "danger" even when pessimistic is also > 0', () => {
      expect(calculateHealthStatus(3, 7)).toBe('danger')
    })
  })

  describe('warning status', () => {
    it('returns "warning" when only pessimistic danger days > 0', () => {
      expect(calculateHealthStatus(0, 1)).toBe('warning')
      expect(calculateHealthStatus(0, 5)).toBe('warning')
      expect(calculateHealthStatus(0, 15)).toBe('warning')
    })
  })

  describe('good status', () => {
    it('returns "good" when both are 0', () => {
      expect(calculateHealthStatus(0, 0)).toBe('good')
    })
  })

  describe('edge cases', () => {
    it('handles large numbers', () => {
      expect(calculateHealthStatus(100, 200)).toBe('danger')
      expect(calculateHealthStatus(0, 100)).toBe('warning')
    })

    it('prioritizes danger over warning', () => {
      // Even 1 optimistic danger day means danger, regardless of pessimistic
      expect(calculateHealthStatus(1, 100)).toBe('danger')
    })
  })
})

// =============================================================================
// getHealthMessage TESTS
// =============================================================================

describe('getHealthMessage', () => {
  describe('danger messages', () => {
    it('returns singular form for 1 danger day', () => {
      const message = getHealthMessage('danger', 1, 0)
      expect(message).toBe('1 dia de perigo mesmo no melhor cenário')
    })

    it('returns plural form for multiple danger days', () => {
      const message = getHealthMessage('danger', 5, 0)
      expect(message).toBe('5 dias de perigo mesmo no melhor cenário')
    })

    it('uses optimistic count for danger message', () => {
      const message = getHealthMessage('danger', 3, 10)
      expect(message).toContain('3')
      expect(message).toContain('dias de perigo')
    })
  })

  describe('warning messages', () => {
    it('returns singular form for 1 danger day', () => {
      const message = getHealthMessage('warning', 0, 1)
      expect(message).toBe('1 dia de perigo no pior cenário')
    })

    it('returns plural form for multiple danger days', () => {
      const message = getHealthMessage('warning', 0, 7)
      expect(message).toBe('7 dias de perigo no pior cenário')
    })

    it('uses pessimistic count for warning message', () => {
      const message = getHealthMessage('warning', 0, 15)
      expect(message).toContain('15')
      expect(message).toContain('dias de perigo')
    })
  })

  describe('good messages', () => {
    it('returns fixed message for good status', () => {
      const message = getHealthMessage('good', 0, 0)
      expect(message).toBe('Nenhum problema detectado')
    })

    it('ignores danger day counts for good status', () => {
      // Even if passed non-zero values (shouldn't happen in practice)
      const message = getHealthMessage('good', 5, 10)
      expect(message).toBe('Nenhum problema detectado')
    })
  })

  describe('message content', () => {
    it('danger message mentions "melhor cenário"', () => {
      const message = getHealthMessage('danger', 3, 0)
      expect(message).toContain('melhor cenário')
    })

    it('warning message mentions "pior cenário"', () => {
      const message = getHealthMessage('warning', 0, 3)
      expect(message).toContain('pior cenário')
    })
  })

  describe('edge cases', () => {
    it('handles large numbers', () => {
      const message = getHealthMessage('danger', 100, 0)
      expect(message).toContain('100')
    })

    it('returns correct plural for 2 days', () => {
      expect(getHealthMessage('danger', 2, 0)).toContain('dias de perigo')
      expect(getHealthMessage('warning', 0, 2)).toContain('dias de perigo')
    })
  })
})

