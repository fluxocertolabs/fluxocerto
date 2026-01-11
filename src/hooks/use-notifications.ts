/**
 * Hook for managing notifications.
 * 
 * Provides a convenient interface to the notifications store for UI components.
 * Handles initialization lifecycle and exposes store state/actions.
 */

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNotificationsStore } from '@/stores/notifications-store'
import type { Notification } from '@/types'

export interface UseNotificationsReturn {
  /** List of notifications, newest first */
  items: Notification[]
  /** Count of unread notifications */
  unreadCount: number
  /** Whether notifications are loading */
  isLoading: boolean
  /** Error message if any operation failed */
  error: string | null
  /** Whether the store has been initialized */
  isInitialized: boolean
  /** Refresh notifications from the server */
  refresh: () => Promise<void>
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>
}

/**
 * Hook for accessing and managing notifications.
 * 
 * Usage:
 * ```tsx
 * const { items, unreadCount, isLoading, markAsRead } = useNotifications()
 * ```
 * 
 * Note: This hook does NOT automatically initialize notifications.
 * Initialization should be done once at the app level (e.g., in Header)
 * by calling useNotificationsInitializer().
 */
export function useNotifications(): UseNotificationsReturn {
  const items = useNotificationsStore((s) => s.items)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const isLoading = useNotificationsStore((s) => s.isLoading)
  const error = useNotificationsStore((s) => s.error)
  const isInitialized = useNotificationsStore((s) => s.isInitialized)
  const refresh = useNotificationsStore((s) => s.refresh)
  const markAsRead = useNotificationsStore((s) => s.markAsRead)

  return {
    items,
    unreadCount,
    isLoading,
    error,
    isInitialized,
    refresh,
    markAsRead,
  }
}

/**
 * Hook for initializing notifications on authenticated app entry.
 * 
 * Should be called once in a component that renders for all authenticated routes
 * (e.g., Header inside AuthenticatedLayout).
 * 
 * Handles:
 * - Initializing the store (ensure welcome + fetch)
 * - Setting up realtime subscription
 * - Cleanup on sign-out
 */
export function useNotificationsInitializer(): void {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const initialize = useNotificationsStore((s) => s.initialize)
  const subscribeToRealtime = useNotificationsStore((s) => s.subscribeToRealtime)
  const unsubscribeFromRealtime = useNotificationsStore((s) => s.unsubscribeFromRealtime)
  const reset = useNotificationsStore((s) => s.reset)
  const isInitialized = useNotificationsStore((s) => s.isInitialized)

  useEffect(() => {
    // Don't take action while auth is still resolving
    if (isAuthLoading) {
      return
    }

    // User signed out (auth resolved and not authenticated) - reset store and unsubscribe
    if (!isAuthenticated || !user?.id) {
      reset()
      return
    }

    // Initialize if not already done
    if (!isInitialized) {
      initialize()
    }

    // Set up realtime subscription
    subscribeToRealtime(user.id)

    // Cleanup on unmount or user change
    return () => {
      unsubscribeFromRealtime()
    }
  }, [isAuthLoading, isAuthenticated, user?.id, isInitialized, initialize, subscribeToRealtime, unsubscribeFromRealtime, reset])
}

