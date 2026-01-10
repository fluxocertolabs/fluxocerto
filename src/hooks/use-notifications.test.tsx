/**
 * Tests for useNotifications hook.
 * Tests hook surface, loading/error states, and store wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNotifications } from './use-notifications'
import type { NotificationRow } from '@/types'

// Mock the store
const mockStoreState = {
  items: [] as NotificationRow[],
  unreadCount: 0,
  isLoading: false,
  isInitialized: false,
  error: null as string | null,
  initialize: vi.fn(),
  refresh: vi.fn(),
  markAsRead: vi.fn(),
  reset: vi.fn(),
  subscribeToRealtime: vi.fn(),
  unsubscribeFromRealtime: vi.fn(),
}

vi.mock('@/stores/notifications-store', () => ({
  useNotificationsStore: vi.fn((selector) => {
    if (selector) {
      return selector(mockStoreState)
    }
    return mockStoreState
  }),
}))

// Sample notification data
const createMockNotification = (overrides: Partial<NotificationRow> = {}): NotificationRow => ({
  id: 'notif-1',
  user_id: 'user-1',
  type: 'welcome',
  title: 'Bem-vindo ao Fluxo Certo! 🎉',
  body: 'Estamos felizes em ter você aqui.',
  primary_action_label: 'Ver notificações',
  primary_action_href: '/notifications',
  dedupe_key: 'welcome:user-1',
  read_at: null,
  email_sent_at: null,
  created_at: '2025-01-10T12:00:00Z',
  updated_at: '2025-01-10T12:00:00Z',
  ...overrides,
})

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockStoreState.items = []
    mockStoreState.unreadCount = 0
    mockStoreState.isLoading = false
    mockStoreState.isInitialized = false
    mockStoreState.error = null
  })

  // =============================================================================
  // HOOK SURFACE TESTS
  // =============================================================================

  describe('hook surface', () => {
    it('returns items from store', () => {
      const mockNotifications = [createMockNotification()]
      mockStoreState.items = mockNotifications

      const { result } = renderHook(() => useNotifications())

      expect(result.current.items).toEqual(mockNotifications)
    })

    it('returns unreadCount from store', () => {
      mockStoreState.unreadCount = 5

      const { result } = renderHook(() => useNotifications())

      expect(result.current.unreadCount).toBe(5)
    })

    it('returns isLoading from store', () => {
      mockStoreState.isLoading = true

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isLoading).toBe(true)
    })

    it('returns error from store', () => {
      mockStoreState.error = 'Falha ao carregar'

      const { result } = renderHook(() => useNotifications())

      expect(result.current.error).toBe('Falha ao carregar')
    })

    it('returns isInitialized from store', () => {
      mockStoreState.isInitialized = true

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isInitialized).toBe(true)
    })

    it('returns refresh function', () => {
      const { result } = renderHook(() => useNotifications())

      expect(typeof result.current.refresh).toBe('function')
    })

    it('returns markAsRead function', () => {
      const { result } = renderHook(() => useNotifications())

      expect(typeof result.current.markAsRead).toBe('function')
    })
  })

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('loading state', () => {
    it('reflects loading state correctly', () => {
      mockStoreState.isLoading = true
      mockStoreState.items = []

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.items).toEqual([])
    })

    it('shows data when not loading', () => {
      mockStoreState.isLoading = false
      mockStoreState.items = [createMockNotification()]

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.items).toHaveLength(1)
    })
  })

  // =============================================================================
  // ERROR STATE TESTS
  // =============================================================================

  describe('error state', () => {
    it('reflects error state correctly', () => {
      mockStoreState.error = 'Erro de conexão'
      mockStoreState.isLoading = false

      const { result } = renderHook(() => useNotifications())

      expect(result.current.error).toBe('Erro de conexão')
    })

    it('has null error when successful', () => {
      mockStoreState.error = null
      mockStoreState.items = [createMockNotification()]

      const { result } = renderHook(() => useNotifications())

      expect(result.current.error).toBeNull()
    })
  })

  // =============================================================================
  // STORE WIRING TESTS
  // =============================================================================

  describe('store wiring', () => {
    it('calls store refresh when refresh is called', () => {
      const { result } = renderHook(() => useNotifications())

      result.current.refresh()

      expect(mockStoreState.refresh).toHaveBeenCalledTimes(1)
    })

    it('calls store markAsRead with correct id', () => {
      const { result } = renderHook(() => useNotifications())

      result.current.markAsRead('notif-123')

      expect(mockStoreState.markAsRead).toHaveBeenCalledWith('notif-123')
    })
  })

  // =============================================================================
  // UNREAD COUNT TESTS
  // =============================================================================

  describe('unread count', () => {
    it('returns 0 when no notifications', () => {
      mockStoreState.items = []
      mockStoreState.unreadCount = 0

      const { result } = renderHook(() => useNotifications())

      expect(result.current.unreadCount).toBe(0)
    })

    it('returns correct count for unread notifications', () => {
      mockStoreState.items = [
        createMockNotification({ id: 'notif-1', read_at: null }),
        createMockNotification({ id: 'notif-2', read_at: null }),
        createMockNotification({ id: 'notif-3', read_at: '2025-01-10T13:00:00Z' }),
      ]
      mockStoreState.unreadCount = 2

      const { result } = renderHook(() => useNotifications())

      expect(result.current.unreadCount).toBe(2)
    })

    it('returns 0 when all notifications are read', () => {
      mockStoreState.items = [
        createMockNotification({ id: 'notif-1', read_at: '2025-01-10T13:00:00Z' }),
      ]
      mockStoreState.unreadCount = 0

      const { result } = renderHook(() => useNotifications())

      expect(result.current.unreadCount).toBe(0)
    })
  })
})
