/**
 * Dashboard page - Main entry point for cashflow visualization.
 * Orchestrates all dashboard components with loading/error/empty states.
 */

import { useState } from 'react'
import { useCashflowProjection } from '@/hooks/use-cashflow-projection'
import { useHealthIndicator } from '@/hooks/use-health-indicator'
import { usePreferencesStore } from '@/stores/preferences-store'
import { CashflowChart } from '@/components/cashflow/cashflow-chart'
import { SummaryPanel } from '@/components/cashflow/summary-panel'
import { HealthIndicator } from '@/components/cashflow/health-indicator'
import { ProjectionSelector } from '@/components/cashflow/projection-selector'
import { LoadingSkeleton } from '@/components/cashflow/loading-skeleton'
import { EmptyState } from '@/components/cashflow/empty-state'
import { ErrorState } from '@/components/cashflow/error-state'
import { QuickUpdateView } from '@/components/quick-update'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const [showQuickUpdate, setShowQuickUpdate] = useState(false)
  const { projectionDays, setProjectionDays } = usePreferencesStore()

  const {
    chartData,
    dangerRanges,
    summaryStats,
    isLoading,
    hasData,
    error,
    retry,
  } = useCashflowProjection()

  const healthIndicator = useHealthIndicator(summaryStats)

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Painel de Fluxo de Caixa
        </h1>
        <LoadingSkeleton />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Painel de Fluxo de Caixa
        </h1>
        <ErrorState error={error} onRetry={retry} />
      </div>
    )
  }

  // Empty state
  if (!hasData) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Painel de Fluxo de Caixa
        </h1>
        <EmptyState />
      </div>
    )
  }

  // Ready state with data
  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          Painel de Fluxo de Caixa
        </h1>
        <div className="flex items-center gap-4">
          <ProjectionSelector
            value={projectionDays}
            onChange={setProjectionDays}
          />
          <Button onClick={() => setShowQuickUpdate(true)}>
            Atualizar Saldos
          </Button>
        </div>
      </div>

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

      {/* Quick Update Modal */}
      {showQuickUpdate && (
        <QuickUpdateView
          onDone={() => setShowQuickUpdate(false)}
          onCancel={() => setShowQuickUpdate(false)}
        />
      )}
    </div>
  )
}

