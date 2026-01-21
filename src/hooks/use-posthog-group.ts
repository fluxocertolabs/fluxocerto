import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getGroupId } from '@/lib/supabase'
import { setGroup } from '@/lib/analytics/posthog'

export function usePosthogGroup() {
  const { user } = useAuth()
  const lastGroupIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      lastGroupIdRef.current = null
      return
    }
    let isActive = true

    const fetchGroup = async () => {
      const groupId = await getGroupId()
      if (!isActive || !groupId) return
      if (lastGroupIdRef.current === groupId) return
      lastGroupIdRef.current = groupId
      setGroup(groupId)
    }

    void fetchGroup()

    return () => {
      isActive = false
    }
  }, [user])
}

