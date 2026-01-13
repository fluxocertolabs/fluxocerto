/**
 * Individual notification item component.
 * 
 * Renders a single notification with:
 * - Unread/read styling
 * - Title and body text
 * - Optional primary action button
 * - "Marcar como lida" action
 */

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Notification } from '@/types'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (notificationId: string) => void
}

/**
 * Format a date as a relative time string in pt-BR.
 *
 * Note: This is a simple implementation with proper pt-BR pluralization.
 * If relative time formatting is needed elsewhere, consider:
 * - Extracting to src/lib/format.ts for reuse
 * - Using date-fns/formatDistanceToNow with pt-BR locale
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'agora mesmo'
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
  } else if (diffHours < 24) {
    return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  } else if (diffDays < 7) {
    return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  } else {
    // For older notifications, show the date
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    })
  }
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const isUnread = notification.readAt === null
  
  const handleMarkAsRead = () => {
    if (isUnread) {
      onMarkAsRead(notification.id)
    }
  }

  const handlePrimaryActionClick = () => {
    // Mark as read when clicking the primary action button
    if (isUnread) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        isUnread
          ? 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30'
          : 'bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="flex-shrink-0 mt-1.5">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isUnread ? 'bg-primary' : 'bg-transparent'
            )}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                'text-sm font-medium',
                isUnread ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {notification.title}
            </h3>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          <p
            className={cn(
              'mt-1 text-sm',
              isUnread ? 'text-foreground/80' : 'text-muted-foreground'
            )}
          >
            {notification.body}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {/* Primary action (if present) */}
            {notification.primaryActionLabel && notification.primaryActionHref && (
              <Button
                asChild
                size="sm"
                variant={isUnread ? 'default' : 'outline'}
              >
                <Link to={notification.primaryActionHref} onClick={handlePrimaryActionClick}>
                  {notification.primaryActionLabel}
                </Link>
              </Button>
            )}

            {/* Mark as read action (only for unread) */}
            {isUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                className="text-muted-foreground hover:text-foreground"
              >
                Marcar como lida
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

