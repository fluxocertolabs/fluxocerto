/**
 * Notifications inbox component.
 * 
 * Renders the list of notifications with:
 * - Newest-first ordering
 * - Loading state
 * - Empty state
 * - Error state
 */

import { Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types'

interface NotificationsInboxProps {
  notifications: Notification[]
  isLoading: boolean
  error: string | null
  onMarkAsRead: (notificationId: string) => void
  onRefresh: () => void
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        Nenhuma notificação
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Você não tem notificações no momento. Novas notificações aparecerão aqui.
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border bg-card p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-muted mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <Bell className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        Erro ao carregar notificações
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {error}
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  )
}

export function NotificationsInbox({
  notifications,
  isLoading,
  error,
  onMarkAsRead,
  onRefresh,
}: NotificationsInboxProps) {
  if (isLoading && notifications.length === 0) {
    return <LoadingState />
  }

  if (error && notifications.length === 0) {
    return <ErrorState error={error} onRetry={onRefresh} />
  }

  if (notifications.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  )
}

