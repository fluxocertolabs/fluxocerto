import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const BILLING_SUCCESS_FLAG = 'fluxo-certo:billing-success-overlay'

/**
 * Stripe redirects the user back to `/billing/success` after checkout.
 * Instead of showing a standalone page, we redirect to the app and show a transient
 * overlay animation on top of the dashboard.
 */
export function BillingSuccessRedirectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    try {
      window.sessionStorage.setItem(BILLING_SUCCESS_FLAG, '1')
    } catch {
      // ignore storage errors
    }
    navigate('/', { replace: true })
  }, [navigate])

  return null
}

export function readBillingSuccessFlag(): boolean {
  try {
    return window.sessionStorage.getItem(BILLING_SUCCESS_FLAG) === '1'
  } catch {
    return false
  }
}

export function clearBillingSuccessFlag(): void {
  try {
    window.sessionStorage.removeItem(BILLING_SUCCESS_FLAG)
  } catch {
    // ignore
  }
}


