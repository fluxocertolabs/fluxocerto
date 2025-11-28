/**
 * Cashflow Engine Validators Tests
 *
 * Tests for input validation and filtering logic.
 */

import { describe, expect, it } from 'vitest'
import { validateAndFilterInput, type CashflowEngineInput } from './validators'
import { CashflowCalculationError, CashflowErrorCode } from './types'

// =============================================================================
// TEST HELPERS
// =============================================================================

function createValidAccount(overrides: Partial<{
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
  owner: { id: string; name: string } | null
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Account',
    type: overrides.type ?? 'checking',
    balance: overrides.balance ?? 100000,
    owner: overrides.owner ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createValidProject(overrides: Partial<{
  id: string
  name: string
  amount: number
  paymentDay: number
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  isActive: boolean
  paymentSchedule: { type: 'dayOfWeek'; dayOfWeek: number } | { type: 'dayOfMonth'; dayOfMonth: number } | { type: 'twiceMonthly'; firstDay: number; secondDay: number }
}> = {}) {
  const frequency = overrides.frequency ?? 'monthly'
  const paymentDay = overrides.paymentDay ?? 15

  // Build appropriate paymentSchedule based on frequency if not explicitly provided
  let paymentSchedule = overrides.paymentSchedule
  if (!paymentSchedule) {
    if (frequency === 'weekly' || frequency === 'biweekly') {
      paymentSchedule = { type: 'dayOfWeek', dayOfWeek: 5 }
    } else if (frequency === 'twice-monthly') {
      paymentSchedule = { type: 'twiceMonthly', firstDay: 1, secondDay: 15 }
    } else {
      paymentSchedule = { type: 'dayOfMonth', dayOfMonth: paymentDay }
    }
  }

  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Project',
    amount: overrides.amount ?? 50000,
    paymentDay: overrides.paymentDay ?? 15,
    frequency,
    paymentSchedule,
    certainty: overrides.certainty ?? 'guaranteed',
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createValidExpense(overrides: Partial<{
  id: string
  name: string
  amount: number
  dueDay: number
  isActive: boolean
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: 'fixed' as const,
    name: overrides.name ?? 'Test Expense',
    amount: overrides.amount ?? 30000,
    dueDay: overrides.dueDay ?? 1,
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createValidCreditCard(overrides: Partial<{
  id: string
  name: string
  statementBalance: number
  dueDay: number
  owner: { id: string; name: string } | null
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Card',
    statementBalance: overrides.statementBalance ?? 20000,
    dueDay: overrides.dueDay ?? 20,
    owner: overrides.owner ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateAndFilterInput', () => {
  describe('options validation', () => {
    it('accepts valid options', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [],
        creditCards: [],
        options: { projectionDays: 30, startDate: new Date() },
      }

      const result = validateAndFilterInput(input)
      expect(result.options.projectionDays).toBe(30)
    })

    it('uses default projection days when not provided', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [],
        creditCards: [],
      }

      const result = validateAndFilterInput(input)
      expect(result.options.projectionDays).toBe(30)
    })

    it('throws on invalid projection days', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [],
        creditCards: [],
        options: { projectionDays: -5 },
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })
  })

  describe('account validation', () => {
    it('accepts valid accounts', () => {
      const input: CashflowEngineInput = {
        accounts: [createValidAccount()],
        projects: [],
        expenses: [],
        creditCards: [],
      }

      const result = validateAndFilterInput(input)
      expect(result.accounts.length).toBe(1)
    })

    it('throws on negative balance', () => {
      const input: CashflowEngineInput = {
        accounts: [createValidAccount({ balance: -100 })],
        projects: [],
        expenses: [],
        creditCards: [],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })
  })

  describe('project validation and filtering', () => {
    it('filters to only active projects', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [
          createValidProject({ isActive: true }),
          createValidProject({ isActive: false }),
          createValidProject({ isActive: true }),
        ],
        expenses: [],
        creditCards: [],
      }

      const result = validateAndFilterInput(input)
      expect(result.activeProjects.length).toBe(2)
    })

    it('separates guaranteed projects', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [
          createValidProject({ certainty: 'guaranteed', isActive: true }),
          createValidProject({ certainty: 'probable', isActive: true }),
          createValidProject({ certainty: 'uncertain', isActive: true }),
          createValidProject({ certainty: 'guaranteed', isActive: true }),
        ],
        expenses: [],
        creditCards: [],
      }

      const result = validateAndFilterInput(input)
      expect(result.activeProjects.length).toBe(4)
      expect(result.guaranteedProjects.length).toBe(2)
    })

    it('throws on invalid payment day', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [createValidProject({ paymentDay: 32 })],
        expenses: [],
        creditCards: [],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })

    it('throws on zero payment day', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [createValidProject({ paymentDay: 0 })],
        expenses: [],
        creditCards: [],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })

    it('throws on non-positive amount', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [createValidProject({ amount: 0 })],
        expenses: [],
        creditCards: [],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })
  })

  describe('expense validation and filtering', () => {
    it('filters to only active expenses', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [
          createValidExpense({ isActive: true }),
          createValidExpense({ isActive: false }),
        ],
        creditCards: [],
      }

      const result = validateAndFilterInput(input)
      expect(result.activeExpenses.length).toBe(1)
    })

    it('throws on invalid due day', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [createValidExpense({ dueDay: 32 })],
        creditCards: [],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })

    it('throws on non-positive amount', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [createValidExpense({ amount: -100 })],
        creditCards: [],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })
  })

  describe('credit card validation', () => {
    it('accepts valid credit cards', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [],
        creditCards: [createValidCreditCard()],
      }

      const result = validateAndFilterInput(input)
      expect(result.creditCards.length).toBe(1)
    })

    it('throws on negative statement balance', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [],
        creditCards: [createValidCreditCard({ statementBalance: -100 })],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })

    it('throws on invalid due day', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [],
        expenses: [],
        creditCards: [createValidCreditCard({ dueDay: 32 })],
      }

      expect(() => validateAndFilterInput(input)).toThrow(CashflowCalculationError)
    })
  })

  describe('error codes', () => {
    it('uses INVALID_INPUT code for general validation errors', () => {
      const input: CashflowEngineInput = {
        accounts: [],
        projects: [createValidProject({ paymentDay: 32 })],
        expenses: [],
        creditCards: [],
      }

      try {
        validateAndFilterInput(input)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CashflowCalculationError)
        expect((error as CashflowCalculationError).code).toBe(CashflowErrorCode.INVALID_INPUT)
      }
    })

    it('uses INVALID_AMOUNT code for account balance errors', () => {
      const input: CashflowEngineInput = {
        accounts: [createValidAccount({ balance: -100 })],
        projects: [],
        expenses: [],
        creditCards: [],
      }

      try {
        validateAndFilterInput(input)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CashflowCalculationError)
        expect((error as CashflowCalculationError).code).toBe(CashflowErrorCode.INVALID_AMOUNT)
      }
    })
  })
})

