import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { AuthState } from '@/types/auth'

/**
 * Hook for managing authentication state.
 * Subscribes to auth state changes and provides current user info.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  // Start as not loading if Supabase isn't configured (avoids setState in effect)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured())

  useEffect(() => {
    // Early return if not configured - isLoading already set to false via initializer
    if (!isSupabaseConfigured()) {
      return
    }

    const client = getSupabase()
    let isActive = true

    // Safety: avoid an infinite loading state if the auth request hangs
    // (e.g. misconfigured Supabase URL or network issues).
    const timeoutId = window.setTimeout(() => {
      if (!isActive) return
      console.warn('Auth session check timed out; continuing unauthenticated.')
      setUser(null)
      setIsLoading(false)
    }, 7000)

    // Get initial session
    client.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isActive) return
        setUser(session?.user ?? null)
      })
      .catch((error) => {
        if (!isActive) return
        console.error('Failed to get session:', error)
        setUser(null)
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
        if (!isActive) return
        setIsLoading(false)
      })

    // Subscribe to auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        // #region agent log
        {
          const payload = {
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'src/hooks/use-auth.ts:useAuth:onAuthStateChange',
            message: 'Auth state changed',
            data: {
              event: _event,
              hasSession: Boolean(session),
            },
            timestamp: Date.now(),
          }
          if (window.location.protocol === 'http:') {
            fetch('http://localhost:7245/ingest/158be8d1-062b-42b2-98bb-ffafb90f1f2e', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).catch(() => {})
          } else {
            console.info('[debug-auth]', payload)
          }
        }
        // #endregion agent log

        window.clearTimeout(timeoutId)
        if (!isActive) return
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  }
}
