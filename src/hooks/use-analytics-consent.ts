import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getAnalyticsEnabled, getSessionRecordingsEnabled } from '@/lib/supabase'
import { setAnalyticsConsent } from '@/lib/analytics/posthog'

export function useAnalyticsConsent() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    let isActive = true

    const syncConsent = async () => {
      const [analyticsResult, recordingsResult] = await Promise.all([
        getAnalyticsEnabled(),
        getSessionRecordingsEnabled(),
      ])
      if (!isActive) return
      setAnalyticsConsent({
        analytics: analyticsResult.success ? analyticsResult.data ?? true : true,
        recordings: recordingsResult.success ? recordingsResult.data ?? true : true,
      })
    }

    void syncConsent()

    return () => {
      isActive = false
    }
  }, [user])
}

