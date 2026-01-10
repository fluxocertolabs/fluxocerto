/**
 * Zustand store for managing notifications state.
 * 
 * Handles:
 * - Notification list and unread count
 * - Welcome notification initialization (idempotent)
 * - Mark as read functionality
 * - Realtime subscription for live updates
 */

import { create } from 'zustand'
import type { Notification, NotificationRow } from '@/types'
import { transformNotificationRow } from '@/types'
import {
  ensureWelcomeNotification,
  listNotifications,
  markNotificationRead,
  triggerWelcomeEmail,
  getSupabase,
  isSupabaseConfigured,
} from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationsStoreState {
  /** List of notifications, newest first */
  items: Notification[]
  /** Count of unread notifications */
  unreadCount: number
  /** Whether the store is loading */
  isLoading: boolean
  /** Error message if any operation failed */
  error: string | null
  /** Whether the store has been initialized */
  isInitialized: boolean
  /** Realtime subscription channel */
  _realtimeChannel: RealtimeChannel | null
  /** Current user ID for subscription filtering */
  _currentUserId: string | null
}

interface NotificationsStoreActions {
  /** Initialize the store: ensure welcome notification + fetch initial data */
  initialize: () => Promise<void>
  /** Refresh notifications from the server */
  refresh: () => Promise<void>
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>
  /** Subscribe to realtime updates */
  subscribeToRealtime: (userId: string) => void
  /** Unsubscribe from realtime updates */
  unsubscribeFromRealtime: () => void
  /** Reset the store state */
  reset: () => void
}

type NotificationsStore = NotificationsStoreState & NotificationsStoreActions

const initialState: NotificationsStoreState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  isInitialized: false,
  _realtimeChannel: null,
  _currentUserId: null,
}

/**
 * Calculate unread count from items array.
 */
function calculateUnreadCount(items: Notification[]): number {
  return items.filter((item) => item.readAt === null).length
}

/**
 * Upsert a notification into the items array (by id).
 * Used for realtime updates to avoid duplicates.
 */
function upsertNotification(items: Notification[], notification: Notification): Notification[] {
  const existingIndex = items.findIndex((item) => item.id === notification.id)
  
  if (existingIndex >= 0) {
    // Update existing
    const updated = [...items]
    updated[existingIndex] = notification
    return updated
  } else {
    // Insert new, maintaining newest-first order
    return [notification, ...items].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }
}

/**
 * Remove a notification from the items array (by id).
 * Used for realtime DELETE events.
 */
function removeNotification(items: Notification[], notificationId: string): Notification[] {
  return items.filter((item) => item.id !== notificationId)
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  ...initialState,

  initialize: async () => {
    const state = get()
    
    // Prevent double initialization
    if (state.isInitialized || state.isLoading) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      // Step 1: Ensure welcome notification exists (idempotent)
      const welcomeResult = await ensureWelcomeNotification()
      if (!welcomeResult.success) {
        console.warn('Failed to ensure welcome notification:', welcomeResult.error)
        // Don't fail initialization - continue to fetch existing notifications
      }

      // Step 2: If a new welcome notification was created, trigger the welcome email
      // This is fire-and-forget - we don't wait for it or fail if it errors
      if (welcomeResult.success && welcomeResult.data?.created) {
        triggerWelcomeEmail(welcomeResult.data.notificationId).then((result) => {
          if (!result.success) {
            console.warn('Failed to trigger welcome email:', result.error)
          } else if (result.data?.sent) {
            console.log('Welcome email sent successfully')
          } else if (result.data?.skippedReason) {
            console.log('Welcome email skipped:', result.data.skippedReason)
          }
        }).catch((err) => {
          console.warn('Error triggering welcome email:', err)
        })
      }

      // Step 3: Fetch initial notifications
      const listResult = await listNotifications()
      if (!listResult.success) {
        set({ error: listResult.error ?? 'Falha ao carregar notificações', isLoading: false })
        return
      }

      const items = listResult.data ?? []
      set({
        items,
        unreadCount: calculateUnreadCount(items),
        isLoading: false,
        isInitialized: true,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      set({ error: message, isLoading: false })
    }
  },

  refresh: async () => {
    set({ isLoading: true, error: null })

    try {
      const listResult = await listNotifications()
      if (!listResult.success) {
        set({ error: listResult.error ?? 'Falha ao carregar notificações', isLoading: false })
        return
      }

      const items = listResult.data ?? []
      set({
        items,
        unreadCount: calculateUnreadCount(items),
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      set({ error: message, isLoading: false })
    }
  },

  markAsRead: async (notificationId: string) => {
    const state = get()
    
    // Snapshot the specific item before optimistic update (for targeted revert)
    const previousItem = state.items.find((item) => item.id === notificationId)
    if (!previousItem) {
      // Item not found - nothing to do
      return
    }
    
    // Optimistic update
    const optimisticItems = state.items.map((item) =>
      item.id === notificationId
        ? { ...item, readAt: new Date() }
        : item
    )
    set({
      items: optimisticItems,
      unreadCount: calculateUnreadCount(optimisticItems),
    })

    try {
      const result = await markNotificationRead(notificationId)
      if (!result.success) {
        // Revert optimistic update on failure - use current state and replace only the affected item
        const currentState = get()
        const revertedItems = currentState.items.map((item) =>
          item.id === notificationId ? previousItem : item
        )
        set({
          items: revertedItems,
          unreadCount: calculateUnreadCount(revertedItems),
          error: result.error ?? 'Falha ao marcar notificação como lida',
        })
      }
      // Success - optimistic update is correct, no action needed
    } catch (err) {
      // Revert optimistic update on error - use current state and replace only the affected item
      const currentState = get()
      const revertedItems = currentState.items.map((item) =>
        item.id === notificationId ? previousItem : item
      )
      set({
        items: revertedItems,
        unreadCount: calculateUnreadCount(revertedItems),
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    }
  },

  subscribeToRealtime: (userId: string) => {
    if (!isSupabaseConfigured()) {
      return
    }

    const state = get()
    
    // Don't re-subscribe if already subscribed for the same user
    if (state._realtimeChannel && state._currentUserId === userId) {
      return
    }

    // Unsubscribe from any existing channel first
    if (state._realtimeChannel) {
      state._realtimeChannel.unsubscribe()
    }

    const client = getSupabase()
    
    const channel = client
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const currentState = get()
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const notification = transformNotificationRow(payload.new as NotificationRow)
            const updatedItems = upsertNotification(currentState.items, notification)
            set({
              items: updatedItems,
              unreadCount: calculateUnreadCount(updatedItems),
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            const updatedItems = removeNotification(currentState.items, deletedId)
            set({
              items: updatedItems,
              unreadCount: calculateUnreadCount(updatedItems),
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Notifications realtime channel error, will refetch on reconnect')
        }
        if (status === 'SUBSCRIBED') {
          // On successful subscription (including reconnection), refetch to ensure consistency
          // This handles the case where we missed events during disconnection
          get().refresh()
        }
      })

    set({ _realtimeChannel: channel, _currentUserId: userId })
  },

  unsubscribeFromRealtime: () => {
    const state = get()
    if (state._realtimeChannel) {
      state._realtimeChannel.unsubscribe()
      set({ _realtimeChannel: null, _currentUserId: null })
    }
  },

  reset: () => {
    const state = get()
    if (state._realtimeChannel) {
      state._realtimeChannel.unsubscribe()
    }
    set(initialState)
  },
}))

