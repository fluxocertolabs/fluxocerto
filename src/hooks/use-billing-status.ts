import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getBillingSubscription } from '@/lib/supabase'
import type { BillingSubscription } from '@/types'

const ACCESS_STATUSES = new Set(['trialing', 'active'])

export interface UseBillingStatusReturn {
  subscription: BillingSubscription | null
  isLoading: boolean
  error: string | null
  hasAccess: boolean
  refetch: () => void
}

export function useBillingStatus(): UseBillingStatusReturn {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const hasAccess = useMemo(() => {
    if (!subscription) return false
    return ACCESS_STATUSES.has(subscription.status)
  }, [subscription])

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true)
      return
    }
    if (!isAuthenticated) {
      setSubscription(null)
      setIsLoading(false)
      setError(null)
      return
    }

    let mounted = true

    async function fetchBilling() {
      setIsLoading(true)
      setError(null)
      const result = await getBillingSubscription()
      if (!mounted) return
      if (result.success) {
        setSubscription(result.data)
      } else {
        setError(result.error ?? 'Falha ao carregar assinatura')
      }
      setIsLoading(false)
    }

    fetchBilling()

    return () => {
      mounted = false
    }
  }, [authLoading, isAuthenticated, retryCount])

  const refetch = useCallback(() => {
    setRetryCount((count) => count + 1)
  }, [])

  return {
    subscription,
    isLoading,
    error,
    hasAccess,
    refetch,
  }
}

