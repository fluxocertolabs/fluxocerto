/**
 * Hook for coordinated loading state management.
 * Provides unified loading state with minimum display time, timeout handling,
 * and smooth transitions between loading and content states.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LoadingConfig, CoordinatedLoadingState, LoadingPhase } from '@/types/loading'
import { ERROR_MESSAGES } from '@/types/loading'

const DEFAULT_CONFIG: Required<LoadingConfig> = {
  minDisplayTime: 100,
  // 5s was too aggressive in cold-cache scenarios (e.g. first load, mobile, or
  // under heavy parallel load). A premature timeout flips the UI into an error
  // state even if data arrives shortly after.
  timeoutThreshold: 15000,
  enableDevLogging: import.meta.env.DEV,
}

/**
 * Coordinates loading states to provide a smooth, non-flickering loading experience.
 *
 * Features:
 * - Minimum display time to prevent skeleton flash on fast loads
 * - Timeout handling to show error after extended loading
 * - Development logging for load time debugging
 * - Unified state for skeleton/error display
 *
 * @param isLoading - Whether data is currently being loaded
 * @param error - Error message if loading failed (null if no error)
 * @param onRetry - Callback to retry the loading operation
 * @param config - Optional configuration overrides
 * @returns Coordinated loading state for use with PageLoadingWrapper
 */
export function useCoordinatedLoading(
  isLoading: boolean,
  error: string | null,
  onRetry: () => void,
  config?: LoadingConfig
): CoordinatedLoadingState {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  const [phase, setPhase] = useState<LoadingPhase>('idle')
  const [showSkeleton, setShowSkeleton] = useState(false)
  const loadingStartRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle loading start
  useEffect(() => {
    // Start a new loading cycle only from stable phases.
    //
    // IMPORTANT: Do NOT reset `timeout` back to `loading` while `isLoading` remains true.
    // Otherwise the UI will bounce from "timeout error" → "loading skeleton" immediately,
    // making it impossible to actually see/click the retry state and causing E2E flakes
    // where pages appear stuck behind the skeleton forever.
    if (isLoading && (phase === 'idle' || phase === 'success' || phase === 'error')) {
      // Clear any in-flight timers from a prior cycle.
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (minTimeRef.current) {
        clearTimeout(minTimeRef.current)
        minTimeRef.current = null
      }

      loadingStartRef.current = Date.now()
      setPhase('loading')
      setShowSkeleton(true)

      // Set timeout for extended loading
      timeoutRef.current = setTimeout(() => {
        setPhase('timeout')
      }, mergedConfig.timeoutThreshold)

      if (mergedConfig.enableDevLogging) {
        console.log('[Loading] Started')
      }
    }
  }, [isLoading, phase, mergedConfig.timeoutThreshold, mergedConfig.enableDevLogging])

  // Handle loading complete (including late completion after a timeout)
  useEffect(() => {
    if (!isLoading && (phase === 'loading' || phase === 'timeout')) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (error) {
        setPhase('error')
        setShowSkeleton(false)
      } else {
        // Ensure minimum display time
        const elapsed = Date.now() - (loadingStartRef.current ?? 0)
        const remaining = Math.max(0, mergedConfig.minDisplayTime - elapsed)

        minTimeRef.current = setTimeout(() => {
          setPhase('success')
          setShowSkeleton(false)

          if (mergedConfig.enableDevLogging) {
            const totalTime = Date.now() - (loadingStartRef.current ?? 0)
            console.log(`[Loading] Complete in ${totalTime}ms`)
          }
        }, remaining)
      }
    }
  }, [isLoading, error, phase, mergedConfig.minDisplayTime, mergedConfig.enableDevLogging])

  // Handle error during loading
  useEffect(() => {
    if (error && phase === 'loading') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setPhase('error')
      setShowSkeleton(false)
    }
  }, [error, phase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (minTimeRef.current) clearTimeout(minTimeRef.current)
    }
  }, [])

  // Retry handler - resets state and triggers retry callback
  const retry = useCallback(() => {
    setPhase('idle')
    setShowSkeleton(false)
    loadingStartRef.current = null
    onRetry()
  }, [onRetry])

  // Determine error message based on phase
  const errorMessage =
    phase === 'timeout'
      ? ERROR_MESSAGES.timeout
      : error

  return {
    phase,
    showSkeleton,
    showError: phase === 'error' || phase === 'timeout',
    errorMessage,
    loadingStartTime: loadingStartRef.current,
    retry,
  }
}

