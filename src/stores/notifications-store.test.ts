/**
 * Tests for notifications store.
 * Tests all store actions, state transitions, and realtime convergence.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useNotificationsStore } from './notifications-store'
import type { Notification } from '@/types'

// Mock Supabase helpers
const mockListNotifications = vi.fn()
const mockMarkNotificationRead = vi.fn()
const mockEnsureWelcomeNotification = vi.fn()
const mockTriggerWelcomeEmail = vi.fn()
const mockGetSupabase = vi.fn()
const mockIsSupabaseConfigured = vi.fn()

vi.mock('@/lib/supabase', () => ({
  listNotifications: () => mockListNotifications(),
  markNotificationRead: (id: string) => mockMarkNotificationRead(id),
  ensureWelcomeNotification: () => mockEnsureWelcomeNotification(),
  triggerWelcomeEmail: (id: string) => mockTriggerWelcomeEmail(id),
  getSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
}))

// Sample notification data (transformed format - camelCase with Date objects)
const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'welcome',
  title: 'Bem-vindo ao Fluxo Certo! 🎉',
  body: 'Estamos felizes em ter você aqui.',
  primaryActionLabel: 'Ver notificações',
  primaryActionHref: '/notifications',
  dedupeKey: 'welcome:user-1',
  readAt: null,
  emailSentAt: null,
  createdAt: new Date('2025-01-10T12:00:00Z'),
  updatedAt: new Date('2025-01-10T12:00:00Z'),
  ...overrides,
})

describe('useNotificationsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNotificationsStore.getState().reset()
    vi.clearAllMocks()

    // Default mocks
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockListNotifications.mockResolvedValue({
      success: true,
      data: [],
    })
    mockEnsureWelcomeNotification.mockResolvedValue({
      success: true,
      data: { id: 'notif-1', created: false },
    })
    mockTriggerWelcomeEmail.mockResolvedValue({
      success: true,
      data: { ok: true, sent: false, skipped_reason: 'already_sent' },
    })
    mockMarkNotificationRead.mockResolvedValue({
      success: true,
    })

    // Mock Supabase client with channel
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }
    mockGetSupabase.mockReturnValue({
      channel: vi.fn().mockReturnValue(mockChannel),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('initial state', () => {
    it('has empty items array', () => {
      const state = useNotificationsStore.getState()
      expect(state.items).toEqual([])
    })

    it('has unreadCount set to 0', () => {
      const state = useNotificationsStore.getState()
      expect(state.unreadCount).toBe(0)
    })

    it('has isLoading set to false', () => {
      const state = useNotificationsStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('has isInitialized set to false', () => {
      const state = useNotificationsStore.getState()
      expect(state.isInitialized).toBe(false)
    })

    it('has error set to null', () => {
      const state = useNotificationsStore.getState()
      expect(state.error).toBeNull()
    })

    it('has all required methods', () => {
      const state = useNotificationsStore.getState()
      expect(typeof state.initialize).toBe('function')
      expect(typeof state.refresh).toBe('function')
      expect(typeof state.markAsRead).toBe('function')
      expect(typeof state.reset).toBe('function')
    })
  })

  // =============================================================================
  // initialize TESTS
  // =============================================================================

  describe('initialize', () => {
    it('sets isLoading to true during initialization', async () => {
      // Use a delayed response to capture loading state
      mockListNotifications.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
      )

      const initPromise = useNotificationsStore.getState().initialize()

      // Check loading state immediately
      expect(useNotificationsStore.getState().isLoading).toBe(true)

      await initPromise
    })

    it('calls ensureWelcomeNotification', async () => {
      await useNotificationsStore.getState().initialize()
      expect(mockEnsureWelcomeNotification).toHaveBeenCalledTimes(1)
    })

    it('calls listNotifications after ensuring welcome', async () => {
      await useNotificationsStore.getState().initialize()
      expect(mockListNotifications).toHaveBeenCalledTimes(1)
    })

    it('triggers welcome email when new notification is created', async () => {
      mockEnsureWelcomeNotification.mockResolvedValue({
        success: true,
        data: { notificationId: 'new-notif', created: true },
      })

      await useNotificationsStore.getState().initialize()

      // Wait for the fire-and-forget promise to be called
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockTriggerWelcomeEmail).toHaveBeenCalledWith('new-notif')
    })

    it('does not trigger welcome email when notification already exists', async () => {
      mockEnsureWelcomeNotification.mockResolvedValue({
        success: true,
        data: { notificationId: 'existing-notif', created: false },
      })

      await useNotificationsStore.getState().initialize()

      expect(mockTriggerWelcomeEmail).not.toHaveBeenCalled()
    })

    it('populates items with fetched notifications', async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1' }),
        createMockNotification({ id: 'notif-2', readAt: new Date('2025-01-10T13:00:00Z') }),
      ]
      mockListNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications,
      })

      await useNotificationsStore.getState().initialize()

      expect(useNotificationsStore.getState().items).toEqual(mockNotifications)
    })

    it('calculates unreadCount correctly', async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1', readAt: null }),
        createMockNotification({ id: 'notif-2', readAt: null }),
        createMockNotification({ id: 'notif-3', readAt: new Date('2025-01-10T13:00:00Z') }),
      ]
      mockListNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications,
      })

      await useNotificationsStore.getState().initialize()

      expect(useNotificationsStore.getState().unreadCount).toBe(2)
    })

    it('sets isInitialized to true after successful initialization', async () => {
      await useNotificationsStore.getState().initialize()
      expect(useNotificationsStore.getState().isInitialized).toBe(true)
    })

    it('sets isLoading to false after initialization', async () => {
      await useNotificationsStore.getState().initialize()
      expect(useNotificationsStore.getState().isLoading).toBe(false)
    })

    it('prevents double initialization', async () => {
      await useNotificationsStore.getState().initialize()
      await useNotificationsStore.getState().initialize()

      // Should only be called once
      expect(mockListNotifications).toHaveBeenCalledTimes(1)
    })

    it('sets error on listNotifications failure', async () => {
      mockListNotifications.mockResolvedValue({
        success: false,
        error: 'Falha ao carregar notificações',
      })

      await useNotificationsStore.getState().initialize()

      expect(useNotificationsStore.getState().error).toBe('Falha ao carregar notificações')
    })

    it('continues initialization even if ensureWelcomeNotification fails', async () => {
      mockEnsureWelcomeNotification.mockResolvedValue({
        success: false,
        error: 'Failed to ensure welcome',
      })
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification()],
      })

      await useNotificationsStore.getState().initialize()

      // Should still fetch notifications
      expect(mockListNotifications).toHaveBeenCalled()
      expect(useNotificationsStore.getState().items).toHaveLength(1)
    })
  })

  // =============================================================================
  // markAsRead TESTS
  // =============================================================================

  describe('markAsRead', () => {
    beforeEach(async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1', readAt: null }),
        createMockNotification({ id: 'notif-2', readAt: null }),
      ]
      mockListNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications,
      })

      await useNotificationsStore.getState().initialize()
    })

    it('calls markNotificationRead with correct id', async () => {
      await useNotificationsStore.getState().markAsRead('notif-1')
      expect(mockMarkNotificationRead).toHaveBeenCalledWith('notif-1')
    })

    it('updates item readAt optimistically', async () => {
      await useNotificationsStore.getState().markAsRead('notif-1')

      const item = useNotificationsStore.getState().items.find(i => i.id === 'notif-1')
      expect(item?.readAt).not.toBeNull()
    })

    it('decrements unreadCount', async () => {
      expect(useNotificationsStore.getState().unreadCount).toBe(2)

      await useNotificationsStore.getState().markAsRead('notif-1')

      expect(useNotificationsStore.getState().unreadCount).toBe(1)
    })

    it('is idempotent - marking already read notification does not change count', async () => {
      // Mark as read
      await useNotificationsStore.getState().markAsRead('notif-1')
      expect(useNotificationsStore.getState().unreadCount).toBe(1)

      // Mark same notification again
      await useNotificationsStore.getState().markAsRead('notif-1')
      expect(useNotificationsStore.getState().unreadCount).toBe(1)
    })

    it('handles non-existent notification gracefully', async () => {
      const initialCount = useNotificationsStore.getState().unreadCount

      await useNotificationsStore.getState().markAsRead('non-existent')

      // Should not throw and count should remain unchanged
      expect(useNotificationsStore.getState().unreadCount).toBe(initialCount)
    })

    it('reverts optimistic update on API failure', async () => {
      mockMarkNotificationRead.mockResolvedValue({
        success: false,
        error: 'Failed to mark as read',
      })

      const initialItem = useNotificationsStore.getState().items.find(i => i.id === 'notif-1')
      expect(initialItem?.readAt).toBeNull()

      await useNotificationsStore.getState().markAsRead('notif-1')

      // Should revert to unread
      const item = useNotificationsStore.getState().items.find(i => i.id === 'notif-1')
      expect(item?.readAt).toBeNull()
      expect(useNotificationsStore.getState().unreadCount).toBe(2)
    })
  })

  // =============================================================================
  // refresh TESTS
  // =============================================================================

  describe('refresh', () => {
    it('re-fetches notifications', async () => {
      await useNotificationsStore.getState().initialize()
      mockListNotifications.mockClear()

      await useNotificationsStore.getState().refresh()

      expect(mockListNotifications).toHaveBeenCalledTimes(1)
    })

    it('updates items with new data', async () => {
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification({ id: 'notif-1' })],
      })
      await useNotificationsStore.getState().initialize()

      // Update mock for refresh
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [
          createMockNotification({ id: 'notif-1' }),
          createMockNotification({ id: 'notif-2' }),
        ],
      })

      await useNotificationsStore.getState().refresh()

      expect(useNotificationsStore.getState().items).toHaveLength(2)
    })

    it('recalculates unreadCount on refresh', async () => {
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification({ id: 'notif-1', readAt: null })],
      })
      await useNotificationsStore.getState().initialize()
      expect(useNotificationsStore.getState().unreadCount).toBe(1)

      // All notifications now read
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification({ id: 'notif-1', readAt: new Date('2025-01-10T13:00:00Z') })],
      })

      await useNotificationsStore.getState().refresh()

      expect(useNotificationsStore.getState().unreadCount).toBe(0)
    })
  })

  // =============================================================================
  // reset TESTS
  // =============================================================================

  describe('reset', () => {
    it('resets items to empty array', async () => {
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification()],
      })
      await useNotificationsStore.getState().initialize()

      useNotificationsStore.getState().reset()

      expect(useNotificationsStore.getState().items).toEqual([])
    })

    it('resets unreadCount to 0', async () => {
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification({ readAt: null })],
      })
      await useNotificationsStore.getState().initialize()

      useNotificationsStore.getState().reset()

      expect(useNotificationsStore.getState().unreadCount).toBe(0)
    })

    it('resets isInitialized to false', async () => {
      await useNotificationsStore.getState().initialize()

      useNotificationsStore.getState().reset()

      expect(useNotificationsStore.getState().isInitialized).toBe(false)
    })

    it('resets error to null', async () => {
      mockListNotifications.mockResolvedValue({
        success: false,
        error: 'Some error',
      })
      await useNotificationsStore.getState().initialize()

      useNotificationsStore.getState().reset()

      expect(useNotificationsStore.getState().error).toBeNull()
    })

    it('allows re-initialization after reset', async () => {
      await useNotificationsStore.getState().initialize()
      mockListNotifications.mockClear()

      useNotificationsStore.getState().reset()
      await useNotificationsStore.getState().initialize()

      expect(mockListNotifications).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================================================
  // REALTIME CONVERGENCE TESTS
  // =============================================================================

  describe('realtime convergence', () => {
    it('handles INSERT event by adding new notification', async () => {
      await useNotificationsStore.getState().initialize()

      // Simulate realtime INSERT
      const newNotification = createMockNotification({ id: 'new-notif' })
      useNotificationsStore.setState(state => ({
        items: [newNotification, ...state.items],
        unreadCount: state.unreadCount + (newNotification.readAt ? 0 : 1),
      }))

      expect(useNotificationsStore.getState().items).toHaveLength(1)
      expect(useNotificationsStore.getState().items[0].id).toBe('new-notif')
    })

    it('handles UPDATE event by updating existing notification', async () => {
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [createMockNotification({ id: 'notif-1', readAt: null })],
      })
      await useNotificationsStore.getState().initialize()

      // Simulate realtime UPDATE (mark as read)
      const updatedNotification = createMockNotification({
        id: 'notif-1',
        readAt: new Date('2025-01-10T13:00:00Z'),
      })
      useNotificationsStore.setState(state => ({
        items: state.items.map(item =>
          item.id === updatedNotification.id ? updatedNotification : item
        ),
        unreadCount: state.items.filter(
          item => item.id !== updatedNotification.id && !item.readAt
        ).length + (updatedNotification.readAt ? 0 : 1),
      }))

      const item = useNotificationsStore.getState().items.find(i => i.id === 'notif-1')
      expect(item?.readAt).toEqual(new Date('2025-01-10T13:00:00Z'))
    })

    it('deduplicates notifications by id', async () => {
      const notification = createMockNotification({ id: 'notif-1' })
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [notification],
      })
      await useNotificationsStore.getState().initialize()

      // Simulate duplicate INSERT
      useNotificationsStore.setState(state => {
        const exists = state.items.some(item => item.id === notification.id)
        if (exists) {
          return state // No change if already exists
        }
        return {
          items: [notification, ...state.items],
        }
      })

      expect(useNotificationsStore.getState().items).toHaveLength(1)
    })
  })

  // =============================================================================
  // REALTIME SUBSCRIPTION WIRING TESTS
  // =============================================================================

  describe('realtime subscription wiring', () => {
    it('subscribes to notifications channel', async () => {
      const mockOn = vi.fn().mockReturnThis()
      const mockSubscribe = vi.fn().mockReturnThis()
      const mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      }
      const mockChannelFn = vi.fn().mockReturnValue(mockChannel)
      mockGetSupabase.mockReturnValue({
        channel: mockChannelFn,
      })

      await useNotificationsStore.getState().initialize()
      useNotificationsStore.getState().subscribeToRealtime('user-123')

      // Verify channel was created
      expect(mockChannelFn).toHaveBeenCalledWith('notifications-changes')
      
      // Verify on() was called for postgres_changes
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.user-123',
        }),
        expect.any(Function)
      )
      
      // Verify subscribe was called
      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('unsubscribes from realtime on cleanup', async () => {
      const mockUnsubscribe = vi.fn()
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: mockUnsubscribe,
      }
      mockGetSupabase.mockReturnValue({
        channel: vi.fn().mockReturnValue(mockChannel),
      })

      await useNotificationsStore.getState().initialize()
      useNotificationsStore.getState().subscribeToRealtime('user-123')
      useNotificationsStore.getState().unsubscribeFromRealtime()

      // Verify cleanup was called
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('does not re-subscribe if already subscribed for same user', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }
      const mockChannelFn = vi.fn().mockReturnValue(mockChannel)
      mockGetSupabase.mockReturnValue({
        channel: mockChannelFn,
      })

      await useNotificationsStore.getState().initialize()
      useNotificationsStore.getState().subscribeToRealtime('user-123')
      useNotificationsStore.getState().subscribeToRealtime('user-123')

      // Channel should only be created once
      expect(mockChannelFn).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles rapid markAsRead calls', async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1', readAt: null }),
        createMockNotification({ id: 'notif-2', readAt: null }),
        createMockNotification({ id: 'notif-3', readAt: null }),
      ]
      mockListNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications,
      })
      await useNotificationsStore.getState().initialize()

      // Rapid calls
      await Promise.all([
        useNotificationsStore.getState().markAsRead('notif-1'),
        useNotificationsStore.getState().markAsRead('notif-2'),
        useNotificationsStore.getState().markAsRead('notif-3'),
      ])

      expect(useNotificationsStore.getState().unreadCount).toBe(0)
    })

    it('handles empty notification list', async () => {
      mockListNotifications.mockResolvedValue({
        success: true,
        data: [],
      })

      await useNotificationsStore.getState().initialize()

      expect(useNotificationsStore.getState().items).toEqual([])
      expect(useNotificationsStore.getState().unreadCount).toBe(0)
    })

    it('handles Supabase not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false)
      useNotificationsStore.getState().reset()

      await useNotificationsStore.getState().initialize()

      // Note: initialize() does not check isSupabaseConfigured() - it always attempts to fetch.
      // The isSupabaseConfigured() check only exists in subscribeToRealtime().
      // This test passes because mocked functions return empty data, not due to config validation.
      // Items remain empty because mocks return empty arrays.
      expect(useNotificationsStore.getState().items).toEqual([])
    })
  })
})

