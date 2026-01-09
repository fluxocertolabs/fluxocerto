/**
 * Tests for usePageTour hook.
 *
 * Covers:
 * - shouldAutoShow: first visit, version bump (completed only), dismissed doesn't auto-show on bump
 * - localStorage cache: valid, invalid JSON, wrong schema => safe fallback
 * - error gating: backend failure with/without localCache
 * - deferral: onboarding wizard open prevents auto-show
 * - manual trigger via useTourStore.activeTourKey starts tour when wizard not open
 * - completeTour/dismissTour: writes localStorage immediately and calls upsertTourState
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePageTour } from './use-page-tour'
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

vi.mock('@/stores/onboarding-store', () => ({
  useOnboardingStore: vi.fn((selector) => {
    const state = { isWizardOpen: false }
    return selector ? selector(state) : state
  }),
}))

const mockStartTour = vi.fn()
const mockStopTour = vi.fn()
let mockActiveTourKey: string | null = null

vi.mock('@/stores/tour-store', () => ({
  useTourStore: vi.fn(() => ({
    activeTourKey: mockActiveTourKey,
    startTour: mockStartTour,
    stopTour: mockStopTour,
  })),
}))

const mockGetTourState = vi.fn()
const mockUpsertTourState = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getTourState: (...args: unknown[]) => mockGetTourState(...args),
  upsertTourState: (...args: unknown[]) => mockUpsertTourState(...args),
}))

vi.mock('@/lib/tours/definitions', () => ({
  getTourDefinition: vi.fn(() => ({
    key: 'dashboard',
    version: 1,
    title: 'Test Tour',
    steps: [
      { target: '[data-tour="step1"]', title: 'Step 1', content: 'Content 1' },
      { target: '[data-tour="step2"]', title: 'Step 2', content: 'Content 2' },
    ],
  })),
  getTourVersion: vi.fn(() => 1),
  isTourUpdated: vi.fn((_key: string, version: number) => version < 1),
}))

// Import mocked modules for manipulation
import { useAuth } from '@/hooks/use-auth'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useTourStore } from '@/stores/tour-store'

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseOnboardingStore = vi.mocked(useOnboardingStore)
const mockedUseTourStore = vi.mocked(useTourStore)

describe('usePageTour', () => {
  const localStorageKey = 'fluxocerto:tour:test-user-id:dashboard'

  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveTourKey = null
    localStorage.clear()

    // Default mock implementations
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user-id', email: 'test@example.com' } as TestUser,
    } as AuthState)

    mockedUseOnboardingStore.mockImplementation((selector) => {
      const state = { isWizardOpen: false, openWizard: vi.fn(), closeWizard: vi.fn(), toggleWizard: vi.fn() }
      return selector ? selector(state) : state
    })

    mockedUseTourStore.mockReturnValue({
      activeTourKey: mockActiveTourKey,
      startTour: mockStartTour,
      stopTour: mockStopTour,
    })

    mockGetTourState.mockResolvedValue({ success: true, data: null })
    mockUpsertTourState.mockResolvedValue({
      success: true,
      data: {
        id: 'state-id',
        userId: 'test-user-id',
        tourKey: 'dashboard',
        status: 'completed',
        version: 1,
        completedAt: new Date(),
        dismissedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('shouldAutoShow', () => {
    it('returns true for first visit (no state, no cache)', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // shouldAutoShow triggers auto-start, which sets hasAutoShown=true,
      // making shouldAutoShow false. So we verify the tour actually started.
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })

    it('returns true when completed at older version (version bump)', async () => {
      mockGetTourState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          tourKey: 'dashboard',
          status: 'completed',
          version: 0, // Older version
          completedAt: new Date(),
          dismissedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // shouldAutoShow triggers auto-start when conditions are met
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })

    it('returns false when dismissed (even with version bump)', async () => {
      mockGetTourState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          tourKey: 'dashboard',
          status: 'dismissed',
          version: 0, // Older version but dismissed
          completedAt: null,
          dismissedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('returns false when completed at current version', async () => {
      mockGetTourState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          tourKey: 'dashboard',
          status: 'completed',
          version: 1, // Current version
          completedAt: new Date(),
          dismissedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('returns false while auth is loading', async () => {
      mockedUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('returns false when unauthenticated', async () => {
      mockedUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })
  })

  describe('localStorage cache', () => {
    it('reads valid cache and uses it for auto-show decision', async () => {
      // Set valid cache with older version (completed)
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({ status: 'completed', version: 0, updatedAt: Date.now() })
      )

      // Server returns no state
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should auto-show because cache shows completed at older version
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })

    it('handles invalid JSON gracefully', async () => {
      localStorage.setItem(localStorageKey, 'not-valid-json')
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should auto-show because cache is invalid and no server state
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })

    it('handles wrong schema gracefully', async () => {
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({ wrongKey: 'wrongValue' })
      )
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should auto-show because cache schema is invalid
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })

    it('handles invalid status value gracefully', async () => {
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({ status: 'invalid', version: 1, updatedAt: Date.now() })
      )
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should auto-show because cache has invalid status
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })
  })

  describe('error gating', () => {
    it('does not auto-show on backend failure without local cache', async () => {
      mockGetTourState.mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('uses local cache for auto-show decision on backend failure', async () => {
      // Set valid cache showing completed at older version
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({ status: 'completed', version: 0, updatedAt: Date.now() })
      )

      mockGetTourState.mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      // Should auto-show because local cache shows completed at older version
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })
    })
  })

  describe('deferral during onboarding', () => {
    it('does not auto-show when onboarding wizard is open', async () => {
      mockedUseOnboardingStore.mockImplementation((selector) => {
        const state = { isWizardOpen: true, openWizard: vi.fn(), closeWizard: vi.fn(), toggleWizard: vi.fn() }
        return selector ? selector(state) : state
      })

      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('stops active tour when onboarding wizard opens', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      // Start with wizard closed
      mockedUseOnboardingStore.mockImplementation((selector) => {
        const state = { isWizardOpen: false, openWizard: vi.fn(), closeWizard: vi.fn(), toggleWizard: vi.fn() }
        return selector ? selector(state) : state
      })

      const { result, rerender } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Tour should auto-show
      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })

      // Now open the wizard
      mockedUseOnboardingStore.mockImplementation((selector) => {
        const state = { isWizardOpen: true, openWizard: vi.fn(), closeWizard: vi.fn(), toggleWizard: vi.fn() }
        return selector ? selector(state) : state
      })

      rerender()

      await waitFor(() => {
        expect(result.current.isTourActive).toBe(false)
      })
    })
  })

  describe('manual trigger via tour store', () => {
    it('starts tour when activeTourKey matches and wizard is closed', async () => {
      mockGetTourState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          tourKey: 'dashboard',
          status: 'completed',
          version: 1, // Current version - no auto-show
          completedAt: new Date(),
          dismissedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result, rerender } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isTourActive).toBe(false)
      expect(result.current.shouldAutoShow).toBe(false)

      // Simulate manual trigger via tour store
      mockActiveTourKey = 'dashboard'
      mockedUseTourStore.mockReturnValue({
        activeTourKey: 'dashboard',
        startTour: mockStartTour,
        stopTour: mockStopTour,
      })

      rerender()

      await waitFor(() => {
        expect(result.current.isTourActive).toBe(true)
      })

      expect(mockStopTour).toHaveBeenCalled()
    })

    it('clears trigger but does not start tour when wizard is open', async () => {
      mockedUseOnboardingStore.mockImplementation((selector) => {
        const state = { isWizardOpen: true, openWizard: vi.fn(), closeWizard: vi.fn(), toggleWizard: vi.fn() }
        return selector ? selector(state) : state
      })

      mockGetTourState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          tourKey: 'dashboard',
          status: 'completed',
          version: 1,
          completedAt: new Date(),
          dismissedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockActiveTourKey = 'dashboard'
      mockedUseTourStore.mockReturnValue({
        activeTourKey: 'dashboard',
        startTour: mockStartTour,
        stopTour: mockStopTour,
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isTourActive).toBe(false)
      expect(mockStopTour).toHaveBeenCalled()
    })
  })

  describe('completeTour', () => {
    it('writes localStorage immediately and calls upsertTourState', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start tour
      act(() => {
        result.current.startTour()
      })

      expect(result.current.isTourActive).toBe(true)

      // Complete tour
      await act(async () => {
        await result.current.completeTour()
      })

      // Should close tour immediately
      expect(result.current.isTourActive).toBe(false)

      // Should write to localStorage
      const cached = localStorage.getItem(localStorageKey)
      expect(cached).toBeTruthy()
      const parsed = JSON.parse(cached!)
      expect(parsed.status).toBe('completed')
      expect(parsed.version).toBe(1)

      // Should call upsertTourState
      expect(mockUpsertTourState).toHaveBeenCalledWith('dashboard', {
        status: 'completed',
        version: 1,
      })
    })
  })

  describe('dismissTour', () => {
    it('writes localStorage immediately and calls upsertTourState', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })
      mockUpsertTourState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          tourKey: 'dashboard',
          status: 'dismissed',
          version: 1,
          completedAt: null,
          dismissedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start tour
      act(() => {
        result.current.startTour()
      })

      expect(result.current.isTourActive).toBe(true)

      // Dismiss tour
      await act(async () => {
        await result.current.dismissTour()
      })

      // Should close tour immediately
      expect(result.current.isTourActive).toBe(false)

      // Should write to localStorage
      const cached = localStorage.getItem(localStorageKey)
      expect(cached).toBeTruthy()
      const parsed = JSON.parse(cached!)
      expect(parsed.status).toBe('dismissed')
      expect(parsed.version).toBe(1)

      // Should call upsertTourState
      expect(mockUpsertTourState).toHaveBeenCalledWith('dashboard', {
        status: 'dismissed',
        version: 1,
      })
    })
  })

  describe('step navigation', () => {
    it('starts at step 0', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.startTour()
      })

      expect(result.current.currentStepIndex).toBe(0)
    })

    it('nextStep advances step index', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.startTour()
      })

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStepIndex).toBe(1)
    })

    it('nextStep does not exceed total steps', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.startTour()
      })

      // Tour has 2 steps (0 and 1)
      act(() => {
        result.current.nextStep()
        result.current.nextStep()
        result.current.nextStep()
      })

      expect(result.current.currentStepIndex).toBe(1) // Max index
    })

    it('previousStep decrements step index', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.startTour()
      })

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStepIndex).toBe(1)

      act(() => {
        result.current.previousStep()
      })

      expect(result.current.currentStepIndex).toBe(0)
    })

    it('previousStep does not go below 0', async () => {
      mockGetTourState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => usePageTour('dashboard'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.startTour()
      })

      act(() => {
        result.current.previousStep()
        result.current.previousStep()
      })

      expect(result.current.currentStepIndex).toBe(0)
    })
  })
})

