/**
 * Dashboard page - Main entry point for cashflow visualization.
 * Orchestrates all dashboard components with coordinated loading/error/empty states.
 */

import { useMemo, useState } from 'react'
import { useCashflowProjection } from '@/hooks/use-cashflow-projection'
import { useCoordinatedLoading } from '@/hooks/use-coordinated-loading'
import { useHealthIndicator } from '@/hooks/use-health-indicator'
import { useFinanceData } from '@/hooks/use-finance-data'
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
import { Button } from '@/components/ui/button'
import { Toast } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ProjectionDays } from '@/types'
import { DEFAULT_LINE_VISIBILITY, type LineVisibility } from '@/components/cashflow/types'

export function Dashboard() {
  const [showQuickUpdate, setShowQuickUpdate] = useState(false)
  const [showSaveSnapshot, setShowSaveSnapshot] = useState(false)
  const [chartVisibility, setChartVisibility] = useState<LineVisibility>(DEFAULT_LINE_VISIBILITY)
  const { projectionDays, setProjectionDays } = usePreferencesStore()
  const { toast, showSuccess, showError, hideToast } = useToast()

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
        <EmptyState />
      </div>
    )
  }

  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          Painel de Fluxo de Caixa
        </h1>
        {/* Only show controls when not loading */}
        {!loadingState.showSkeleton && !loadingState.showError && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <ProjectionSelector
              value={projectionDays}
              onChange={setProjectionDays}
            />
            <Button
              variant="outline"
              onClick={() => setShowSaveSnapshot(true)}
              disabled={!projection}
              className="w-full sm:w-auto"
            >
              Salvar Projeção
            </Button>
            <Button onClick={() => setShowQuickUpdate(true)} className="w-full sm:w-auto">
              Atualizar Saldos
            </Button>
          </div>
        )}
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

          {/* Estimated-today indicator (scenario-specific) */}
          {estimate?.hasBase && estimate.base && estimate.isEstimated[activeScenario] && (
            <EstimatedBalanceIndicator
              base={estimate.base}
              onUpdateBalances={() => setShowQuickUpdate(true)}
            />
          )}

          {/* Summary Panel */}
          {summaryStats && <SummaryPanel stats={summaryStats} />}

          {/* Cashflow Chart */}
          <CashflowChart
            chartData={chartData}
            dangerRanges={dangerRanges}
            onVisibilityChange={setChartVisibility}
          />
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
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
          onRetry={toast.onRetry}
        />
      )}
    </div>
  )
}
