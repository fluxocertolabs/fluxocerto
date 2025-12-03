/**
 * Dashboard page - Main entry point for cashflow visualization.
 * Orchestrates all dashboard components with coordinated loading/error/empty states.
 */

import { useState } from 'react'
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
import { PageLoadingWrapper, DashboardSkeleton } from '@/components/loading'
import { QuickUpdateView } from '@/components/quick-update'
import { SaveSnapshotDialog } from '@/components/snapshots'
import { Button } from '@/components/ui/button'
import { Toast } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ProjectionDays } from '@/types'

export function Dashboard() {
  const [showQuickUpdate, setShowQuickUpdate] = useState(false)
  const [showSaveSnapshot, setShowSaveSnapshot] = useState(false)
  const { projectionDays, setProjectionDays } = usePreferencesStore()
  const { toast, showSuccess, showError, hideToast } = useToast()

  // Get finance data for snapshot input state
  const financeData = useFinanceData()

  const {
    projection,
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
      showSuccess('Snapshot salvo com sucesso!')
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
          <div className="flex items-center gap-4">
            <ProjectionSelector
              value={projectionDays}
              onChange={setProjectionDays}
            />
            <Button
              variant="outline"
              onClick={() => setShowSaveSnapshot(true)}
              disabled={!projection}
            >
              Salvar Snapshot
            </Button>
            <Button onClick={() => setShowQuickUpdate(true)}>
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
          {!healthIndicator.isLoading && (
            <HealthIndicator
              status={healthIndicator.status}
              message={healthIndicator.message}
              isStale={healthIndicator.isStale}
              staleCount={healthIndicator.staleEntities.length}
              onStaleClick={() => setShowQuickUpdate(true)}
            />
          )}

          {/* Summary Panel */}
          {summaryStats && <SummaryPanel stats={summaryStats} />}

          {/* Cashflow Chart */}
          <CashflowChart chartData={chartData} dangerRanges={dangerRanges} />
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
