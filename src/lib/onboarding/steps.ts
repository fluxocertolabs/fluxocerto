/**
 * Onboarding step definitions and state helpers.
 * 
 * The onboarding wizard guides new users through setting up their account
 * with the minimum required data for cashflow projections.
 */

import type { OnboardingStep, OnboardingStatus } from '@/types'

/**
 * Step configuration for the onboarding wizard.
 */
export interface StepConfig {
  /** Step identifier */
  id: OnboardingStep
  /** Display title (pt-BR) */
  title: string
  /** Display description (pt-BR) */
  description: string
  /** Whether this step is optional */
  optional: boolean
  /** Order in the wizard (0-based) */
  order: number
}

/**
 * All onboarding steps in order.
 */
export const ONBOARDING_STEPS: StepConfig[] = [
  {
    id: 'profile',
    title: 'Seu Perfil',
    description: 'Configure seu nome de exibição',
    optional: false,
    order: 0,
  },
  {
    id: 'group',
    title: 'Seu Grupo',
    description: 'Dê um nome ao seu grupo financeiro',
    optional: false,
    order: 1,
  },
  {
    id: 'bank_account',
    title: 'Conta Bancária',
    description: 'Adicione sua primeira conta bancária',
    optional: false,
    order: 2,
  },
  {
    id: 'income',
    title: 'Renda',
    description: 'Adicione sua primeira fonte de renda (opcional)',
    optional: true,
    order: 3,
  },
  {
    id: 'expense',
    title: 'Despesa',
    description: 'Adicione sua primeira despesa fixa (opcional)',
    optional: true,
    order: 4,
  },
  {
    id: 'credit_card',
    title: 'Cartão de Crédito',
    description: 'Adicione um cartão de crédito (opcional)',
    optional: true,
    order: 5,
  },
  {
    id: 'done',
    title: 'Pronto!',
    description: 'Configuração mínima concluída',
    optional: false,
    order: 6,
  },
]

/**
 * Step IDs in order (for iteration).
 */
export const STEP_ORDER: OnboardingStep[] = ONBOARDING_STEPS.map(s => s.id)

/**
 * Get the configuration for a specific step.
 */
export function getStepConfig(stepId: OnboardingStep): StepConfig {
  const config = ONBOARDING_STEPS.find(s => s.id === stepId)
  if (!config) {
    throw new Error(`Unknown step: ${stepId}`)
  }
  return config
}

/**
 * Get the next step after the given step.
 * Returns null if this is the last step.
 */
export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return null
  }
  return STEP_ORDER[currentIndex + 1]
}

/**
 * Get the previous step before the given step.
 * Returns null if this is the first step.
 */
export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  if (currentIndex <= 0) {
    return null
  }
  return STEP_ORDER[currentIndex - 1]
}

/**
 * Check if a step is the first step.
 */
export function isFirstStep(step: OnboardingStep): boolean {
  return step === STEP_ORDER[0]
}

/**
 * Check if a step is the last step (done).
 */
export function isLastStep(step: OnboardingStep): boolean {
  return step === 'done'
}

/**
 * Get the step index (0-based).
 */
export function getStepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step)
}

/**
 * Get the total number of steps (excluding 'done').
 */
export function getTotalSteps(): number {
  return STEP_ORDER.length - 1 // Exclude 'done'
}

/**
 * Calculate progress percentage (0-100).
 */
export function calculateProgress(currentStep: OnboardingStep): number {
  const index = getStepIndex(currentStep)
  const totalSteps = getTotalSteps()
  if (index < 0 || totalSteps <= 1) return 0

  // We exclude the internal 'done' step from the UI flow, so the last visible step
  // should map to 100%. Clamp to avoid >100% when currentStep is 'done'.
  const lastVisibleIndex = totalSteps - 1
  const clampedIndex = Math.min(index, lastVisibleIndex)
  const denom = Math.max(1, lastVisibleIndex)
  return Math.round((clampedIndex / denom) * 100)
}

/**
 * Check if the onboarding can auto-show based on current state.
 * 
 * Auto-show rules:
 * - Status is not 'dismissed' or 'completed'
 * - auto_shown_at is null (never auto-shown before)
 * - Minimum setup is incomplete
 */
export function canAutoShow(
  status: OnboardingStatus | null,
  autoShownAt: Date | null,
  isMinimumSetupComplete: boolean
): boolean {
  // Already completed or dismissed - don't auto-show
  if (status === 'completed' || status === 'dismissed') {
    return false
  }
  
  // Already auto-shown once - don't auto-show again
  if (autoShownAt !== null) {
    return false
  }
  
  // Minimum setup complete - no need to show
  if (isMinimumSetupComplete) {
    return false
  }
  
  return true
}

/**
 * Determine the initial step for a new onboarding session.
 * Skips optional steps if their data already exists.
 */
export function determineInitialStep(
  hasProfile: boolean,
  hasGroup: boolean,
  hasAccount: boolean,
  hasIncome: boolean,
  hasExpense: boolean
): OnboardingStep {
  // Skip profile if already set
  if (hasProfile) {
    // Skip group if already set
    if (hasGroup) {
      // Skip bank_account if already has one
      if (hasAccount) {
        // Skip income if already has one
        if (hasIncome) {
          // Skip expense if already has one
          if (hasExpense) {
            return 'credit_card'
          }
          return 'expense'
        }
        return 'income'
      }
      return 'bank_account'
    }
    return 'group'
  }
  return 'profile'
}

/**
 * Check if minimum setup is complete.
 * Requires at least one account, one income source, and one expense.
 */
export function isMinimumSetupComplete(
  accountCount: number,
  incomeCount: number,
  expenseCount: number
): boolean {
  return accountCount >= 1 && incomeCount >= 1 && expenseCount >= 1
}


