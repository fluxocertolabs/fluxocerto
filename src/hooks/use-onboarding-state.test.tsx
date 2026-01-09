/**
 * Tests for useOnboardingState hook.
 *
 * Covers:
 * - Auto-show conditions based on onboarding state + minimum setup completion
 * - Resume behavior from persisted current_step
 * - next/previous/goTo step boundaries
 * - complete/dismiss persistence calls; error handling path
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOnboardingState } from './use-onboarding-state'

// Mock dependencies
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'test-user-id', email: 'test@example.com' },
  })),
}))

vi.mock('@/hooks/use-finance-data', () => ({
  useFinanceData: vi.fn(() => ({
    accounts: [],
    projects: [],
    singleShotIncome: [],
    fixedExpenses: [],
    singleShotExpenses: [],
    isLoading: false,
  })),
}))

const mockOpenWizard = vi.fn()
const mockCloseWizard = vi.fn()
let mockIsWizardOpen = false

vi.mock('@/stores/onboarding-store', () => ({
  useOnboardingStore: vi.fn(() => ({
    isWizardOpen: mockIsWizardOpen,
    openWizard: mockOpenWizard,
    closeWizard: mockCloseWizard,
  })),
}))

const mockGetOnboardingState = vi.fn()
const mockUpsertOnboardingState = vi.fn()
const mockGetGroupId = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getOnboardingState: () => mockGetOnboardingState(),
  upsertOnboardingState: (...args: unknown[]) => mockUpsertOnboardingState(...args),
  getGroupId: () => mockGetGroupId(),
}))

// Import mocked modules for manipulation
import { useAuth } from '@/hooks/use-auth'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useOnboardingStore } from '@/stores/onboarding-store'

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseFinanceData = vi.mocked(useFinanceData)
const mockedUseOnboardingStore = vi.mocked(useOnboardingStore)

describe('useOnboardingState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsWizardOpen = false

    // Default auth mock
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'test-user-id', email: 'test@example.com' } as never,
    })

    // Default finance data mock (empty - minimum setup not complete)
    mockedUseFinanceData.mockReturnValue({
      accounts: [],
      projects: [],
      singleShotIncome: [],
      expenses: [],
      fixedExpenses: [],
      singleShotExpenses: [],
      creditCards: [],
      futureStatements: [],
      profiles: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      refresh: vi.fn(),
      optimisticallyRemoveExpense: vi.fn(),
    })

    // Default onboarding store mock
    mockedUseOnboardingStore.mockReturnValue({
      isWizardOpen: mockIsWizardOpen,
      openWizard: mockOpenWizard,
      closeWizard: mockCloseWizard,
    })

    // Default supabase mocks
    mockGetOnboardingState.mockResolvedValue({ success: true, data: null })
    mockGetGroupId.mockResolvedValue('group-id')
    mockUpsertOnboardingState.mockResolvedValue({
      success: true,
      data: {
        id: 'state-id',
        userId: 'test-user-id',
        groupId: 'group-id',
        status: 'in_progress',
        currentStep: 'profile',
        autoShownAt: new Date(),
        dismissedAt: null,
        completedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('auto-show conditions', () => {
    it('should auto-show when no state exists and minimum setup incomplete', async () => {
      mockGetOnboardingState.mockResolvedValue({ success: true, data: null })

      renderHook(() => useOnboardingState())

      // When shouldAutoShow becomes true, the hook auto-opens the wizard
      // and sets hasAutoShown=true, which makes shouldAutoShow false.
      // So we verify the wizard was opened instead.
      await waitFor(() => {
        expect(mockOpenWizard).toHaveBeenCalled()
      })
    })

    it('should not auto-show when minimum setup is complete', async () => {
      // Setup complete: 1 account, 1 income, 1 expense
      mockedUseFinanceData.mockReturnValue({
        accounts: [{ id: '1', name: 'Account', type: 'checking', balance: 1000, owner: null, createdAt: new Date(), updatedAt: new Date() }] as never,
        projects: [{ id: '1', name: 'Salary', amount: 5000 }] as never,
        singleShotIncome: [],
        expenses: [],
        fixedExpenses: [{ id: '1', name: 'Rent', amount: 1000 }] as never,
        singleShotExpenses: [],
        creditCards: [],
        futureStatements: [],
        profiles: [],
        isLoading: false,
        error: null,
        retry: vi.fn(),
        refresh: vi.fn(),
        optimisticallyRemoveExpense: vi.fn(),
      })

      mockGetOnboardingState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
      expect(result.current.isMinimumSetupComplete).toBe(true)
    })

    it('should not auto-show when state is completed', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'completed',
          currentStep: 'done',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: new Date(),
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('should not auto-show when state is dismissed', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'dismissed',
          currentStep: 'profile',
          autoShownAt: new Date(),
          dismissedAt: new Date(),
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('should not auto-show while auth is loading', async () => {
      mockedUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
      })

      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.shouldAutoShow).toBe(false)
    })

    it('should not auto-show when unauthenticated', async () => {
      mockedUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.shouldAutoShow).toBe(false)
    })
  })

  describe('resume behavior', () => {
    it('resumes from persisted current_step when status is in_progress', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'income',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentStep).toBe('income')
    })

    it('auto-opens wizard when resuming in_progress state with incomplete setup', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'bank_account',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(mockOpenWizard).toHaveBeenCalled()
      })
    })
  })

  describe('step navigation', () => {
    it('nextStep advances to next step', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'profile',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockUpsertOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'group',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.nextStep()
      })

      expect(mockUpsertOnboardingState).toHaveBeenCalledWith({
        status: 'in_progress',
        currentStep: 'group',
      })
    })

    it('previousStep goes to previous step', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'bank_account',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockUpsertOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'group',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.previousStep()
      })

      expect(mockUpsertOnboardingState).toHaveBeenCalledWith({
        status: 'in_progress',
        currentStep: 'group',
      })
    })

    it('goToStep jumps to specific step', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'profile',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockUpsertOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'expense',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.goToStep('expense')
      })

      expect(mockUpsertOnboardingState).toHaveBeenCalledWith({
        status: 'in_progress',
        currentStep: 'expense',
      })
    })
  })

  describe('complete', () => {
    it('persists completed state and closes wizard', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'credit_card',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockUpsertOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'completed',
          currentStep: 'done',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: new Date(),
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.complete()
      })

      expect(mockUpsertOnboardingState).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          currentStep: 'done',
        })
      )
      expect(mockCloseWizard).toHaveBeenCalled()
    })

    it('sets error on persistence failure', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'credit_card',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockUpsertOnboardingState.mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.complete()
      })

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('dismiss', () => {
    it('persists dismissed state and closes wizard', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'profile',
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      mockUpsertOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'dismissed',
          currentStep: 'profile',
          autoShownAt: new Date(),
          dismissedAt: new Date(),
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.dismiss()
      })

      expect(mockUpsertOnboardingState).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dismissed',
        })
      )
      expect(mockCloseWizard).toHaveBeenCalled()
    })
  })

  describe('progress calculation', () => {
    it('calculates progress based on current step', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: true,
        data: {
          id: 'state-id',
          userId: 'test-user-id',
          groupId: 'group-id',
          status: 'in_progress',
          currentStep: 'bank_account', // Step 3 of 7
          autoShownAt: new Date(),
          dismissedAt: null,
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Progress should be between 0 and 100
      expect(result.current.progress).toBeGreaterThan(0)
      expect(result.current.progress).toBeLessThanOrEqual(100)
    })
  })

  describe('error handling', () => {
    it('sets error when state fetch fails', async () => {
      mockGetOnboardingState.mockResolvedValue({
        success: false,
        error: 'Failed to load state',
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load state')
    })
  })

  describe('refetch', () => {
    it('refetches state when called', async () => {
      mockGetOnboardingState.mockResolvedValue({ success: true, data: null })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockGetOnboardingState.mockClear()

      act(() => {
        result.current.refetch()
      })

      await waitFor(() => {
        expect(mockGetOnboardingState).toHaveBeenCalled()
      })
    })
  })
})

