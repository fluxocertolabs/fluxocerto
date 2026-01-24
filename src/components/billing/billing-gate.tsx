import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LottieIllustration } from '@/components/illustrations/lottie-illustration'
import { useAuth } from '@/hooks/use-auth'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { createStripeCheckoutSession } from '@/lib/supabase'
import { captureEvent } from '@/lib/analytics/posthog'
import { metaTrack } from '@/lib/analytics/meta-pixel'
import { readBillingSuccessFlag } from '@/components/billing/billing-success-flag'
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'

// Animation source: https://lottiefiles.com/free-animation/fake-3d-vector-coin-0N5eblUHrK
// Free to use under the Lottie Simple License.
const coinAnimation = () => import('@/assets/lottie/coin-3d.json')

export function BillingGate() {
  const location = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { subscription, isLoading: billingLoading, hasAccess } = useBillingStatus()
  const isWizardOpen = useOnboardingStore((s) => s.isWizardOpen)
  const {
    state: onboardingState,
    isMinimumSetupComplete,
    isLoading: onboardingLoading,
    refetch: refetchOnboarding,
  } = useOnboardingState({ manageWizard: false })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasTracked = useRef(false)
  const prevWizardOpen = useRef(false)
  const shouldReduceMotion = useReducedMotion()

  const isOnboardingFinished = useMemo(() => {
    if (isMinimumSetupComplete) return true
    if (!onboardingState) return false
    return onboardingState.status === 'completed' || onboardingState.status === 'dismissed'
  }, [isMinimumSetupComplete, onboardingState])

  const isBillingRoute = location.pathname.startsWith('/billing/')
  const isCheckoutReturnPending = typeof window !== 'undefined' && readBillingSuccessFlag()
  const shouldShowGate =
    isAuthenticated &&
    !authLoading &&
    !onboardingLoading &&
    !isWizardOpen &&
    isOnboardingFinished &&
    !billingLoading &&
    !hasAccess &&
    !isBillingRoute &&
    !isCheckoutReturnPending

  // When the onboarding wizard closes, refetch onboarding state so the paywall can react
  // immediately (this BillingGate instance runs the hook in read-only mode).
  useEffect(() => {
    const wasOpen = prevWizardOpen.current
    prevWizardOpen.current = isWizardOpen
    if (wasOpen && !isWizardOpen) {
      refetchOnboarding()
    }
  }, [isWizardOpen, refetchOnboarding])

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
    // Mirror the analytics funnel step in Meta for ads attribution.
    metaTrack('InitiateCheckout')

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
        className="sm:max-w-xl p-0 overflow-hidden"
        showClose={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="relative">
          {/* ambient glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(900px_circle_at_10%_-20%,var(--tw-gradient-stops))] from-primary/25 via-background to-background"
          />

          <div className="relative p-6 sm:p-7">
            <DialogHeader className="space-y-2">
              <DialogTitle>Ative seu teste grátis</DialogTitle>
              <DialogDescription>
                É rapidinho: confirme seu teste grátis de 14 dias para continuar usando o app.
              </DialogDescription>
            </DialogHeader>

            <motion.div
              className="mt-5 grid gap-4 sm:gap-x-4 sm:gap-y-5 sm:grid-cols-[120px_1fr] sm:items-start"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center sm:justify-start">
                <LottieIllustration
                  animationLoader={coinAnimation}
                  className="h-24 w-24 sm:h-28 sm:w-28 drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
                  ariaLabel="Ilustração de moedas"
                  staticFallback={
                    <Loader2 className="h-10 w-10 text-primary animate-spin" aria-hidden="true" />
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Acesso completo</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Você testa por 14 dias. Se quiser continuar, a assinatura segue automaticamente.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                      14 dias grátis
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-snug">Pagamento seguro (Stripe)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-snug">Cancele quando quiser</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-snug">
                        Precisamos de um cartão para iniciar o teste (você não paga agora)
                      </span>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <motion.div
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Button className="w-full" onClick={handleStartCheckout} disabled={isSubmitting}>
                    <span className="inline-flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <span>Indo para o checkout…</span>
                          <ArrowRight className="h-4 w-4 opacity-80" aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          <span>Começar teste grátis</span>
                          <ArrowRight className="h-4 w-4 opacity-80" aria-hidden="true" />
                        </>
                      )}
                    </span>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Você será redirecionado para o checkout e voltará automaticamente ao app.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

