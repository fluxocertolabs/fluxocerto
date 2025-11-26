/**
 * Dashboard page - Main entry point for cashflow visualization.
 * Orchestrates all dashboard components with loading/error/empty states.
 */

import { useCashflowProjection } from '@/hooks/use-cashflow-projection'
import { CashflowChart } from '@/components/cashflow/cashflow-chart'
import { SummaryPanel } from '@/components/cashflow/summary-panel'
import { LoadingSkeleton } from '@/components/cashflow/loading-skeleton'
import { EmptyState } from '@/components/cashflow/empty-state'
import { ErrorState } from '@/components/cashflow/error-state'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const {
    chartData,
    dangerRanges,
    summaryStats,
    isLoading,
    hasData,
    error,
    retry,
  } = useCashflowProjection()

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Cashflow Dashboard
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
          Cashflow Dashboard
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
          Cashflow Dashboard
        </h1>
        <EmptyState />
      </div>
    )
  }

  // Ready state with data
  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Cashflow Dashboard
      </h1>

      <div className="space-y-6">
        {/* Summary Panel */}
        {summaryStats && <SummaryPanel stats={summaryStats} />}

        {/* Cashflow Chart */}
        <CashflowChart chartData={chartData} dangerRanges={dangerRanges} />
      </div>
    </div>
  )
}

