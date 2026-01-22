import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import { createStripeCheckoutSession } from '@/lib/supabase'
import { captureEvent } from '@/lib/analytics/posthog'

export function BillingGate() {
  const location = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { subscription, isLoading: billingLoading, hasAccess } = useBillingStatus()
  const { state: onboardingState, isMinimumSetupComplete, isLoading: onboardingLoading } =
    useOnboardingState()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasTracked = useRef(false)

  const isOnboardingFinished = useMemo(() => {
    if (isMinimumSetupComplete) return true
    if (!onboardingState) return false
    return onboardingState.status === 'completed' || onboardingState.status === 'dismissed'
  }, [isMinimumSetupComplete, onboardingState])

  const isBillingRoute = location.pathname.startsWith('/billing/')
  const shouldShowGate =
    isAuthenticated &&
    !authLoading &&
    !onboardingLoading &&
    isOnboardingFinished &&
    !billingLoading &&
    !hasAccess &&
    !isBillingRoute

  useEffect(() => {
    if (shouldShowGate && !hasTracked.current) {
      hasTracked.current = true
      captureEvent('billing_paywall_shown', {
        status: subscription?.status ?? 'none',
      })
    }
    if (!shouldShowGate) {
      hasTracked.current = false
    }
  }, [shouldShowGate, subscription?.status])

  const handleStartCheckout = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    captureEvent('billing_checkout_started', {
      source: 'billing_gate',
      status: subscription?.status ?? 'none',
    })

    const result = await createStripeCheckoutSession()
    if (!result.success) {
      setErrorMessage(result.error ?? 'Não foi possível iniciar o pagamento')
      setIsSubmitting(false)
      return
    }

    captureEvent('billing_checkout_redirected', {
      source: 'billing_gate',
      status: subscription?.status ?? 'none',
    })
    try {
      window.location.href = result.data.url
    } catch {
      setErrorMessage('Não foi possível redirecionar. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={shouldShowGate} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg"
        showClose={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Assinatura necessária</DialogTitle>
          <DialogDescription>
            Para continuar, é preciso ativar o teste grátis do Plano Único.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Plano Único</h3>
            <p className="text-sm text-muted-foreground">
              Teste grátis por 14 dias. Depois, a cobrança acontece automaticamente.
            </p>
            <p className="text-xs text-muted-foreground">
              É necessário cadastrar um cartão para iniciar o teste.
            </p>
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          <Button className="w-full" onClick={handleStartCheckout} disabled={isSubmitting}>
            {isSubmitting ? 'Redirecionando...' : 'Começar teste grátis'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

