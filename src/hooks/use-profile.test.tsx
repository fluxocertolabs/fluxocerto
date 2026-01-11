/**
 * Tests for useProfile hook.
 * Tests profile data reading, display name updates, and email notification preferences.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useProfile } from './use-profile'

// Mock dependencies
const mockGetSupabase = vi.fn()
const mockIsSupabaseConfigured = vi.fn()
const mockGetEmailNotificationsEnabled = vi.fn()
const mockSetEmailNotificationsEnabled = vi.fn()
const mockNotifyGroupDataInvalidated = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  getEmailNotificationsEnabled: () => mockGetEmailNotificationsEnabled(),
  setEmailNotificationsEnabled: (enabled: boolean) => mockSetEmailNotificationsEnabled(enabled),
  handleSupabaseError: (err: unknown) => ({ success: false, error: String(err) }),
}))

vi.mock('@/lib/group-data-events', () => ({
  notifyGroupDataInvalidated: () => mockNotifyGroupDataInvalidated(),
}))

// Default auth state - use a function to get fresh values
const getDefaultAuth = () => ({
  isAuthenticated: true,
  isLoading: false,
  user: { id: 'user-123', email: 'test@example.com' },
})

// Current auth state - reset in beforeEach
let currentAuth = getDefaultAuth()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => currentAuth,
}))

describe('useProfile', () => {
  const mockProfileSelect = vi.fn()
  const mockProfileUpdate = vi.fn()
  const mockFrom = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset auth state to default
    currentAuth = getDefaultAuth()

    mockIsSupabaseConfigured.mockReturnValue(true)

    // Default profile response
    mockProfileSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: () => Promise.resolve({
          data: { name: 'Test User' },
          error: null,
        }),
      }),
    })

    mockProfileUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue(
        Promise.resolve({
          data: null,
          error: null,
        })
      ),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockProfileSelect,
          update: mockProfileUpdate,
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    mockGetSupabase.mockReturnValue({
      from: mockFrom,
    })

    // Default email preference - missing row means enabled
    mockGetEmailNotificationsEnabled.mockResolvedValue({
      success: true,
      data: true,
    })

    mockSetEmailNotificationsEnabled.mockResolvedValue({
      success: true,
    })
  })

  // =============================================================================
  // PROFILE DATA READING TESTS
  // =============================================================================

  describe('profile data reading', () => {
    it('loads profile data on mount', async () => {
      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile?.name).toBe('Test User')
      expect(result.current.profile?.email).toBe('test@example.com')
    })

    it('loads email notifications preference', async () => {
      mockGetEmailNotificationsEnabled.mockResolvedValue({
        success: true,
        data: true,
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile?.emailNotificationsEnabled).toBe(true)
    })

    it('returns null profile when not authenticated', async () => {
      currentAuth = {
        isAuthenticated: false,
        isLoading: false,
        user: null as unknown as { id: string; email: string },
      }

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile).toBeNull()
    })

    it('handles profile fetch error', async () => {
      mockProfileSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: () => Promise.resolve({
            data: null,
            error: { code: '42501', message: 'permission denied' },
          }),
        }),
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  // =============================================================================
  // DISPLAY NAME UPDATE TESTS
  // =============================================================================

  describe('display name update', () => {
    it('updates display name successfully', async () => {
      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updateResult: { success: boolean } = { success: false }
      await act(async () => {
        updateResult = await result.current.updateName('New Name')
      })

      expect(updateResult.success).toBe(true)
      expect(mockProfileUpdate).toHaveBeenCalled()
    })

    it('dispatches group data invalidation event after successful update', async () => {
      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateName('New Name')
      })

      expect(mockNotifyGroupDataInvalidated).toHaveBeenCalled()
    })

    it('returns error on update failure', async () => {
      mockProfileUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue(
          Promise.resolve({
            data: null,
            error: { code: '42501', message: 'permission denied' },
          })
        ),
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updateResult: { success: boolean } = { success: true }
      await act(async () => {
        updateResult = await result.current.updateName('New Name')
      })

      expect(updateResult.success).toBe(false)
    })

    it('does not dispatch event on update failure', async () => {
      mockProfileUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue(
          Promise.resolve({
            data: null,
            error: { code: '42501', message: 'permission denied' },
          })
        ),
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateName('New Name')
      })

      expect(mockNotifyGroupDataInvalidated).not.toHaveBeenCalled()
    })
  })

  // =============================================================================
  // EMAIL NOTIFICATIONS PREFERENCE TESTS
  // =============================================================================

  describe('email notifications preference', () => {
    it('loads email notifications preference on mount', async () => {
      mockGetEmailNotificationsEnabled.mockResolvedValue({
        success: true,
        data: true,
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile?.emailNotificationsEnabled).toBe(true)
    })

    it('defaults to enabled when no preference row exists', async () => {
      // Missing row returns true (enabled by default)
      mockGetEmailNotificationsEnabled.mockResolvedValue({
        success: true,
        data: null, // No row
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile?.emailNotificationsEnabled).toBe(true)
    })

    it('shows disabled when preference is set to false', async () => {
      mockGetEmailNotificationsEnabled.mockResolvedValue({
        success: true,
        data: false,
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile?.emailNotificationsEnabled).toBe(false)
    })

    it('updates email notifications preference', async () => {
      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updateResult: { success: boolean } = { success: false }
      await act(async () => {
        updateResult = await result.current.updateEmailNotifications(false)
      })

      expect(updateResult.success).toBe(true)
      expect(mockSetEmailNotificationsEnabled).toHaveBeenCalledWith(false)
    })

    it('reverts on preference update failure', async () => {
      mockSetEmailNotificationsEnabled.mockResolvedValue({
        success: false,
        error: 'Failed to update',
      })

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.profile?.emailNotificationsEnabled).toBe(true)
      })

      await act(async () => {
        await result.current.updateEmailNotifications(false)
      })

      // Should revert to original value
      expect(result.current.profile?.emailNotificationsEnabled).toBe(true)
    })
  })

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles Supabase not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.profile).toBeNull()
    })
  })
})
