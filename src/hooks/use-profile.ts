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
  getAnalyticsEnabled,
  setAnalyticsEnabled,
  getSessionRecordingsEnabled,
  setSessionRecordingsEnabled,
  handleSupabaseError,
} from '@/lib/supabase'
import { notifyGroupDataInvalidated } from '@/lib/group-data-events'
import type { Result } from '@/stores/finance-store'
import { setAnalyticsConsent } from '@/lib/analytics/posthog'

export interface ProfileData {
  /** Display name from profiles.name */
  name: string
  /** Auth email (read-only) */
  email: string
  /** Whether email notifications are enabled (default: true when missing) */
  emailNotificationsEnabled: boolean
  /** Whether analytics are enabled (default: true when missing) */
  analyticsEnabled: boolean
  /** Whether session recordings are enabled (default: true when missing) */
  sessionRecordingsEnabled: boolean
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
  /** Update analytics preference */
  updateAnalytics: (enabled: boolean) => Promise<Result<void>>
  /** Update session recordings preference */
  updateSessionRecordings: (enabled: boolean) => Promise<Result<void>>
  /** Refetch the profile data */
  refetch: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!isSupabaseConfigured() || !user?.email) {
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

      const analyticsPrefResult = await getAnalyticsEnabled()
      const analyticsEnabled = analyticsPrefResult.success
        ? analyticsPrefResult.data ?? true
        : true

      const recordingsPrefResult = await getSessionRecordingsEnabled()
      const sessionRecordingsEnabled = recordingsPrefResult.success
        ? recordingsPrefResult.data ?? true
        : true

      setProfile({
        name: profileData?.name ?? '',
        email: user.email,
        emailNotificationsEnabled,
        analyticsEnabled,
        sessionRecordingsEnabled,
      })
      setAnalyticsConsent({
        analytics: analyticsEnabled,
        recordings: sessionRecordingsEnabled,
      })
      setIsLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      setIsLoading(false)
    }
  }, [user])

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
    [user]
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

  const updateAnalytics = useCallback(
    async (enabled: boolean): Promise<Result<void>> => {
      const previousValue = profile?.analyticsEnabled ?? true

      setProfile((prev) =>
        prev ? { ...prev, analyticsEnabled: enabled } : null
      )

      setAnalyticsConsent({
        analytics: enabled,
        recordings: profile?.sessionRecordingsEnabled ?? true,
      })

      const result = await setAnalyticsEnabled(enabled)

      if (!result.success) {
        setProfile((prev) =>
          prev ? { ...prev, analyticsEnabled: previousValue } : null
        )
        setAnalyticsConsent({
          analytics: previousValue,
          recordings: profile?.sessionRecordingsEnabled ?? true,
        })
      }

      return result
    },
    [profile?.analyticsEnabled, profile?.sessionRecordingsEnabled]
  )

  const updateSessionRecordings = useCallback(
    async (enabled: boolean): Promise<Result<void>> => {
      const previousValue = profile?.sessionRecordingsEnabled ?? true

      setProfile((prev) =>
        prev ? { ...prev, sessionRecordingsEnabled: enabled } : null
      )

      setAnalyticsConsent({
        analytics: profile?.analyticsEnabled ?? true,
        recordings: enabled,
      })

      const result = await setSessionRecordingsEnabled(enabled)

      if (!result.success) {
        setProfile((prev) =>
          prev ? { ...prev, sessionRecordingsEnabled: previousValue } : null
        )
        setAnalyticsConsent({
          analytics: profile?.analyticsEnabled ?? true,
          recordings: previousValue,
        })
      }

      return result
    },
    [profile?.analyticsEnabled, profile?.sessionRecordingsEnabled]
  )

  return {
    profile,
    isLoading,
    error,
    updateName,
    updateEmailNotifications,
    updateAnalytics,
    updateSessionRecordings,
    refetch: fetchProfile,
  }
}

