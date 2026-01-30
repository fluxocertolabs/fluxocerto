import { useState, useEffect, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { AuthState } from '@/types/auth'
import { captureEvent, identifyUser, resetAnalytics } from '@/lib/analytics/posthog'
import { setSentryUser } from '@/lib/observability/sentry'

function safeParseDateMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

function getAuthAnalyticsProps(user: User): { isFirstLogin: boolean | null; accountAgeDays: number | null } {
  // Supabase User has created_at and last_sign_in_at as ISO strings (may be null/undefined depending on provider).
  const createdMs = safeParseDateMs((user as unknown as { created_at?: string }).created_at)
  const lastSignInMs = safeParseDateMs((user as unknown as { last_sign_in_at?: string | null }).last_sign_in_at)

  let isFirstLogin: boolean | null = null
  if (createdMs !== null && lastSignInMs !== null) {
    // Heuristic: first login typically has created_at ~= last_sign_in_at.
    // Use a small tolerance to account for server timestamps.
    isFirstLogin = Math.abs(lastSignInMs - createdMs) <= 5 * 60 * 1000
  }

  const now = Date.now()
  const accountAgeDays =
    createdMs !== null && createdMs <= now ? Math.floor((now - createdMs) / (24 * 60 * 60 * 1000)) : null

  return { isFirstLogin, accountAgeDays }
}

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
      const { isFirstLogin, accountAgeDays } = user ? getAuthAnalyticsProps(user) : { isFirstLogin: null, accountAgeDays: null }
      identifyUser(
        currentUserId,
        {
          is_first_login: isFirstLogin,
        },
        {
          // "Once" properties are useful for cohorting and won't flap on subsequent logins.
          supabase_account_age_days_at_first_seen: accountAgeDays,
        }
      )
      captureEvent('login_succeeded', {
        is_first_login: isFirstLogin,
        supabase_account_age_days: accountAgeDays,
      })
      setSentryUser({ id: currentUserId })
    }

    if (!currentUserId && previousUserId) {
      resetAnalytics()
      setSentryUser(null)
    }

    lastUserIdRef.current = currentUserId
  }, [user])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  }
}
