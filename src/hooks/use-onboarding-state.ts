/**
 * Hook for managing onboarding wizard state.
 * 
 * Handles:
 * - Fetching and persisting onboarding state from/to the server
 * - Computing minimum setup status from finance data
 * - Auto-show eligibility
 * - Step navigation and progress tracking
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { getOnboardingState, upsertOnboardingState } from '@/lib/supabase'
import {
  canAutoShow,
  isMinimumSetupComplete,
  getNextStep,
  getPreviousStep,
  calculateProgress,
  determineInitialStep,
} from '@/lib/onboarding/steps'
import type { BankAccount, OnboardingState, OnboardingStep } from '@/types'

export interface UseOnboardingStateReturn {
  /** Current onboarding state from server */
  state: OnboardingState | null
  /** Whether the state is loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether the wizard is currently active (open) */
  isWizardActive: boolean
  /** Whether the wizard should auto-show */
  shouldAutoShow: boolean
  /** Whether minimum setup is complete */
  isMinimumSetupComplete: boolean
  /** Finance accounts (used to prefill onboarding forms) */
  accounts: BankAccount[]
  /** Whether finance data is loading */
  isFinanceLoading: boolean
  /** Current step in the wizard */
  currentStep: OnboardingStep
  /** Progress percentage (0-100) */
  progress: number
  /** Open the wizard */
  openWizard: () => void
  /** Close the wizard without completing */
  closeWizard: () => void
  /** Move to the next step */
  nextStep: () => Promise<void>
  /** Move to the previous step */
  previousStep: () => Promise<void>
  /** Skip to a specific step */
  goToStep: (step: OnboardingStep) => Promise<void>
  /** Complete the onboarding */
  complete: () => Promise<void>
  /** Dismiss the onboarding (skip) */
  dismiss: () => Promise<void>
  /** Refetch the state */
  refetch: () => void
}

export function useOnboardingState(): UseOnboardingStateReturn {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { accounts, projects, singleShotIncome, fixedExpenses, singleShotExpenses, isLoading: financeLoading } = useFinanceData()
  const { isWizardOpen, openWizard: openWizardUi, closeWizard: closeWizardUi } = useOnboardingStore()
  
  const [state, setState] = useState<OnboardingState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoShown, setHasAutoShown] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Compute minimum setup status from finance data
  const minimumSetupComplete = useMemo(() => {
    const accountCount = accounts.length
    const incomeCount = projects.length + singleShotIncome.length
    const expenseCount = fixedExpenses.length + singleShotExpenses.length
    return isMinimumSetupComplete(accountCount, incomeCount, expenseCount)
  }, [accounts.length, projects.length, singleShotIncome.length, fixedExpenses.length, singleShotExpenses.length])

  // Compute whether auto-show should happen
  const shouldAutoShow = useMemo(() => {
    // Never auto-show while auth is resolving.
    if (isAuthLoading) return false
    // Never auto-show when unauthenticated.
    if (!isAuthenticated) return false
    if (financeLoading || isLoading) return false
    if (hasAutoShown) return false
    return canAutoShow(
      state?.status ?? null,
      state?.autoShownAt ?? null,
      minimumSetupComplete
    )
  }, [isAuthLoading, isAuthenticated, state?.status, state?.autoShownAt, minimumSetupComplete, financeLoading, isLoading, hasAutoShown])

  // Resume the wizard if onboarding is in progress and minimum setup is still incomplete.
  // This prevents bypassing onboarding via refresh when we're mid-flow.
  const shouldResume = useMemo(() => {
    if (isAuthLoading) return false
    if (!isAuthenticated) return false
    if (financeLoading || isLoading) return false
    if (minimumSetupComplete) return false
    return state?.status === 'in_progress'
  }, [isAuthLoading, isAuthenticated, state?.status, minimumSetupComplete, financeLoading, isLoading])

  // Current step (from state or computed initial)
  const stateCurrentStep = state?.currentStep
  const currentStep = useMemo((): OnboardingStep => {
    if (stateCurrentStep) {
      return stateCurrentStep
    }
    // Compute initial step based on existing data
    const hasAccount = accounts.length > 0
    const hasIncome = projects.length + singleShotIncome.length > 0
    const hasExpense = fixedExpenses.length + singleShotExpenses.length > 0
    // For profile/group, we don't have easy access to check if they're set,
    // so we start from the beginning
    return determineInitialStep(false, false, hasAccount, hasIncome, hasExpense)
  }, [stateCurrentStep, accounts.length, projects.length, singleShotIncome.length, fixedExpenses.length, singleShotExpenses.length])

  // Progress percentage
  const progress = useMemo(() => calculateProgress(currentStep), [currentStep])

  // Fetch onboarding state
  useEffect(() => {
    if (isAuthLoading) {
      // Keep loading until auth resolves so we don't mistakenly auto-start.
      setIsLoading(true)
      return
    }
    if (!isAuthenticated) {
      setIsLoading(false)
      setState(null)
      return
    }

    let mounted = true

    async function fetchState() {
      setError(null)
      setIsLoading(true)
      const result = await getOnboardingState()
      
      if (!mounted) return
      
      if (result.success) {
        setState(result.data)
      } else {
        setError(result.error ?? 'Failed to load onboarding state')
      }
      setIsLoading(false)
    }

    fetchState()

    return () => {
      mounted = false
    }
  }, [isAuthLoading, isAuthenticated, retryCount])

  // Auto-open the wizard when eligible or when resuming an in-progress onboarding
  useEffect(() => {
    if ((shouldAutoShow || shouldResume) && !isWizardOpen) {
      openWizardUi()
      setHasAutoShown(true)
      if (shouldAutoShow) {
        // Mark as auto-shown in the database
        void (async () => {
          const result = await upsertOnboardingState({
            status: 'in_progress',
            currentStep: currentStep,
            autoShownAt: new Date(),
          })
          if (!result.success) {
            setError(result.error)
          } else {
            setState(result.data)
          }
        })()
      }
    }
  }, [shouldAutoShow, shouldResume, isWizardOpen, currentStep, openWizardUi])

  const refetch = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  const openWizard = useCallback(() => {
    openWizardUi()
    // Update state to in_progress if not already
    if (state?.status !== 'in_progress') {
      void (async () => {
        setError(null)
        const result = await upsertOnboardingState({
          status: 'in_progress',
          currentStep: currentStep,
        })
        if (!result.success) {
          setError(result.error)
        } else {
          setState(result.data)
        }
      })()
    }
  }, [openWizardUi, state?.status, currentStep])

  const closeWizard = useCallback(() => {
    closeWizardUi()
  }, [closeWizardUi])

  const goToStep = useCallback(async (step: OnboardingStep) => {
    setError(null)
    const result = await upsertOnboardingState({
      status: 'in_progress',
      currentStep: step,
    })
    if (result.success) {
      setState(result.data)
      return
    }
    setError(result.error)
  }, [])

  const nextStep = useCallback(async () => {
    const next = getNextStep(currentStep)
    if (next) {
      await goToStep(next)
    }
  }, [currentStep, goToStep])

  const previousStep = useCallback(async () => {
    const prev = getPreviousStep(currentStep)
    if (prev) {
      await goToStep(prev)
    }
  }, [currentStep, goToStep])

  const complete = useCallback(async () => {
    setError(null)
    const result = await upsertOnboardingState({
      status: 'completed',
      currentStep: 'done',
      completedAt: new Date(),
    })
    if (result.success) {
      setState(result.data)
      closeWizardUi()
      return
    }
    setError(result.error)
  }, [closeWizardUi])

  const dismiss = useCallback(async () => {
    const result = await upsertOnboardingState({
      status: 'dismissed',
      dismissedAt: new Date(),
    })
    if (result.success) {
      setState(result.data)
    }
    closeWizardUi()
  }, [closeWizardUi])

  return {
    state,
    isLoading: isLoading || financeLoading,
    error,
    isWizardActive: isWizardOpen,
    shouldAutoShow,
    isMinimumSetupComplete: minimumSetupComplete,
    accounts,
    isFinanceLoading: financeLoading,
    currentStep,
    progress,
    openWizard,
    closeWizard,
    nextStep,
    previousStep,
    goToStep,
    complete,
    dismiss,
    refetch,
  }
}

