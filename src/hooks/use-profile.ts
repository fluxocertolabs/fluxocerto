/**
 * Hook for managing user profile data.
 * 
 * Handles:
 * - Reading display name from profiles.name
 * - Reading auth email from session (read-only)
 * - Reading/writing email_notifications_enabled preference
 * - Updating display name
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  getSupabase,
  isSupabaseConfigured,
  getEmailNotificationsEnabled,
  setEmailNotificationsEnabled,
  handleSupabaseError,
} from '@/lib/supabase'
import { notifyGroupDataInvalidated } from '@/lib/group-data-events'
import type { Result } from '@/stores/finance-store'

export interface ProfileData {
  /** Display name from profiles.name */
  name: string
  /** Auth email (read-only) */
  email: string
  /** Whether email notifications are enabled (default: true when missing) */
  emailNotificationsEnabled: boolean
}

export interface UseProfileReturn {
  /** Profile data */
  profile: ProfileData | null
  /** Whether the profile is loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Update the display name */
  updateName: (name: string) => Promise<Result<void>>
  /** Update the email notifications preference */
  updateEmailNotifications: (enabled: boolean) => Promise<Result<void>>
  /** Refetch the profile data */
  refetch: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const { user, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!isSupabaseConfigured() || !isAuthenticated || !user?.email) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const client = getSupabase()

      // Fetch profile name
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('name')
        .eq('email', user.email.toLowerCase())
        .single()

      if (profileError) {
        // PGRST116 means no rows - shouldn't happen for authenticated users
        if (profileError.code !== 'PGRST116') {
          setError('Falha ao carregar perfil')
          setIsLoading(false)
          return
        }
      }

      // Fetch email notifications preference
      const emailPrefResult = await getEmailNotificationsEnabled()
      const emailNotificationsEnabled = emailPrefResult.success
        ? emailPrefResult.data ?? true
        : true // Default to enabled on error

      setProfile({
        name: profileData?.name ?? '',
        email: user.email,
        emailNotificationsEnabled,
      })
      setIsLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.email])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateName = useCallback(
    async (name: string): Promise<Result<void>> => {
      if (!isSupabaseConfigured() || !user?.email) {
        return { success: false, error: 'Supabase não está configurado' }
      }

      try {
        const client = getSupabase()

        const { error: updateError } = await client
          .from('profiles')
          .update({ name })
          .eq('email', user.email.toLowerCase())

        if (updateError) {
          return handleSupabaseError(updateError)
        }

        // Update local state
        setProfile((prev) => (prev ? { ...prev, name } : null))

        // Notify other components that group data has changed
        // (so they can refetch and show the updated name)
        notifyGroupDataInvalidated()

        return { success: true, data: undefined }
      } catch (err) {
        return handleSupabaseError(err)
      }
    },
    [user?.email]
  )

  const updateEmailNotifications = useCallback(
    async (enabled: boolean): Promise<Result<void>> => {
      // Capture previous value before optimistic update
      const previousValue = profile?.emailNotificationsEnabled ?? true

      // Optimistic update
      setProfile((prev) =>
        prev ? { ...prev, emailNotificationsEnabled: enabled } : null
      )

      const result = await setEmailNotificationsEnabled(enabled)

      if (!result.success) {
        // Revert to captured previous value
        setProfile((prev) =>
          prev ? { ...prev, emailNotificationsEnabled: previousValue } : null
        )
      }

      return result
    },
    [profile?.emailNotificationsEnabled]
  )

  return {
    profile,
    isLoading,
    error,
    updateName,
    updateEmailNotifications,
    refetch: fetchProfile,
  }
}

