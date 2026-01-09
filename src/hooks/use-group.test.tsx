/**
 * Tests for useGroup hook.
 *
 * Covers:
 * - Normal group load
 * - PGRST116 triggers ensureCurrentUserGroup; success re-fetches group; failure sets isRecoverable and error
 * - recoverProvisioning() triggers retry and returns boolean
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGroup } from './use-group'
import type { AuthState } from '@/types/auth'

// Minimal test user for mocking - only includes fields actually used by tests
type TestUser = { id: string; email: string }

// Mock dependencies
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'test-user-id', email: 'test@example.com' },
  })),
}))

const mockGetSupabase = vi.fn()
const mockEnsureCurrentUserGroup = vi.fn()
const mockIsSupabaseConfigured = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  ensureCurrentUserGroup: () => mockEnsureCurrentUserGroup(),
}))

// Import mocked modules for manipulation
import { useAuth } from '@/hooks/use-auth'

const mockedUseAuth = vi.mocked(useAuth)

describe('useGroup', () => {
  // Mock Supabase client
  const mockGroupSelect = vi.fn()
  const mockProfilesSelect = vi.fn()
  const mockFrom = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user-id', email: 'test@example.com' } as TestUser,
    } as AuthState)

    mockIsSupabaseConfigured.mockReturnValue(true)

    // Setup default successful responses
    mockGroupSelect.mockReturnValue({
      single: () => Promise.resolve({
        data: { id: 'group-123', name: 'Test Group' },
        error: null,
      }),
    })

    mockProfilesSelect.mockReturnValue({
      order: () => Promise.resolve({
        data: [
          { id: 'profile-1', name: 'User 1', email: 'test@example.com', group_id: 'group-123' },
          { id: 'profile-2', name: 'User 2', email: 'other@example.com', group_id: 'group-123' },
        ],
        error: null,
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return { select: mockGroupSelect }
      }
      if (table === 'profiles') {
        return { select: mockProfilesSelect }
      }
      return { select: vi.fn() }
    })

    mockGetSupabase.mockReturnValue({
      from: mockFrom,
    })

    mockEnsureCurrentUserGroup.mockResolvedValue({
      success: true,
      data: { groupId: 'group-123', created: false },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('normal group load', () => {
    it('loads group and members successfully', async () => {
      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.group).toEqual({
        id: 'group-123',
        name: 'Test Group',
      })

      expect(result.current.members).toHaveLength(2)
      expect(result.current.members[0].isCurrentUser).toBe(true)
      expect(result.current.members[1].isCurrentUser).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isRecoverable).toBe(false)
    })

    it('returns empty state when not authenticated', async () => {
      mockedUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.group).toBeNull()
      expect(result.current.members).toEqual([])
    })

    it('returns empty state when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false)

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.group).toBeNull()
    })
  })

  describe('PGRST116 self-heal', () => {
    it('triggers ensureCurrentUserGroup on PGRST116 error', async () => {
      // First call returns PGRST116 (no rows)
      let groupCallCount = 0
      mockGroupSelect.mockReturnValue({
        single: () => {
          groupCallCount++
          if (groupCallCount === 1) {
            return Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'no rows returned' },
            })
          }
          // After self-heal, return success
          return Promise.resolve({
            data: { id: 'group-123', name: 'Recovered Group' },
            error: null,
          })
        },
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have called ensureCurrentUserGroup
      expect(mockEnsureCurrentUserGroup).toHaveBeenCalled()

      // Should have recovered
      expect(result.current.group).toEqual({
        id: 'group-123',
        name: 'Recovered Group',
      })
      expect(result.current.error).toBeNull()
      expect(result.current.isRecoverable).toBe(false)
    })

    it('sets recoverable error when self-heal fails', async () => {
      // Group returns PGRST116
      mockGroupSelect.mockReturnValue({
        single: () => Promise.resolve({
          data: null,
          error: { code: 'PGRST116', message: 'no rows returned' },
        }),
      })

      // Self-heal fails
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.group).toBeNull()
      expect(result.current.error).toContain('desassociada')
      expect(result.current.isRecoverable).toBe(true)
    })

    it('sets recoverable error when retry fetch fails after successful provisioning', async () => {
      // All group fetches return PGRST116
      mockGroupSelect.mockReturnValue({
        single: () => Promise.resolve({
          data: null,
          error: { code: 'PGRST116', message: 'no rows returned' },
        }),
      })

      // Self-heal succeeds but retry fetch still fails
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: true,
        data: { groupId: 'group-123', created: false },
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.group).toBeNull()
      expect(result.current.error).toContain('desassociada')
      expect(result.current.isRecoverable).toBe(true)
    })
  })

  describe('recoverProvisioning', () => {
    it('returns true and triggers refetch on success', async () => {
      // Initial load fails with PGRST116
      let groupCallCount = 0
      mockGroupSelect.mockReturnValue({
        single: () => {
          groupCallCount++
          if (groupCallCount <= 2) {
            return Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'no rows returned' },
            })
          }
          return Promise.resolve({
            data: { id: 'group-123', name: 'Recovered Group' },
            error: null,
          })
        },
      })

      // First self-heal fails
      mockEnsureCurrentUserGroup
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: true, data: { groupId: 'group-123', created: false } })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isRecoverable).toBe(true)

      // Call recoverProvisioning
      let recovered: boolean = false
      await act(async () => {
        recovered = await result.current.recoverProvisioning()
      })

      expect(recovered).toBe(true)
    })

    it('returns false when provisioning fails', async () => {
      // Group returns PGRST116
      mockGroupSelect.mockReturnValue({
        single: () => Promise.resolve({
          data: null,
          error: { code: 'PGRST116', message: 'no rows returned' },
        }),
      })

      // All self-heal attempts fail
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isRecoverable).toBe(true)

      // Call recoverProvisioning
      let recovered: boolean = false
      await act(async () => {
        recovered = await result.current.recoverProvisioning()
      })

      expect(recovered).toBe(false)
    })
  })

  describe('retry', () => {
    it('refetches data when retry is called', async () => {
      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Clear mock to track new calls
      mockFrom.mockClear()

      // Call retry
      act(() => {
        result.current.retry()
      })

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('groups')
      })
    })
  })

  describe('error handling', () => {
    it('sets non-recoverable error for non-PGRST116 errors', async () => {
      mockGroupSelect.mockReturnValue({
        single: () => Promise.resolve({
          data: null,
          error: { code: '42501', message: 'permission denied' },
        }),
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.isRecoverable).toBe(false)
    })

    it('handles members fetch error', async () => {
      mockProfilesSelect.mockReturnValue({
        order: () => Promise.resolve({
          data: null,
          error: { code: '42501', message: 'permission denied' },
        }),
      })

      const { result } = renderHook(() => useGroup())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })
  })
})

