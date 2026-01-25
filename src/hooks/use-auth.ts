import { useState, useEffect, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { AuthState } from '@/types/auth'
import { captureEvent, identifyUser, resetAnalytics } from '@/lib/analytics/posthog'
import { setSentryUser } from '@/lib/observability/sentry'

/**
 * Hook for managing authentication state.
 * Subscribes to auth state changes and provides current user info.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  // Start as not loading if Supabase isn't configured (avoids setState in effect)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured())
  const lastUserIdRef = useRef<string | null>(null)

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
    }, 15000)

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

  useEffect(() => {
    const currentUserId = user?.id ?? null
    const previousUserId = lastUserIdRef.current

    if (currentUserId && currentUserId !== previousUserId) {
      identifyUser(currentUserId)
      captureEvent('login_succeeded')
      setSentryUser({ id: currentUserId })
    }

    if (!currentUserId && previousUserId) {
      resetAnalytics()
      setSentryUser(null)
    }

    lastUserIdRef.current = currentUserId
  }, [user?.id])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  }
}
