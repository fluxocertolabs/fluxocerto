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

    // Get initial session
    client.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch((error) => {
        console.error('Failed to get session:', error)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    // Subscribe to auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  }
}
