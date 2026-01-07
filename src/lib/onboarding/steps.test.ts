/**
 * Tests for onboarding step definitions and state helpers.
 * Tests all pure functions with comprehensive corner cases.
 */

import { describe, it, expect } from 'vitest'
import {
  ONBOARDING_STEPS,
  STEP_ORDER,
  getStepConfig,
  getNextStep,
  getPreviousStep,
  isFirstStep,
  isLastStep,
  getStepIndex,
  getTotalSteps,
  calculateProgress,
  canAutoShow,
  determineInitialStep,
  isMinimumSetupComplete,
} from './steps'
import type { OnboardingStep, OnboardingStatus } from '@/types'

// =============================================================================
// ONBOARDING_STEPS CONSTANT TESTS
// =============================================================================

describe('ONBOARDING_STEPS constant', () => {
  it('contains all expected steps in order', () => {
    const stepIds = ONBOARDING_STEPS.map(s => s.id)
    expect(stepIds).toEqual([
      'profile',
      'group',
      'bank_account',
      'income',
      'expense',
      'credit_card',
      'done',
    ])
  })

  it('has correct order values (0-indexed)', () => {
    ONBOARDING_STEPS.forEach((step, index) => {
      expect(step.order).toBe(index)
    })
  })

  it('has required steps marked as non-optional', () => {
    const requiredSteps = ['profile', 'group', 'bank_account', 'done']
    requiredSteps.forEach(stepId => {
      const step = ONBOARDING_STEPS.find(s => s.id === stepId)
      expect(step?.optional).toBe(false)
    })
  })

  it('has optional steps marked correctly', () => {
    const optionalSteps = ['income', 'expense', 'credit_card']
    optionalSteps.forEach(stepId => {
      const step = ONBOARDING_STEPS.find(s => s.id === stepId)
      expect(step?.optional).toBe(true)
    })
  })

  it('has all steps with non-empty titles and descriptions', () => {
    ONBOARDING_STEPS.forEach(step => {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.description.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// STEP_ORDER CONSTANT TESTS
// =============================================================================

describe('STEP_ORDER constant', () => {
  it('matches ONBOARDING_STEPS order', () => {
    expect(STEP_ORDER).toEqual(ONBOARDING_STEPS.map(s => s.id))
  })

  it('has correct length', () => {
    expect(STEP_ORDER.length).toBe(7)
  })
})

// =============================================================================
// getStepConfig TESTS
// =============================================================================

describe('getStepConfig', () => {
  describe('valid steps', () => {
    const validSteps: OnboardingStep[] = [
      'profile',
      'group',
      'bank_account',
      'income',
      'expense',
      'credit_card',
      'done',
    ]

    validSteps.forEach(stepId => {
      it(`returns config for "${stepId}" step`, () => {
        const config = getStepConfig(stepId)
        expect(config).toBeDefined()
        expect(config.id).toBe(stepId)
        expect(typeof config.title).toBe('string')
        expect(typeof config.description).toBe('string')
        expect(typeof config.optional).toBe('boolean')
        expect(typeof config.order).toBe('number')
      })
    })
  })

  describe('invalid steps', () => {
    it('throws error for unknown step', () => {
      expect(() => getStepConfig('unknown' as OnboardingStep)).toThrow('Unknown step: unknown')
    })

    it('throws error for empty string', () => {
      expect(() => getStepConfig('' as OnboardingStep)).toThrow('Unknown step: ')
    })
  })
})

// =============================================================================
// getNextStep TESTS
// =============================================================================

describe('getNextStep', () => {
  describe('sequential navigation', () => {
    it('returns "group" after "profile"', () => {
      expect(getNextStep('profile')).toBe('group')
    })

    it('returns "bank_account" after "group"', () => {
      expect(getNextStep('group')).toBe('bank_account')
    })

    it('returns "income" after "bank_account"', () => {
      expect(getNextStep('bank_account')).toBe('income')
    })

    it('returns "expense" after "income"', () => {
      expect(getNextStep('income')).toBe('expense')
    })

    it('returns "credit_card" after "expense"', () => {
      expect(getNextStep('expense')).toBe('credit_card')
    })

    it('returns "done" after "credit_card"', () => {
      expect(getNextStep('credit_card')).toBe('done')
    })
  })

  describe('boundary conditions', () => {
    it('returns null for "done" (last step)', () => {
      expect(getNextStep('done')).toBeNull()
    })

    it('returns null for unknown step', () => {
      expect(getNextStep('unknown' as OnboardingStep)).toBeNull()
    })
  })
})

// =============================================================================
// getPreviousStep TESTS
// =============================================================================

describe('getPreviousStep', () => {
  describe('sequential navigation', () => {
    it('returns "credit_card" before "done"', () => {
      expect(getPreviousStep('done')).toBe('credit_card')
    })

    it('returns "expense" before "credit_card"', () => {
      expect(getPreviousStep('credit_card')).toBe('expense')
    })

    it('returns "income" before "expense"', () => {
      expect(getPreviousStep('expense')).toBe('income')
    })

    it('returns "bank_account" before "income"', () => {
      expect(getPreviousStep('income')).toBe('bank_account')
    })

    it('returns "group" before "bank_account"', () => {
      expect(getPreviousStep('bank_account')).toBe('group')
    })

    it('returns "profile" before "group"', () => {
      expect(getPreviousStep('group')).toBe('profile')
    })
  })

  describe('boundary conditions', () => {
    it('returns null for "profile" (first step)', () => {
      expect(getPreviousStep('profile')).toBeNull()
    })

    it('returns null for unknown step', () => {
      expect(getPreviousStep('unknown' as OnboardingStep)).toBeNull()
    })
  })
})

// =============================================================================
// isFirstStep TESTS
// =============================================================================

describe('isFirstStep', () => {
  it('returns true for "profile"', () => {
    expect(isFirstStep('profile')).toBe(true)
  })

  it('returns false for all other steps', () => {
    const otherSteps: OnboardingStep[] = ['group', 'bank_account', 'income', 'expense', 'credit_card', 'done']
    otherSteps.forEach(step => {
      expect(isFirstStep(step)).toBe(false)
    })
  })
})

// =============================================================================
// isLastStep TESTS
// =============================================================================

describe('isLastStep', () => {
  it('returns true for "done"', () => {
    expect(isLastStep('done')).toBe(true)
  })

  it('returns false for all other steps', () => {
    const otherSteps: OnboardingStep[] = ['profile', 'group', 'bank_account', 'income', 'expense', 'credit_card']
    otherSteps.forEach(step => {
      expect(isLastStep(step)).toBe(false)
    })
  })
})

// =============================================================================
// getStepIndex TESTS
// =============================================================================

describe('getStepIndex', () => {
  it('returns correct index for each step', () => {
    expect(getStepIndex('profile')).toBe(0)
    expect(getStepIndex('group')).toBe(1)
    expect(getStepIndex('bank_account')).toBe(2)
    expect(getStepIndex('income')).toBe(3)
    expect(getStepIndex('expense')).toBe(4)
    expect(getStepIndex('credit_card')).toBe(5)
    expect(getStepIndex('done')).toBe(6)
  })

  it('returns -1 for unknown step', () => {
    expect(getStepIndex('unknown' as OnboardingStep)).toBe(-1)
  })
})

// =============================================================================
// getTotalSteps TESTS
// =============================================================================

describe('getTotalSteps', () => {
  it('returns total steps excluding "done"', () => {
    // Total is 7 steps, but getTotalSteps excludes 'done', so it returns 6
    expect(getTotalSteps()).toBe(6)
  })

  it('equals STEP_ORDER.length - 1', () => {
    expect(getTotalSteps()).toBe(STEP_ORDER.length - 1)
  })
})

// =============================================================================
// calculateProgress TESTS
// =============================================================================

describe('calculateProgress', () => {
  describe('progress values for each step', () => {
    it('returns 0 for "profile" (first step)', () => {
      expect(calculateProgress('profile')).toBe(0)
    })

    it('returns 20 for "group" (second step)', () => {
      expect(calculateProgress('group')).toBe(20)
    })

    it('returns 40 for "bank_account" (third step)', () => {
      expect(calculateProgress('bank_account')).toBe(40)
    })

    it('returns 60 for "income" (fourth step)', () => {
      expect(calculateProgress('income')).toBe(60)
    })

    it('returns 80 for "expense" (fifth step)', () => {
      expect(calculateProgress('expense')).toBe(80)
    })

    it('returns 100 for "credit_card" (last visible step)', () => {
      expect(calculateProgress('credit_card')).toBe(100)
    })

    it('returns 100 for "done" (clamped to max)', () => {
      expect(calculateProgress('done')).toBe(100)
    })
  })

  describe('corner cases', () => {
    it('returns 0 for unknown step (index -1)', () => {
      expect(calculateProgress('unknown' as OnboardingStep)).toBe(0)
    })

    it('returns integer values (no decimals)', () => {
      STEP_ORDER.forEach(step => {
        const progress = calculateProgress(step)
        expect(Number.isInteger(progress)).toBe(true)
      })
    })

    it('never returns negative values', () => {
      STEP_ORDER.forEach(step => {
        expect(calculateProgress(step)).toBeGreaterThanOrEqual(0)
      })
    })

    it('never returns values greater than 100', () => {
      STEP_ORDER.forEach(step => {
        expect(calculateProgress(step)).toBeLessThanOrEqual(100)
      })
    })
  })
})

// =============================================================================
// canAutoShow TESTS
// =============================================================================

describe('canAutoShow', () => {
  describe('status-based rules', () => {
    it('returns false when status is "completed"', () => {
      expect(canAutoShow('completed', null, false)).toBe(false)
    })

    it('returns false when status is "dismissed"', () => {
      expect(canAutoShow('dismissed', null, false)).toBe(false)
    })

    it('returns true when status is "in_progress" and other conditions met', () => {
      expect(canAutoShow('in_progress', null, false)).toBe(true)
    })

    it('returns true when status is null and other conditions met', () => {
      expect(canAutoShow(null, null, false)).toBe(true)
    })
  })

  describe('autoShownAt-based rules', () => {
    it('returns false when autoShownAt is set (already shown once)', () => {
      const autoShownAt = new Date('2025-01-15T10:00:00Z')
      expect(canAutoShow(null, autoShownAt, false)).toBe(false)
      expect(canAutoShow('in_progress', autoShownAt, false)).toBe(false)
    })

    it('returns true when autoShownAt is null', () => {
      expect(canAutoShow(null, null, false)).toBe(true)
    })
  })

  describe('isMinimumSetupComplete-based rules', () => {
    it('returns false when minimum setup is complete', () => {
      expect(canAutoShow(null, null, true)).toBe(false)
      expect(canAutoShow('in_progress', null, true)).toBe(false)
    })

    it('returns true when minimum setup is incomplete', () => {
      expect(canAutoShow(null, null, false)).toBe(true)
    })
  })

  describe('combined conditions', () => {
    it('returns true only when ALL conditions are met', () => {
      // All conditions met: status not completed/dismissed, autoShownAt null, setup incomplete
      expect(canAutoShow(null, null, false)).toBe(true)
      expect(canAutoShow('in_progress', null, false)).toBe(true)
    })

    it('returns false when any condition fails', () => {
      // Status is completed
      expect(canAutoShow('completed', null, false)).toBe(false)
      
      // Status is dismissed
      expect(canAutoShow('dismissed', null, false)).toBe(false)
      
      // Already auto-shown
      expect(canAutoShow(null, new Date(), false)).toBe(false)
      
      // Setup complete
      expect(canAutoShow(null, null, true)).toBe(false)
      
      // Multiple failures
      expect(canAutoShow('completed', new Date(), true)).toBe(false)
    })
  })

  describe('all status values', () => {
    const statuses: (OnboardingStatus | null)[] = [null, 'in_progress', 'completed', 'dismissed']
    
    statuses.forEach(status => {
      it(`handles status "${status}" correctly`, () => {
        const result = canAutoShow(status, null, false)
        if (status === 'completed' || status === 'dismissed') {
          expect(result).toBe(false)
        } else {
          expect(result).toBe(true)
        }
      })
    })
  })
})

// =============================================================================
// determineInitialStep TESTS
// =============================================================================

describe('determineInitialStep', () => {
  describe('no data exists (fresh user)', () => {
    it('returns "profile" when nothing exists', () => {
      expect(determineInitialStep(false, false, false, false, false)).toBe('profile')
    })
  })

  describe('progressive skipping', () => {
    it('returns "group" when only profile exists', () => {
      expect(determineInitialStep(true, false, false, false, false)).toBe('group')
    })

    it('returns "bank_account" when profile and group exist', () => {
      expect(determineInitialStep(true, true, false, false, false)).toBe('bank_account')
    })

    it('returns "income" when profile, group, and account exist', () => {
      expect(determineInitialStep(true, true, true, false, false)).toBe('income')
    })

    it('returns "expense" when profile, group, account, and income exist', () => {
      expect(determineInitialStep(true, true, true, true, false)).toBe('expense')
    })

    it('returns "credit_card" when all required data exists', () => {
      expect(determineInitialStep(true, true, true, true, true)).toBe('credit_card')
    })
  })

  describe('partial data scenarios', () => {
    it('returns "profile" if profile is missing even if other data exists', () => {
      // This shouldn't happen in practice, but test the logic
      expect(determineInitialStep(false, true, true, true, true)).toBe('profile')
    })

    it('returns "group" if group is missing even if later data exists', () => {
      expect(determineInitialStep(true, false, true, true, true)).toBe('group')
    })

    it('returns "bank_account" if account is missing even if income/expense exist', () => {
      expect(determineInitialStep(true, true, false, true, true)).toBe('bank_account')
    })
  })

  describe('all possible combinations (truth table)', () => {
    // Test all 32 combinations of 5 boolean inputs
    const combinations = [
      { args: [false, false, false, false, false] as const, expected: 'profile' },
      { args: [false, false, false, false, true] as const, expected: 'profile' },
      { args: [false, false, false, true, false] as const, expected: 'profile' },
      { args: [false, false, false, true, true] as const, expected: 'profile' },
      { args: [false, false, true, false, false] as const, expected: 'profile' },
      { args: [false, false, true, false, true] as const, expected: 'profile' },
      { args: [false, false, true, true, false] as const, expected: 'profile' },
      { args: [false, false, true, true, true] as const, expected: 'profile' },
      { args: [false, true, false, false, false] as const, expected: 'profile' },
      { args: [false, true, false, false, true] as const, expected: 'profile' },
      { args: [false, true, false, true, false] as const, expected: 'profile' },
      { args: [false, true, false, true, true] as const, expected: 'profile' },
      { args: [false, true, true, false, false] as const, expected: 'profile' },
      { args: [false, true, true, false, true] as const, expected: 'profile' },
      { args: [false, true, true, true, false] as const, expected: 'profile' },
      { args: [false, true, true, true, true] as const, expected: 'profile' },
      { args: [true, false, false, false, false] as const, expected: 'group' },
      { args: [true, false, false, false, true] as const, expected: 'group' },
      { args: [true, false, false, true, false] as const, expected: 'group' },
      { args: [true, false, false, true, true] as const, expected: 'group' },
      { args: [true, false, true, false, false] as const, expected: 'group' },
      { args: [true, false, true, false, true] as const, expected: 'group' },
      { args: [true, false, true, true, false] as const, expected: 'group' },
      { args: [true, false, true, true, true] as const, expected: 'group' },
      { args: [true, true, false, false, false] as const, expected: 'bank_account' },
      { args: [true, true, false, false, true] as const, expected: 'bank_account' },
      { args: [true, true, false, true, false] as const, expected: 'bank_account' },
      { args: [true, true, false, true, true] as const, expected: 'bank_account' },
      { args: [true, true, true, false, false] as const, expected: 'income' },
      { args: [true, true, true, false, true] as const, expected: 'income' },
      { args: [true, true, true, true, false] as const, expected: 'expense' },
      { args: [true, true, true, true, true] as const, expected: 'credit_card' },
    ]

    combinations.forEach(({ args, expected }) => {
      const [hasProfile, hasGroup, hasAccount, hasIncome, hasExpense] = args
      it(`returns "${expected}" for (profile:${hasProfile}, group:${hasGroup}, account:${hasAccount}, income:${hasIncome}, expense:${hasExpense})`, () => {
        expect(determineInitialStep(hasProfile, hasGroup, hasAccount, hasIncome, hasExpense)).toBe(expected)
      })
    })
  })
})

// =============================================================================
// isMinimumSetupComplete TESTS
// =============================================================================

describe('isMinimumSetupComplete', () => {
  describe('minimum requirements', () => {
    it('returns true when all minimums are met (1 account, 1 income, 1 expense)', () => {
      expect(isMinimumSetupComplete(1, 1, 1)).toBe(true)
    })

    it('returns true when exceeding minimums', () => {
      expect(isMinimumSetupComplete(5, 3, 10)).toBe(true)
    })
  })

  describe('missing requirements', () => {
    it('returns false when account is missing', () => {
      expect(isMinimumSetupComplete(0, 1, 1)).toBe(false)
    })

    it('returns false when income is missing', () => {
      expect(isMinimumSetupComplete(1, 0, 1)).toBe(false)
    })

    it('returns false when expense is missing', () => {
      expect(isMinimumSetupComplete(1, 1, 0)).toBe(false)
    })

    it('returns false when all are missing', () => {
      expect(isMinimumSetupComplete(0, 0, 0)).toBe(false)
    })
  })

  describe('partial requirements', () => {
    it('returns false when only account exists', () => {
      expect(isMinimumSetupComplete(1, 0, 0)).toBe(false)
    })

    it('returns false when only income exists', () => {
      expect(isMinimumSetupComplete(0, 1, 0)).toBe(false)
    })

    it('returns false when only expense exists', () => {
      expect(isMinimumSetupComplete(0, 0, 1)).toBe(false)
    })

    it('returns false when account and income exist but no expense', () => {
      expect(isMinimumSetupComplete(1, 1, 0)).toBe(false)
    })

    it('returns false when account and expense exist but no income', () => {
      expect(isMinimumSetupComplete(1, 0, 1)).toBe(false)
    })

    it('returns false when income and expense exist but no account', () => {
      expect(isMinimumSetupComplete(0, 1, 1)).toBe(false)
    })
  })

  describe('boundary values', () => {
    it('handles exactly 1 of each', () => {
      expect(isMinimumSetupComplete(1, 1, 1)).toBe(true)
    })

    it('handles large numbers', () => {
      expect(isMinimumSetupComplete(100, 50, 200)).toBe(true)
    })

    it('handles negative numbers (edge case - should be false)', () => {
      // Negative counts shouldn't happen in practice, but test the behavior
      expect(isMinimumSetupComplete(-1, 1, 1)).toBe(false)
      expect(isMinimumSetupComplete(1, -1, 1)).toBe(false)
      expect(isMinimumSetupComplete(1, 1, -1)).toBe(false)
    })
  })
})



