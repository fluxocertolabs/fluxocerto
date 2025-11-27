/**
 * Type Schema Tests
 *
 * Tests for Zod schema validation, focusing on TwiceMonthlySchedule variable amounts.
 */

import { describe, expect, it } from 'vitest'
import { TwiceMonthlyScheduleSchema } from './index'

describe('TwiceMonthlyScheduleSchema', () => {
  describe('basic validation', () => {
    it('accepts valid schedule without variable amounts', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
      })
      expect(result.success).toBe(true)
    })

    it('rejects when firstDay equals secondDay', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 15,
        secondDay: 15,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Both payment days must be different')
      }
    })

    it('rejects invalid day values', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 0,
        secondDay: 32,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('variable amounts validation', () => {
    it('accepts schedule with both variable amounts present', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
        firstAmount: 300000, // R$ 3.000
        secondAmount: 50000, // R$ 500
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.firstAmount).toBe(300000)
        expect(result.data.secondAmount).toBe(50000)
      }
    })

    it('accepts schedule with both variable amounts absent', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.firstAmount).toBeUndefined()
        expect(result.data.secondAmount).toBeUndefined()
      }
    })

    it('rejects when only firstAmount is present', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
        firstAmount: 300000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.issues.find(
          (issue) => issue.message === 'Both amounts are required when variable amounts is enabled'
        )
        expect(errorMessage).toBeDefined()
      }
    })

    it('rejects when only secondAmount is present', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
        secondAmount: 50000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.issues.find(
          (issue) => issue.message === 'Both amounts are required when variable amounts is enabled'
        )
        expect(errorMessage).toBeDefined()
      }
    })

    it('rejects non-positive firstAmount', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
        firstAmount: 0,
        secondAmount: 50000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.issues.find(
          (issue) => issue.message === 'First amount must be positive'
        )
        expect(errorMessage).toBeDefined()
      }
    })

    it('rejects non-positive secondAmount', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
        firstAmount: 300000,
        secondAmount: -100,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.issues.find(
          (issue) => issue.message === 'Second amount must be positive'
        )
        expect(errorMessage).toBeDefined()
      }
    })

    it('accepts same amount for both days (valid use case)', () => {
      const result = TwiceMonthlyScheduleSchema.safeParse({
        type: 'twiceMonthly',
        firstDay: 5,
        secondDay: 20,
        firstAmount: 150000,
        secondAmount: 150000,
      })
      expect(result.success).toBe(true)
    })
  })
})

