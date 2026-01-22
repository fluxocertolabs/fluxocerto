import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BrandSymbol } from '@/components/brand'
import { useBillingStatus } from '@/hooks/use-billing-status'
import { captureEvent } from '@/lib/analytics/posthog'

export function BillingSuccessPage() {
  const navigate = useNavigate()
  const { hasAccess, isLoading, subscription, refetch } = useBillingStatus()
  const hasTracked = useRef(false)

  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true
      captureEvent('billing_checkout_returned', {
        result: 'success',
        status: subscription?.status ?? 'unknown',
      })
    }
  }, [subscription?.status])

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrandSymbol className="h-10 w-10 text-foreground" aria-hidden="true" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAccess && (
            <div className="text-center text-sm text-muted-foreground">
              {isLoading ? 'Atualizando status...' : 'Verificando assinatura...'}
            </div>
          )}
          <Button className="w-full" onClick={() => navigate('/')} disabled={!hasAccess}>
            Ir para o app
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

