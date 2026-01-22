import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BrandSymbol } from '@/components/brand'
import { captureEvent } from '@/lib/analytics/posthog'

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrandSymbol className="h-10 w-10 text-foreground" aria-hidden="true" />
          </div>
          <CardTitle>Checkout cancelado</CardTitle>
          <CardDescription>
            Você pode tentar novamente quando estiver pronto para ativar o teste grátis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/')}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

