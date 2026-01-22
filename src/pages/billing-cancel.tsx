import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusScreen } from '@/components/status/status-screen'
import { XCircle } from 'lucide-react'
import { captureEvent } from '@/lib/analytics/posthog'

const snapshotAnimation = () => import('@/assets/lottie/snapshot-empty.json')

export function BillingCancelPage() {
  const navigate = useNavigate()
  const hasTracked = useRef(false)

  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true
      captureEvent('billing_checkout_returned', { result: 'cancel' })
    }
  }, [])

  return (
    <StatusScreen
      tone="warning"
      title="Checkout cancelado"
      description="Você pode tentar novamente quando estiver pronto para ativar o teste grátis."
      illustration={{
        animationLoader: snapshotAnimation,
        ariaLabel: 'Ilustração de cancelamento',
        staticFallback: <XCircle className="h-10 w-10 text-amber-600" aria-hidden="true" />,
      }}
      primaryAction={
        <Button className="w-full" onClick={() => navigate('/')}>
          Tentar novamente
        </Button>
      }
      secondaryAction={
        <Button className="w-full" variant="outline" onClick={() => navigate('/manage')}>
          Ver planos e detalhes
        </Button>
      }
      footer="Você não foi cobrado. O teste só começa após concluir o checkout."
    />
  )
}

