/**
 * Notifications page.
 * 
 * Displays the user's notification inbox with:
 * - Full list of notifications (newest first)
 * - Loading/empty/error states
 * - Mark as read functionality
 */

import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationsInbox } from '@/components/notifications'

export function NotificationsPage() {
  const { items, isLoading, error, refresh, markAsRead } = useNotifications()

  return (
    <main className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-full bg-primary/10 p-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Notificações
          </h1>
          <p className="text-sm text-muted-foreground">
            Suas notificações e atualizações importantes
          </p>
        </div>
      </div>

      {/* Notifications inbox */}
      <NotificationsInbox
        notifications={items}
        isLoading={isLoading}
        error={error}
        onMarkAsRead={markAsRead}
        onRefresh={refresh}
      />
    </main>
  )
}

