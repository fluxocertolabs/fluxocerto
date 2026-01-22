import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setBillingSuccessFlag } from '@/components/billing/billing-success-flag'

/**
 * Stripe redirects the user back to `/billing/success` after checkout.
 * Instead of showing a standalone page, we redirect to the app and show a transient
 * overlay animation on top of the dashboard.
 */
export function BillingSuccessRedirectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    setBillingSuccessFlag()
    navigate('/', { replace: true })
  }, [navigate])

  return null
}
