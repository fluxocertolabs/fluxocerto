/**
 * Hook for managing theme state with Supabase sync.
 * Handles fetching preference on login and syncing on toggle.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useThemeStore } from '@/stores/theme-store'
import {
  getThemePreference,
  saveThemePreference,
} from '@/lib/theme-service'
import { useAuth } from '@/hooks/use-auth'
import type { ThemeValue, ResolvedTheme } from '@/types/theme'

interface UseThemeReturn {
  /** Current theme preference */
  theme: ThemeValue
  /** Resolved theme (light or dark) after system preference is applied */
  resolvedTheme: ResolvedTheme
  /** Whether theme has been loaded */
  isLoaded: boolean
  /** Set theme preference (syncs to Supabase in background) */
  setTheme: (theme: ThemeValue) => void
}

/**
 * Hook for theme management with Supabase synchronization.
 * 
 * Behavior:
 * - On mount: Uses localStorage value (set by theme store)
 * - On login: Fetches preference from Supabase and updates local state
 * - On toggle: Updates local state immediately, syncs to Supabase in background
 */
export function useTheme(): UseThemeReturn {
  const { theme, resolvedTheme, isLoaded, setTheme: setThemeStore } = useThemeStore()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const hasSyncedRef = useRef(false)
  const previousAuthRef = useRef(isAuthenticated)

  // Fetch theme from Supabase when user logs in
  useEffect(() => {
    // Skip if auth is still loading
    if (isAuthLoading) {
      return
    }

    // Detect login (was not authenticated, now is)
    const justLoggedIn = isAuthenticated && !previousAuthRef.current
    previousAuthRef.current = isAuthenticated

    // Only sync once per login session
    if (!justLoggedIn && hasSyncedRef.current) {
      return
    }

    if (!isAuthenticated) {
      hasSyncedRef.current = false
      return
    }

    // User just logged in - fetch their preference from Supabase
    hasSyncedRef.current = true

    const syncFromSupabase = async () => {
      try {
        const remoteTheme = await getThemePreference()
        if (remoteTheme) {
          // Remote preference exists - apply it
          console.info(`Theme synced from Supabase: ${remoteTheme}`)
          setThemeStore(remoteTheme)
        }
        // If no remote preference, keep local preference (don't reset to default)
      } catch (error) {
        console.warn('Failed to sync theme from Supabase:', error)
        // Keep local preference on error
      }
    }

    syncFromSupabase()
  }, [isAuthenticated, isAuthLoading, setThemeStore])

  // Wrapper to set theme with background Supabase sync
  const setTheme = useCallback(
    (newTheme: ThemeValue) => {
      // Update local state immediately (optimistic)
      setThemeStore(newTheme)

      // Sync to Supabase in background (non-blocking)
      if (isAuthenticated) {
        saveThemePreference(newTheme).catch((error) => {
          console.warn('Background theme sync failed:', error)
        })
      }
    },
    [isAuthenticated, setThemeStore]
  )

  return {
    theme,
    resolvedTheme,
    isLoaded,
    setTheme,
  }
}

