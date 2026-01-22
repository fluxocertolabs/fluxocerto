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
import { createStripeCheckoutSession } from '@/lib/supabase'
import { captureEvent } from '@/lib/analytics/posthog'
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'

const cashflowAnimation = () => import('@/assets/lottie/cashflow-empty.json')

export function BillingGate() {
  const location = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { subscription, isLoading: billingLoading, hasAccess } = useBillingStatus()
  const { state: onboardingState, isMinimumSetupComplete, isLoading: onboardingLoading } =
    useOnboardingState()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasTracked = useRef(false)
  const shouldReduceMotion = useReducedMotion()

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
              <DialogTitle>Assinatura necessária</DialogTitle>
              <DialogDescription>
                Para continuar, é preciso ativar o teste grátis do Plano Único.
              </DialogDescription>
            </DialogHeader>

            <motion.div
              className="mt-5 grid gap-5 sm:grid-cols-[140px_1fr] sm:items-start"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center sm:justify-start">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-muted ring-1 ring-border/50 flex items-center justify-center">
                  <LottieIllustration
                    animationLoader={cashflowAnimation}
                    className="h-16 w-16 sm:h-20 sm:w-20"
                    ariaLabel="Ilustração do plano"
                    staticFallback={<ShieldCheck className="h-10 w-10 text-primary" aria-hidden="true" />}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Plano Único</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        14 dias grátis para testar tudo. Depois, a cobrança acontece automaticamente.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                      14 dias grátis
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Checkout seguro via Stripe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Você pode cancelar a qualquer momento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>É necessário cadastrar um cartão para iniciar o teste</span>
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
                          <span>Redirecionando...</span>
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
                    Ao continuar, você será redirecionado para o checkout e retornará automaticamente ao app.
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

