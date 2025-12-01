/**
 * Type Schema Tests
 *
 * Tests for Zod schema validation and type guards.
 */

import { describe, expect, it } from 'vitest'
import {
  TwiceMonthlyScheduleSchema,
  BankAccountInputSchema,
  FixedExpenseInputSchema,
  SingleShotExpenseInputSchema,
  CreditCardInputSchema,
  validateFrequencyScheduleMatch,
  isFixedExpense,
  isSingleShotExpense,
  isRecurringProject,
  isSingleShotIncome,
  type FixedExpense,
  type SingleShotExpense,
  type RecurringProject,
  type SingleShotIncome,
} from './index'

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

// =============================================================================
// BankAccountInputSchema TESTS
// =============================================================================

describe('BankAccountInputSchema', () => {
  it('accepts valid bank account input', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'Checking Account',
      type: 'checking',
      balance: 100000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts all account types', () => {
    const types = ['checking', 'savings', 'investment'] as const
    for (const type of types) {
      const result = BankAccountInputSchema.safeParse({
        name: 'Account',
        type,
        balance: 100000,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects empty name', () => {
    const result = BankAccountInputSchema.safeParse({
      name: '',
      type: 'checking',
      balance: 100000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative balance', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'Account',
      type: 'checking',
      balance: -100,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero balance', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'Account',
      type: 'checking',
      balance: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional ownerId', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'Account',
      type: 'checking',
      balance: 100000,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null ownerId', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'Account',
      type: 'checking',
      balance: 100000,
      ownerId: null,
    })
    expect(result.success).toBe(true)
  })
})

// =============================================================================
// FixedExpenseInputSchema TESTS
// =============================================================================

describe('FixedExpenseInputSchema', () => {
  it('accepts valid fixed expense input', () => {
    const result = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: 'Rent',
      amount: 150000,
      dueDay: 5,
      isActive: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: '',
      amount: 150000,
      dueDay: 5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive amount', () => {
    const result = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: 'Rent',
      amount: 0,
      dueDay: 5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid due day (0)', () => {
    const result = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: 'Rent',
      amount: 150000,
      dueDay: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid due day (32)', () => {
    const result = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: 'Rent',
      amount: 150000,
      dueDay: 32,
    })
    expect(result.success).toBe(false)
  })

  it('accepts due day at boundaries (1 and 31)', () => {
    const resultMin = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: 'Rent',
      amount: 150000,
      dueDay: 1,
    })
    expect(resultMin.success).toBe(true)

    const resultMax = FixedExpenseInputSchema.safeParse({
      type: 'fixed',
      name: 'Rent',
      amount: 150000,
      dueDay: 31,
    })
    expect(resultMax.success).toBe(true)
  })
})

// =============================================================================
// SingleShotExpenseInputSchema TESTS
// =============================================================================

describe('SingleShotExpenseInputSchema', () => {
  it('accepts valid single-shot expense input', () => {
    const result = SingleShotExpenseInputSchema.safeParse({
      type: 'single_shot',
      name: 'New Laptop',
      amount: 500000,
      date: new Date('2025-02-15'),
    })
    expect(result.success).toBe(true)
  })

  it('coerces date strings to Date objects', () => {
    const result = SingleShotExpenseInputSchema.safeParse({
      type: 'single_shot',
      name: 'New Laptop',
      amount: 500000,
      date: '2025-02-15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date)
    }
  })

  it('rejects empty name', () => {
    const result = SingleShotExpenseInputSchema.safeParse({
      type: 'single_shot',
      name: '',
      amount: 500000,
      date: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive amount', () => {
    const result = SingleShotExpenseInputSchema.safeParse({
      type: 'single_shot',
      name: 'Laptop',
      amount: -100,
      date: new Date(),
    })
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// CreditCardInputSchema TESTS
// =============================================================================

describe('CreditCardInputSchema', () => {
  it('accepts valid credit card input', () => {
    const result = CreditCardInputSchema.safeParse({
      name: 'Visa Gold',
      statementBalance: 250000,
      dueDay: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreditCardInputSchema.safeParse({
      name: '',
      statementBalance: 250000,
      dueDay: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative statement balance', () => {
    const result = CreditCardInputSchema.safeParse({
      name: 'Visa Gold',
      statementBalance: -100,
      dueDay: 10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero statement balance', () => {
    const result = CreditCardInputSchema.safeParse({
      name: 'Visa Gold',
      statementBalance: 0,
      dueDay: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid due day', () => {
    const result = CreditCardInputSchema.safeParse({
      name: 'Visa Gold',
      statementBalance: 250000,
      dueDay: 32,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional ownerId', () => {
    const result = CreditCardInputSchema.safeParse({
      name: 'Visa Gold',
      statementBalance: 250000,
      dueDay: 10,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
  })
})

// =============================================================================
// validateFrequencyScheduleMatch TESTS
// =============================================================================

describe('validateFrequencyScheduleMatch', () => {
  describe('weekly frequency', () => {
    it('returns true for dayOfWeek schedule', () => {
      expect(
        validateFrequencyScheduleMatch('weekly', { type: 'dayOfWeek', dayOfWeek: 1 })
      ).toBe(true)
    })

    it('returns false for dayOfMonth schedule', () => {
      expect(
        validateFrequencyScheduleMatch('weekly', { type: 'dayOfMonth', dayOfMonth: 15 })
      ).toBe(false)
    })

    it('returns false for twiceMonthly schedule', () => {
      expect(
        validateFrequencyScheduleMatch('weekly', { type: 'twiceMonthly', firstDay: 1, secondDay: 15 })
      ).toBe(false)
    })
  })

  describe('biweekly frequency', () => {
    it('returns true for dayOfWeek schedule', () => {
      expect(
        validateFrequencyScheduleMatch('biweekly', { type: 'dayOfWeek', dayOfWeek: 5 })
      ).toBe(true)
    })

    it('returns false for dayOfMonth schedule', () => {
      expect(
        validateFrequencyScheduleMatch('biweekly', { type: 'dayOfMonth', dayOfMonth: 15 })
      ).toBe(false)
    })
  })

  describe('twice-monthly frequency', () => {
    it('returns true for twiceMonthly schedule', () => {
      expect(
        validateFrequencyScheduleMatch('twice-monthly', { type: 'twiceMonthly', firstDay: 1, secondDay: 15 })
      ).toBe(true)
    })

    it('returns false for dayOfWeek schedule', () => {
      expect(
        validateFrequencyScheduleMatch('twice-monthly', { type: 'dayOfWeek', dayOfWeek: 1 })
      ).toBe(false)
    })

    it('returns false for dayOfMonth schedule', () => {
      expect(
        validateFrequencyScheduleMatch('twice-monthly', { type: 'dayOfMonth', dayOfMonth: 15 })
      ).toBe(false)
    })
  })

  describe('monthly frequency', () => {
    it('returns true for dayOfMonth schedule', () => {
      expect(
        validateFrequencyScheduleMatch('monthly', { type: 'dayOfMonth', dayOfMonth: 15 })
      ).toBe(true)
    })

    it('returns false for dayOfWeek schedule', () => {
      expect(
        validateFrequencyScheduleMatch('monthly', { type: 'dayOfWeek', dayOfWeek: 1 })
      ).toBe(false)
    })

    it('returns false for twiceMonthly schedule', () => {
      expect(
        validateFrequencyScheduleMatch('monthly', { type: 'twiceMonthly', firstDay: 1, secondDay: 15 })
      ).toBe(false)
    })
  })
})

// =============================================================================
// TYPE GUARDS TESTS
// =============================================================================

describe('Type Guards', () => {
  describe('isFixedExpense', () => {
    it('returns true for fixed expense', () => {
      const expense: FixedExpense = {
        id: '123',
        type: 'fixed',
        name: 'Rent',
        amount: 100000,
        dueDay: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isFixedExpense(expense)).toBe(true)
    })

    it('returns false for single-shot expense', () => {
      const expense: SingleShotExpense = {
        id: '123',
        type: 'single_shot',
        name: 'Laptop',
        amount: 500000,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isFixedExpense(expense)).toBe(false)
    })
  })

  describe('isSingleShotExpense', () => {
    it('returns true for single-shot expense', () => {
      const expense: SingleShotExpense = {
        id: '123',
        type: 'single_shot',
        name: 'Laptop',
        amount: 500000,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isSingleShotExpense(expense)).toBe(true)
    })

    it('returns false for fixed expense', () => {
      const expense: FixedExpense = {
        id: '123',
        type: 'fixed',
        name: 'Rent',
        amount: 100000,
        dueDay: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isSingleShotExpense(expense)).toBe(false)
    })
  })

  describe('isRecurringProject', () => {
    it('returns true for recurring project', () => {
      const project: RecurringProject = {
        id: '123',
        type: 'recurring',
        name: 'Salary',
        amount: 500000,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
        certainty: 'guaranteed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isRecurringProject(project)).toBe(true)
    })

    it('returns false for single-shot income', () => {
      const income: SingleShotIncome = {
        id: '123',
        type: 'single_shot',
        name: 'Bonus',
        amount: 100000,
        date: new Date(),
        certainty: 'probable',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isRecurringProject(income)).toBe(false)
    })

    it('returns false for non-object values', () => {
      expect(isRecurringProject(null)).toBe(false)
      expect(isRecurringProject(undefined)).toBe(false)
      expect(isRecurringProject('string')).toBe(false)
    })
  })

  describe('isSingleShotIncome', () => {
    it('returns true for single-shot income', () => {
      const income: SingleShotIncome = {
        id: '123',
        type: 'single_shot',
        name: 'Bonus',
        amount: 100000,
        date: new Date(),
        certainty: 'probable',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isSingleShotIncome(income)).toBe(true)
    })

    it('returns false for recurring project', () => {
      const project: RecurringProject = {
        id: '123',
        type: 'recurring',
        name: 'Salary',
        amount: 500000,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
        certainty: 'guaranteed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(isSingleShotIncome(project)).toBe(false)
    })

    it('returns false for non-object values', () => {
      expect(isSingleShotIncome(null)).toBe(false)
      expect(isSingleShotIncome(undefined)).toBe(false)
      expect(isSingleShotIncome(42)).toBe(false)
    })
  })
})

