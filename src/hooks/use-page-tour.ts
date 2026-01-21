/**
 * Hook for managing page tour state.
 * 
 * Handles:
 * - Fetching and persisting tour state from/to the server
 * - Auto-show eligibility (first visit, version bump)
 * - Deferral while onboarding wizard is active
 * - Tour replay functionality
 * - Integration with global tour store for manual triggering
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useTourStore } from '@/stores/tour-store'
import { getTourState, upsertTourState } from '@/lib/supabase'
import { getTourDefinition, getTourVersion, isTourUpdated } from '@/lib/tours/definitions'
import { captureEvent } from '@/lib/analytics/posthog'
import type { TourKey, TourState, TourStatus } from '@/types'

type LocalTourCache = {
  status: TourStatus
  version: number
  updatedAt: number
}

function readLocalTourCache(storageKey: string): LocalTourCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const rec = parsed as Record<string, unknown>
    const status = rec.status
    const version = rec.version
    const updatedAt = rec.updatedAt

    if (
      (status === 'completed' || status === 'dismissed') &&
      typeof version === 'number' &&
      typeof updatedAt === 'number'
    ) {
      return { status, version, updatedAt }
    }

    return null
  } catch {
    return null
  }
}

function writeLocalTourCache(storageKey: string, value: LocalTourCache) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Best-effort only (private mode, disabled storage, quota, etc.)
  }
}

export interface UsePageTourReturn {
  /** Current tour state from server */
  state: TourState | null
  /** Whether the state is loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether the tour is currently running */
  isTourActive: boolean
  /** Whether the tour should auto-show */
  shouldAutoShow: boolean
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Total number of steps */
  totalSteps: number
  /** Start the tour */
  startTour: () => void
  /** Move to the next step */
  nextStep: () => void
  /** Move to the previous step */
  previousStep: () => void
  /** Complete the tour */
  completeTour: () => Promise<void>
  /** Dismiss the tour (skip) */
  dismissTour: () => Promise<void>
  /** Refetch the state */
  refetch: () => void
}

export function usePageTour(tourKey: TourKey): UsePageTourReturn {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const isWizardActive = useOnboardingStore(s => s.isWizardOpen)
  const { activeTourKey, stopTour: stopGlobalTour } = useTourStore()
  
  const [state, setState] = useState<TourState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTourActive, setIsTourActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [hasAutoShown, setHasAutoShown] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const hasTrackedStart = useRef(false)

  const tourDefinition = useMemo(() => getTourDefinition(tourKey), [tourKey])
  const totalSteps = tourDefinition.steps.length
  const currentVersion = getTourVersion(tourKey)

  const userId = user?.id ?? null
  const localStorageKey = useMemo(() => {
    if (!userId) return null
    return `fluxocerto:tour:${userId}:${tourKey}`
  }, [userId, tourKey])

  // Read on each render so changes written during this session are reflected immediately.
  const localCache = localStorageKey ? readLocalTourCache(localStorageKey) : null
  
  const trackTourStart = useCallback(
    (reason: 'auto' | 'manual') => {
      if (hasTrackedStart.current) return
      hasTrackedStart.current = true
      captureEvent('tour_started', { tour_key: tourKey, reason })
    },
    [tourKey]
  )

  // Respond to global tour store triggers (from header "Mostrar tour" button)
  useEffect(() => {
    if (activeTourKey === tourKey && !isTourActive && !isWizardActive) {
      setIsTourActive(true)
      setCurrentStepIndex(0)
      trackTourStart('manual')
      // Clear the global trigger
      stopGlobalTour()
    } else if (activeTourKey === tourKey && isWizardActive) {
      // Clear the trigger but don't start tour - wizard is active
      stopGlobalTour()
    }
  }, [activeTourKey, tourKey, isTourActive, isWizardActive, stopGlobalTour, trackTourStart])

  // Compute whether auto-show should happen
  const shouldAutoShow = useMemo(() => {
    // Never auto-show while auth is resolving.
    if (isAuthLoading) return false
    // Never auto-show when unauthenticated (can't persist state).
    if (!isAuthenticated) return false
    // Don't auto-show while loading
    if (isLoading) return false
    // If we couldn't load state and we don't have a local fallback, don't auto-show.
    // (Prevents re-triggering tours repeatedly due to transient backend issues.)
    if (error && !localCache) return false
    // Don't auto-show if already shown this session
    if (hasAutoShown) return false
    // Don't auto-show while onboarding wizard is active
    if (isWizardActive) return false
    // Don't auto-show if tour is already active
    if (isTourActive) return false
    
    // Auto-show if:
    // 1. No state exists (first visit)
    // 2. Tour version has been updated since completion
    const effective = state ?? localCache
    if (!effective) return true
    if (effective.status === 'completed' && isTourUpdated(tourKey, effective.version)) return true
    
    return false
  }, [isAuthLoading, isAuthenticated, isLoading, error, localCache, hasAutoShown, isWizardActive, isTourActive, state, tourKey])

  // Fetch tour state
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
      const result = await getTourState(tourKey)
      
      if (!mounted) return
      
      if (result.success) {
        setState(result.data)
        if (result.data && localStorageKey) {
          writeLocalTourCache(localStorageKey, {
            status: result.data.status,
            version: result.data.version,
            updatedAt: Date.now(),
          })
        }
      } else {
        setError(result.error ?? 'Failed to load tour state')
      }
      setIsLoading(false)
    }

    fetchState()

    return () => {
      mounted = false
    }
  }, [isAuthLoading, isAuthenticated, tourKey, retryCount, localStorageKey])

  // Auto-show the tour when eligible
  useEffect(() => {
    if (shouldAutoShow && !isTourActive) {
      setIsTourActive(true)
      setHasAutoShown(true)
      setCurrentStepIndex(0)
      trackTourStart('auto')
    }
  }, [shouldAutoShow, isTourActive, trackTourStart])

  // Stop tour if onboarding wizard becomes active (handles race condition)
  useEffect(() => {
    if (isWizardActive && isTourActive) {
      // Onboarding wizard takes priority - stop the tour
      setIsTourActive(false)
      setCurrentStepIndex(0)
      // Don't mark as auto-shown so it can auto-show after wizard closes
      setHasAutoShown(false)
      hasTrackedStart.current = false
    }
  }, [isWizardActive, isTourActive])

  const refetch = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  const startTour = useCallback(() => {
    setIsTourActive(true)
    setCurrentStepIndex(0)
    trackTourStart('manual')
  }, [trackTourStart])

  const nextStep = useCallback(() => {
    setCurrentStepIndex(i => (i < totalSteps - 1 ? i + 1 : i))
  }, [totalSteps])

  const previousStep = useCallback(() => {
    setCurrentStepIndex(i => (i > 0 ? i - 1 : i))
  }, [])

  const completeTour = useCallback(async () => {
    if (localStorageKey) {
      writeLocalTourCache(localStorageKey, {
        status: 'completed',
        version: currentVersion,
        updatedAt: Date.now(),
      })
    }
    // Close immediately; persist in background.
    setIsTourActive(false)
    setCurrentStepIndex(0)
    hasTrackedStart.current = false
    captureEvent('tour_completed', { tour_key: tourKey })

    const result = await upsertTourState(tourKey, {
      status: 'completed' as TourStatus,
      version: currentVersion,
    })
    if (result.success) {
      setState(result.data)
    } else {
      setError(result.error ?? 'Failed to persist tour state')
    }
  }, [tourKey, currentVersion, localStorageKey])

  const dismissTour = useCallback(async () => {
    if (localStorageKey) {
      writeLocalTourCache(localStorageKey, {
        status: 'dismissed',
        version: currentVersion,
        updatedAt: Date.now(),
      })
    }
    // Close immediately; persist in background.
    setIsTourActive(false)
    setCurrentStepIndex(0)
    hasTrackedStart.current = false
    captureEvent('tour_dismissed', { tour_key: tourKey })

    const result = await upsertTourState(tourKey, {
      status: 'dismissed' as TourStatus,
      version: currentVersion,
    })
    if (result.success) {
      setState(result.data)
    } else {
      setError(result.error ?? 'Failed to persist tour state')
    }
  }, [tourKey, currentVersion, localStorageKey])

  return {
    state,
    isLoading,
    error,
    isTourActive,
    shouldAutoShow,
    currentStepIndex,
    totalSteps,
    startTour,
    nextStep,
    previousStep,
    completeTour,
    dismissTour,
    refetch,
  }
}

