/**
 * Tests for useAuth hook.
 *
 * Goals:
 * - Ensure correct loading/authenticated state transitions
 * - Cover timeout fallback (prevents infinite spinner)
 * - Ensure subscription cleanup is performed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'
import { useAuth } from './use-auth'

const mockIsSupabaseConfigured = vi.fn()
const mockGetSupabase = vi.fn()

let onAuthStateChangeCallback: ((event: string, session: Session | null) => void) | null = null
const mockUnsubscribe = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  getSupabase: () => mockGetSupabase(),
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onAuthStateChangeCallback = null

    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: Session | null) => void) => {
      onAuthStateChangeCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    mockGetSupabase.mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns unauthenticated and not loading when Supabase is not configured', () => {
    mockIsSupabaseConfigured.mockReturnValue(false)

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(mockGetSupabase).not.toHaveBeenCalled()
  })

  it('loads initial session and updates user state', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true)

    const user: Partial<User> = { id: 'u1', email: 'test@example.com' }
    mockGetSession.mockResolvedValue({ data: { session: { user } } })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user?.id).toBe('u1')
    expect(result.current.isAuthenticated).toBe(true)
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('handles getSession failure by clearing user and stopping loading', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockGetSession.mockRejectedValue(new Error('boom'))

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('stops loading after timeout if getSession hangs', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockGetSession.mockReturnValue(new Promise(() => {})) // Never resolves

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(warn).toHaveBeenCalledWith(
      'Auth session check timed out; continuing unauthenticated.'
    )
    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)

    warn.mockRestore()
  })

  it('updates user when auth state changes', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const nextUser: Partial<User> = { id: 'u2', email: 'next@example.com' }

    act(() => {
      onAuthStateChangeCallback?.('SIGNED_IN', { user: nextUser } as Session)
    })

    expect(result.current.user?.id).toBe('u2')
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      onAuthStateChangeCallback?.('SIGNED_OUT', null)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('unsubscribes on unmount', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { unmount } = renderHook(() => useAuth())

    // Ensure subscription was created before unmount
    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})


