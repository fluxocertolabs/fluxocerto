/**
 * Dashboard page - Main entry point for cashflow visualization.
 * Orchestrates all dashboard components with coordinated loading/error/empty states.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCashflowProjection } from '@/hooks/use-cashflow-projection'
import { useCoordinatedLoading } from '@/hooks/use-coordinated-loading'
import { useHealthIndicator } from '@/hooks/use-health-indicator'
import { useFinanceData } from '@/hooks/use-finance-data'
import { usePageTour } from '@/hooks/use-page-tour'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { usePreferencesStore } from '@/stores/preferences-store'
import { useSnapshotsStore } from '@/stores/snapshots-store'
import { CashflowChart } from '@/components/cashflow/cashflow-chart'
import { SummaryPanel } from '@/components/cashflow/summary-panel'
import { HealthIndicator } from '@/components/cashflow/health-indicator'
import { ProjectionSelector } from '@/components/cashflow/projection-selector'
import { EmptyState } from '@/components/cashflow/empty-state'
import { EstimatedBalanceIndicator } from '@/components/cashflow'
import { PageLoadingWrapper, DashboardSkeleton } from '@/components/loading'
import { QuickUpdateView } from '@/components/quick-update'
import { SaveSnapshotDialog } from '@/components/snapshots'
import { TourRunner } from '@/components/tours'
import { Button } from '@/components/ui/button'
import { Toast } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getTourDefinition } from '@/lib/tours/definitions'
import { captureEvent } from '@/lib/analytics/posthog'
import type { ProjectionDays } from '@/types'
import { DEFAULT_LINE_VISIBILITY, type LineVisibility } from '@/components/cashflow/types'

export function Dashboard() {
  const [showQuickUpdate, setShowQuickUpdate] = useState(false)
  const [showSaveSnapshot, setShowSaveSnapshot] = useState(false)
  const [chartVisibility, setChartVisibility] = useState<LineVisibility>(DEFAULT_LINE_VISIBILITY)
  const hasTrackedProjectionView = useRef(false)
  const { projectionDays, setProjectionDays } = usePreferencesStore()
  const { openWizard } = useOnboardingStore()
  const { toast, showSuccess, showError, hideToast } = useToast()
  
  // Page tour
  const dashboardTour = usePageTour('dashboard')
  const tourDefinition = getTourDefinition('dashboard')

  // Get finance data for snapshot input state
  const financeData = useFinanceData()

  const {
    projection,
    estimate,
    chartData,
    dangerRanges,
    summaryStats,
    isLoading,
    hasData,
    error,
    retry,
  } = useCashflowProjection()

  // Snapshots store
  const { createSnapshot, isLoading: isSnapshotLoading } = useSnapshotsStore()

  // Coordinated loading state for smooth transitions
  const loadingState = useCoordinatedLoading(
    isLoading,
    error?.message ?? null,
    retry
  )

  const healthIndicator = useHealthIndicator(summaryStats)

  const activeScenario = useMemo<'optimistic' | 'pessimistic'>(() => {
    if (chartVisibility.optimistic && !chartVisibility.pessimistic) return 'optimistic'
    if (chartVisibility.pessimistic && !chartVisibility.optimistic) return 'pessimistic'
    // Default: optimistic is the app's "best case" baseline
    return 'optimistic'
  }, [chartVisibility])

  useEffect(() => {
    if (loadingState.showSkeleton || loadingState.showError) {
      return
    }
    if (!projection || !hasData || hasTrackedProjectionView.current) {
      return
    }
    hasTrackedProjectionView.current = true
    captureEvent('projection_viewed', {
      has_danger_days: dangerRanges.length > 0,
      time_window: projection.days.length,
    })
  }, [loadingState.showSkeleton, loadingState.showError, projection, hasData, dangerRanges.length])

  // Handle save snapshot
  const handleSaveSnapshot = async (name: string) => {
    if (!projection) {
      return { success: false, error: 'Projeção não disponível' }
    }

    const result = await createSnapshot({
      name,
      inputs: {
        accounts: financeData.accounts,
        projects: financeData.projects,
        singleShotIncome: financeData.singleShotIncome,
        fixedExpenses: financeData.fixedExpenses,
        singleShotExpenses: financeData.singleShotExpenses,
        creditCards: financeData.creditCards,
        futureStatements: financeData.futureStatements,
        projectionDays: projection.days.length as ProjectionDays,
      },
      projection,
    })

    if (result.success) {
      showSuccess('Projeção salva com sucesso!')
      captureEvent('snapshot_saved', {
        projection_days: projection.days.length as ProjectionDays,
      })
    } else {
      showError(result.error, () => handleSaveSnapshot(name))
    }

    return result
  }

  // Empty state check (after loading complete)
  if (!loadingState.showSkeleton && !loadingState.showError && !hasData) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Painel de Fluxo de Caixa
        </h1>
        <EmptyState onStartSetup={openWizard} />
      </div>
    )
  }

  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          Painel de Fluxo de Caixa
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {/* Projection + snapshot controls depend on projection data; keep them hidden while loading/error */}
          {!loadingState.showSkeleton && !loadingState.showError && (
            <>
              <div data-tour="projection-selector">
                <ProjectionSelector
                  value={projectionDays}
                  onChange={setProjectionDays}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSaveSnapshot(true)}
                disabled={!projection}
                className="w-full sm:w-auto"
                data-tour="save-snapshot"
              >
                Salvar Projeção
              </Button>
            </>
          )}

          {/* Quick Update is a safe action even while the chart is (re)loading or in an error state. */}
          <Button
            onClick={() => setShowQuickUpdate(true)}
            className="w-full sm:w-auto"
            data-tour="quick-update"
          >
            Atualizar Saldos
          </Button>
        </div>
      </div>

      <PageLoadingWrapper
        loadingState={loadingState}
        skeleton={<DashboardSkeleton />}
      >
        <div className="space-y-6">
          {/* Health Indicator */}
          {!healthIndicator.isLoading && healthIndicator.status !== 'good' && (
            <HealthIndicator
              status={healthIndicator.status}
              message={healthIndicator.message}
              isStale={healthIndicator.isStale}
              staleCount={healthIndicator.staleEntities.length}
              onStaleClick={() => setShowQuickUpdate(true)}
            />
          )}

          {/* No reliable base guidance (FR-009) */}
          {estimate && !estimate.hasBase && (
            <div
              className={cn(
                'rounded-xl border p-4',
                'bg-muted/40 border-border',
                'flex items-center justify-between gap-4 flex-wrap'
              )}
            >
              <div>
                <h2 className="font-semibold text-foreground">Atualize seus saldos</h2>
                <p className="text-sm text-muted-foreground">
                  Para calcular o saldo de hoje, atualize os saldos das suas contas.
                </p>
              </div>
              <Button onClick={() => setShowQuickUpdate(true)}>Atualizar Saldos</Button>
            </div>
          )}

          {/* Estimated-today indicator (scenario-specific)
              Hide when there is stale data guidance, to avoid duplicate banners. */}
          {estimate?.hasBase &&
            estimate.base &&
            estimate.isEstimated[activeScenario] &&
            !healthIndicator.isStale && (
            <EstimatedBalanceIndicator
              base={estimate.base}
              onUpdateBalances={() => setShowQuickUpdate(true)}
            />
          )}

          {/* Summary Panel */}
          {summaryStats && (
            <div data-tour="summary-panel">
              <SummaryPanel stats={summaryStats} />
            </div>
          )}

          {/* Cashflow Chart */}
          <div data-tour="cashflow-chart">
            <CashflowChart
              chartData={chartData}
              dangerRanges={dangerRanges}
              onVisibilityChange={setChartVisibility}
            />
          </div>
        </div>
      </PageLoadingWrapper>

      {/* Quick Update Modal */}
      {showQuickUpdate && (
        <QuickUpdateView
          onDone={() => setShowQuickUpdate(false)}
          onCancel={() => setShowQuickUpdate(false)}
        />
      )}

      {/* Save Snapshot Dialog */}
      <SaveSnapshotDialog
        open={showSaveSnapshot}
        onOpenChange={setShowSaveSnapshot}
        onSave={handleSaveSnapshot}
        isLoading={isSnapshotLoading}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
          onRetry={toast.onRetry}
        />
      )}

      {/* Page Tour */}
      <TourRunner
        steps={tourDefinition.steps}
        currentStepIndex={dashboardTour.currentStepIndex}
        onNext={dashboardTour.nextStep}
        onPrevious={dashboardTour.previousStep}
        onComplete={dashboardTour.completeTour}
        onDismiss={dashboardTour.dismissTour}
        isActive={dashboardTour.isTourActive}
      />
    </div>
  )
}
