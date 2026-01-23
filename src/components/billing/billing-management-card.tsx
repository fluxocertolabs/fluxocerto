import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createStripeCheckoutSession, createStripeCustomerPortalSession } from '@/lib/supabase'
import { useBillingStatus } from '@/hooks/use-billing-status'
import type { BillingSubscriptionStatus } from '@/types'

const STATUS_LABELS: Record<BillingSubscriptionStatus, string> = {
  pending: 'Pendente',
  checkout_completed: 'Checkout concluído',
  trialing: 'Em teste grátis',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  unpaid: 'Não paga',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  paused: 'Pausada',
  unknown: 'Desconhecido',
}

function formatDate(value: Date | null): string | null {
  if (!value) return null
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(value)
}

export function BillingManagementCard() {
  const { subscription, isLoading, error } = useBillingStatus()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusLabel = useMemo(() => {
    if (!subscription) return null
    return STATUS_LABELS[subscription.status] ?? STATUS_LABELS.unknown
  }, [subscription])

  const detailMessage = useMemo(() => {
    if (!subscription) return null

    if (subscription.status === 'trialing' && subscription.trialEnd) {
      return `Teste grátis até ${formatDate(subscription.trialEnd)}`
    }

    if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
      return `Cancelamento agendado para ${formatDate(subscription.currentPeriodEnd)}`
    }

    if (subscription.currentPeriodEnd) {
      return `Próxima renovação em ${formatDate(subscription.currentPeriodEnd)}`
    }

    return null
  }, [subscription])

  const handleManageSubscription = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setActionError(null)

    const result = await createStripeCustomerPortalSession()
    if (!result.success) {
      setActionError(result.error ?? 'Não foi possível abrir o portal da assinatura')
      setIsSubmitting(false)
      return
    }

    try {
      window.sessionStorage.setItem('manage-active-tab', 'group')
    } catch {
      // ignore storage errors
    }

    try {
      window.location.href = result.data.url
    } catch {
      setActionError('Não foi possível redirecionar para o portal')
      setIsSubmitting(false)
    }
  }

  const handleStartCheckout = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setActionError(null)

    const result = await createStripeCheckoutSession()
    if (!result.success) {
      setActionError(result.error ?? 'Não foi possível iniciar o pagamento')
      setIsSubmitting(false)
      return
    }

    try {
      window.sessionStorage.setItem('manage-active-tab', 'group')
    } catch {
      // ignore storage errors
    }

    try {
      window.location.href = result.data.url
    } catch {
      setActionError('Não foi possível redirecionar para o checkout')
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura</CardTitle>
        <CardDescription>Gerencie pagamentos, faturas e cancelamentos.</CardDescription>
      </CardHeader>
      <CardContent>
        {(error || actionError) && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError ?? error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-4 w-52 rounded bg-muted" />
          </div>
        ) : subscription ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Status</p>
                <p className="text-sm text-muted-foreground">{statusLabel}</p>
                {detailMessage && (
                  <p className="mt-1 text-xs text-muted-foreground">{detailMessage}</p>
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Stripe
              </span>
            </div>

            <Button onClick={handleManageSubscription} disabled={isSubmitting}>
              {isSubmitting ? 'Abrindo portal…' : 'Gerenciar assinatura'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Sem assinatura ativa</p>
              <p className="text-sm text-muted-foreground">
                Ative o teste grátis para liberar o gerenciamento da assinatura.
              </p>
            </div>
            <Button onClick={handleStartCheckout} disabled={isSubmitting}>
              {isSubmitting ? 'Indo para o checkout…' : 'Ativar teste grátis'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
