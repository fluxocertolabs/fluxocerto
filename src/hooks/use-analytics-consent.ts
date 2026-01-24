import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getAnalyticsEnabled, getSessionRecordingsEnabled } from '@/lib/supabase'
import { setAnalyticsConsent } from '@/lib/analytics/posthog'
import { setMetaPixelConsent } from '@/lib/analytics/meta-pixel'

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
      const analyticsEnabled = analyticsResult.success ? analyticsResult.data ?? true : true
      const recordingsEnabled = recordingsResult.success ? recordingsResult.data ?? true : true
      setAnalyticsConsent({
        analytics: analyticsEnabled,
        recordings: recordingsEnabled,
      })
      setMetaPixelConsent(analyticsEnabled)
    }

    void syncConsent()

    return () => {
      isActive = false
    }
  }, [user])
}

