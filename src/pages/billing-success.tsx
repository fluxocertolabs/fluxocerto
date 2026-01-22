import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BrandSymbol } from '@/components/brand'
import { StatusScreen } from '@/components/status/status-screen'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { captureEvent } from '@/lib/analytics/posthog'

const cashflowAnimation = () => import('@/assets/lottie/cashflow-empty.json')

export function BillingSuccessPage() {
  const navigate = useNavigate()
  const { hasAccess, isLoading, subscription, refetch } = useBillingStatus()
  const hasTracked = useRef(false)

  useEffect(() => {
    if (!hasTracked.current && !isLoading) {
      hasTracked.current = true
      captureEvent('billing_checkout_returned', {
        result: 'success',
        status: subscription?.status ?? 'unknown',
      })
    }
  }, [isLoading, subscription?.status])

  useEffect(() => {
    if (hasAccess) return
    const interval = window.setInterval(() => {
      refetch()
    }, 3000)
    return () => window.clearInterval(interval)
  }, [hasAccess, refetch])

  const title = hasAccess ? 'Assinatura confirmada' : 'Confirmando assinatura'
  const description = hasAccess
    ? 'Sua assinatura está ativa. Você já pode usar o app.'
    : 'Estamos confirmando seu pagamento. Isso pode levar alguns segundos.'

  return (
    <StatusScreen
      tone={hasAccess ? 'success' : 'info'}
      title={title}
      description={description}
      illustration={{
        animationLoader: cashflowAnimation,
        ariaLabel: hasAccess ? 'Ilustração de sucesso' : 'Ilustração de processamento',
        staticFallback: hasAccess ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        ) : (
          <BrandSymbol className="h-10 w-10 text-foreground" animation="spin" aria-hidden="true" />
        ),
      }}
      primaryAction={
        <Button className="w-full" onClick={() => navigate('/')} disabled={!hasAccess}>
          Ir para o app
        </Button>
      }
      footer={
        hasAccess
          ? 'Dica: você pode gerenciar dados e notificações a qualquer momento pelo menu.'
          : 'Se demorar mais que 30s, tente recarregar a página.'
      }
    >
      {!hasAccess && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{isLoading ? 'Atualizando status...' : 'Verificando assinatura...'}</span>
        </div>
      )}
    </StatusScreen>
  )
}

