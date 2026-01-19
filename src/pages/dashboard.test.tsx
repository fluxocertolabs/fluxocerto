/**
 * Tests for Dashboard page component.
 *
 * Covers:
 * - Empty state when no financial data exists
 * - Populated state with chart and summary when data exists
 * - Loading state display
 * - Error state with retry functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './dashboard'
import type { UseCashflowProjectionResult } from '@/hooks/use-cashflow-projection'
import type { UseCoordinatedLoadingResult } from '@/hooks/use-coordinated-loading'

// Mock useCashflowProjection hook
const mockUseCashflowProjection = vi.fn<[], UseCashflowProjectionResult>()
vi.mock('@/hooks/use-cashflow-projection', () => ({
  useCashflowProjection: () => mockUseCashflowProjection(),
}))

// Mock useCoordinatedLoading hook
const mockUseCoordinatedLoading = vi.fn<[], UseCoordinatedLoadingResult>()
vi.mock('@/hooks/use-coordinated-loading', () => ({
  useCoordinatedLoading: () => mockUseCoordinatedLoading(),
}))

// Mock useHealthIndicator hook
vi.mock('@/hooks/use-health-indicator', () => ({
  useHealthIndicator: () => ({
    status: 'good',
    message: '',
    isLoading: false,
    isStale: false,
    staleEntities: [],
  }),
}))

// Mock useFinanceData hook
vi.mock('@/hooks/use-finance-data', () => ({
  useFinanceData: () => ({
    accounts: [],
    projects: [],
    singleShotIncome: [],
    fixedExpenses: [],
    singleShotExpenses: [],
    creditCards: [],
    futureStatements: [],
    isLoading: false,
    error: null,
  }),
}))

// Mock usePageTour hook
vi.mock('@/hooks/use-page-tour', () => ({
  usePageTour: () => ({
    isTourActive: false,
    currentStepIndex: 0,
    nextStep: vi.fn(),
    previousStep: vi.fn(),
    completeTour: vi.fn(),
    dismissTour: vi.fn(),
  }),
}))

// Mock stores
vi.mock('@/stores/onboarding-store', () => ({
  useOnboardingStore: () => ({
    openWizard: vi.fn(),
  }),
}))

vi.mock('@/stores/preferences-store', () => ({
  usePreferencesStore: () => ({
    projectionDays: 30,
    setProjectionDays: vi.fn(),
  }),
}))

vi.mock('@/stores/snapshots-store', () => ({
  useSnapshotsStore: () => ({
    createSnapshot: vi.fn(),
    isLoading: false,
  }),
}))

// Mock tour definitions
vi.mock('@/lib/tours/definitions', () => ({
  getTourDefinition: () => ({
    steps: [],
  }),
}))

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    hideToast: vi.fn(),
  }),
}))

// Mock child components to simplify tests
vi.mock('@/components/cashflow/cashflow-chart', () => ({
  CashflowChart: () => <div data-testid="cashflow-chart">Chart</div>,
}))

vi.mock('@/components/cashflow/summary-panel', () => ({
  SummaryPanel: () => <div data-testid="summary-panel">Summary</div>,
}))

vi.mock('@/components/cashflow/empty-state', () => ({
  EmptyState: ({ onStartSetup }: { onStartSetup: () => void }) => (
    <div data-testid="empty-state">
      <button onClick={onStartSetup}>Iniciar Configuração</button>
    </div>
  ),
}))

vi.mock('@/components/loading', () => ({
  PageLoadingWrapper: ({ children, loadingState }: { children: React.ReactNode; loadingState: UseCoordinatedLoadingResult }) => (
    loadingState.showSkeleton ? <div data-testid="loading-skeleton">Loading...</div> :
    loadingState.showError ? <div data-testid="error-state">Error: {loadingState.errorMessage}</div> :
    <>{children}</>
  ),
  DashboardSkeleton: () => <div>Skeleton</div>,
}))

vi.mock('@/components/quick-update', () => ({
  QuickUpdateView: ({ onDone }: { onDone: () => void }) => (
    <div data-testid="quick-update-modal">
      <button onClick={onDone}>Done</button>
    </div>
  ),
}))

vi.mock('@/components/snapshots', () => ({
  SaveSnapshotDialog: () => null,
}))

vi.mock('@/components/tours', () => ({
  TourRunner: () => null,
}))

vi.mock('@/components/cashflow', () => ({
  EstimatedBalanceIndicator: () => null,
}))

vi.mock('@/components/cashflow/health-indicator', () => ({
  HealthIndicator: () => null,
}))

vi.mock('@/components/cashflow/projection-selector', () => ({
  ProjectionSelector: () => <div data-testid="projection-selector">Projection Selector</div>,
}))

vi.mock('@/components/ui/toast', () => ({
  Toast: () => null,
}))

// Helper to render with router
function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

// Default mock values
const defaultCashflowResult: UseCashflowProjectionResult = {
  projection: null,
  estimate: null,
  chartData: [],
  dangerRanges: [],
  summaryStats: null,
  isLoading: false,
  hasData: false,
  error: null,
  retry: vi.fn(),
  projectionDays: 30,
}

const defaultLoadingState: UseCoordinatedLoadingResult = {
  showSkeleton: false,
  showError: false,
  errorMessage: null,
  retry: vi.fn(),
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCashflowProjection.mockReturnValue(defaultCashflowResult)
    mockUseCoordinatedLoading.mockReturnValue(defaultLoadingState)
  })

  describe('empty state', () => {
    it('renders empty state when no data exists', () => {
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        hasData: false,
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: false,
        showError: false,
      })

      renderDashboard()

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('Painel de Fluxo de Caixa')).toBeInTheDocument()
    })

    it('shows setup button in empty state', () => {
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        hasData: false,
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: false,
        showError: false,
      })

      renderDashboard()

      expect(screen.getByRole('button', { name: /iniciar configuração/i })).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders loading skeleton when loading', () => {
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        isLoading: true,
        hasData: false,
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: true,
      })

      renderDashboard()

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders error state when error occurs', () => {
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        error: new Error('Failed to load'),
        hasData: false,
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showError: true,
        errorMessage: 'Failed to load',
      })

      renderDashboard()

      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  describe('populated state', () => {
    it('renders chart and summary when data exists', () => {
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        hasData: true,
        projection: {
          days: [],
          optimisticSummary: {
            minBalance: 0,
            maxBalance: 0,
            avgBalance: 0,
            dangerDays: 0,
            totalIncome: 0,
            totalExpenses: 0,
          },
          pessimisticSummary: {
            minBalance: 0,
            maxBalance: 0,
            avgBalance: 0,
            dangerDays: 0,
            totalIncome: 0,
            totalExpenses: 0,
          },
        },
        summaryStats: {
          currentBalance: 1000,
          projectedBalance: 2000,
          totalIncome: 5000,
          totalExpenses: 3000,
          lowestBalance: 500,
          dangerDays: 0,
        },
        chartData: [
          {
            date: '01/01',
            timestamp: Date.now(),
            optimisticBalance: 1000,
            pessimisticBalance: 900,
            investmentInclusiveBalance: 1100,
            isOptimisticDanger: false,
            isPessimisticDanger: false,
            snapshot: {
              date: new Date(),
              optimisticBalance: 100000,
              pessimisticBalance: 90000,
              isOptimisticDanger: false,
              isPessimisticDanger: false,
              events: [],
            },
          },
        ],
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: false,
        showError: false,
      })

      renderDashboard()

      expect(screen.getByTestId('cashflow-chart')).toBeInTheDocument()
      expect(screen.getByTestId('summary-panel')).toBeInTheDocument()
    })

    it('shows projection selector when data exists', () => {
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        hasData: true,
        projection: {
          days: [],
          optimisticSummary: {
            minBalance: 0,
            maxBalance: 0,
            avgBalance: 0,
            dangerDays: 0,
            totalIncome: 0,
            totalExpenses: 0,
          },
          pessimisticSummary: {
            minBalance: 0,
            maxBalance: 0,
            avgBalance: 0,
            dangerDays: 0,
            totalIncome: 0,
            totalExpenses: 0,
          },
        },
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: false,
        showError: false,
      })

      renderDashboard()

      expect(screen.getByTestId('projection-selector')).toBeInTheDocument()
    })
  })

  describe('quick update modal', () => {
    it('opens quick update modal when button is clicked', async () => {
      const user = userEvent.setup()
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        hasData: true,
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: false,
        showError: false,
      })

      renderDashboard()

      await user.click(screen.getByRole('button', { name: /atualizar saldos/i }))

      await waitFor(() => {
        expect(screen.getByTestId('quick-update-modal')).toBeInTheDocument()
      })
    })

    it('closes quick update modal when done', async () => {
      const user = userEvent.setup()
      mockUseCashflowProjection.mockReturnValue({
        ...defaultCashflowResult,
        hasData: true,
      })
      mockUseCoordinatedLoading.mockReturnValue({
        ...defaultLoadingState,
        showSkeleton: false,
        showError: false,
      })

      renderDashboard()

      await user.click(screen.getByRole('button', { name: /atualizar saldos/i }))

      await waitFor(() => {
        expect(screen.getByTestId('quick-update-modal')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => {
        expect(screen.queryByTestId('quick-update-modal')).not.toBeInTheDocument()
      })
    })
  })
})

