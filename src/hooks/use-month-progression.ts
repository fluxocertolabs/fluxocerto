/**
 * Hook for automatic month progression at app launch.
 * 
 * This hook checks if the month has changed since the user's last visit
 * and promotes any future statements for the current month to become
 * the current statement balance.
 */

import { useState, useEffect, useCallback } from 'react'
import { usePreferencesStore } from '@/stores/preferences-store'
import { checkAndProgressMonth, type ProgressionResult } from '@/lib/cashflow/month-progression'
import { useAuth } from '@/hooks/use-auth'

export interface UseMonthProgressionResult {
  /** Whether the progression check is currently running */
  isChecking: boolean
  /** Result of the last progression check */
  result: ProgressionResult | null
  /** Error message if progression failed */
  error: string | null
  /** Manually trigger a progression check */
  checkProgression: () => Promise<void>
}

/**
 * Hook that manages automatic month progression.
 * 
 * Should be used at the app root level (e.g., in App.tsx or dashboard)
 * to ensure progression runs once per session at app launch.
 */
export function useMonthProgression(): UseMonthProgressionResult {
  const [isChecking, setIsChecking] = useState(true)
  const [result, setResult] = useState<ProgressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { isAuthenticated } = useAuth()
  const lastProgressionCheck = usePreferencesStore((state) => state.lastProgressionCheck)
  const setLastProgressionCheck = usePreferencesStore((state) => state.setLastProgressionCheck)

  const checkProgression = useCallback(async () => {
    setIsChecking(true)
    setError(null)

    try {
      const progressionResult = await checkAndProgressMonth(lastProgressionCheck)
      setResult(progressionResult)

      if (progressionResult.success) {
        // Update the last check timestamp
        const now = new Date().toISOString()
        setLastProgressionCheck(now)
        
        // Log if any progression happened
        if (progressionResult.progressedCards > 0 || progressionResult.cleanedStatements > 0) {
          console.log(
            `Month progression: ${progressionResult.progressedCards} cards updated, ` +
            `${progressionResult.cleanedStatements} old statements cleaned`
          )
        }
      } else {
        setError(progressionResult.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao verificar progressão de mês'
      setError(message)
      setResult({ success: false, error: message })
    } finally {
      setIsChecking(false)
    }
  }, [lastProgressionCheck, setLastProgressionCheck])

  // Run progression check on mount (when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      checkProgression()
    } else {
      setIsChecking(false)
    }
  }, [isAuthenticated, checkProgression])

  return {
    isChecking,
    result,
    error,
    checkProgression,
  }
}

