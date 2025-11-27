/**
 * Hook to compute cashflow projection from database.
 * Uses Supabase realtime subscriptions for reactive updates.
 */

import { useMemo, useCallback, useState } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { calculateCashflow } from '@/lib/cashflow'
import { formatChartDate } from '@/lib/format'
import { usePreferencesStore } from '@/stores/preferences-store'
import type { CashflowProjection, DailySnapshot } from '@/lib/cashflow/types'
import type { ChartDataPoint, DangerRange, SummaryStats } from '@/components/cashflow/types'
import type { ProjectionDays } from '@/types'

/**
 * Transform DailySnapshot array to chart-compatible format.
 * Converts cents to dollars and formats dates for display.
 */
export function transformToChartData(days: DailySnapshot[]): ChartDataPoint[] {
  return days.map((day) => ({
    date: formatChartDate(day.date),
    timestamp: day.date.getTime(),
    optimisticBalance: day.optimisticBalance / 100,
    pessimisticBalance: day.pessimisticBalance / 100,
    isOptimisticDanger: day.isOptimisticDanger,
    isPessimisticDanger: day.isPessimisticDanger,
    snapshot: day,
  }))
}

/**
 * Consolidate individual danger days into continuous ranges for ReferenceArea rendering.
 * Groups consecutive danger days together to minimize chart elements.
 */
export function getDangerRanges(chartData: ChartDataPoint[]): DangerRange[] {
  const ranges: DangerRange[] = []
  let currentRange: DangerRange | null = null

  for (const point of chartData) {
    const isOptimisticDanger = point.isOptimisticDanger
    const isPessimisticDanger = point.isPessimisticDanger

    if (!isOptimisticDanger && !isPessimisticDanger) {
      // End current range if exists
      if (currentRange) {
        ranges.push(currentRange)
        currentRange = null
      }
      continue
    }

    const scenario: DangerRange['scenario'] =
      isOptimisticDanger && isPessimisticDanger
        ? 'both'
        : isOptimisticDanger
          ? 'optimistic'
          : 'pessimistic'

    if (!currentRange) {
      // Start new range
      currentRange = {
        start: point.date,
        end: point.date,
        scenario,
      }
    } else if (currentRange.scenario === scenario) {
      // Extend current range
      currentRange.end = point.date
    } else {
      // Different scenario, end current and start new
      ranges.push(currentRange)
      currentRange = {
        start: point.date,
        end: point.date,
        scenario,
      }
    }
  }

  // Don't forget the last range
  if (currentRange) {
    ranges.push(currentRange)
  }

  return ranges
}

/**
 * Transform projection to summary statistics.
 * Converts cents to dollars for display.
 */
function transformToSummaryStats(projection: CashflowProjection): SummaryStats {
  const startingBalance = projection.startingBalance / 100
  const optimisticEndBalance = projection.optimistic.endBalance / 100
  const pessimisticEndBalance = projection.pessimistic.endBalance / 100

  return {
    startingBalance,
    optimistic: {
      totalIncome: projection.optimistic.totalIncome / 100,
      totalExpenses: projection.optimistic.totalExpenses / 100,
      endBalance: optimisticEndBalance,
      dangerDayCount: projection.optimistic.dangerDayCount,
      surplus: optimisticEndBalance - startingBalance,
    },
    pessimistic: {
      totalIncome: projection.pessimistic.totalIncome / 100,
      totalExpenses: projection.pessimistic.totalExpenses / 100,
      endBalance: pessimisticEndBalance,
      dangerDayCount: projection.pessimistic.dangerDayCount,
      surplus: pessimisticEndBalance - startingBalance,
    },
  }
}

export interface UseCashflowProjectionOptions {
  /** Override projection days (defaults to user preference) */
  projectionDays?: ProjectionDays
}

export interface UseCashflowProjectionResult {
  /** Raw projection from engine (null while loading) */
  projection: CashflowProjection | null
  /** Chart-ready data points */
  chartData: ChartDataPoint[]
  /** Consolidated danger day ranges */
  dangerRanges: DangerRange[]
  /** Summary statistics for panel */
  summaryStats: SummaryStats | null
  /** Loading state */
  isLoading: boolean
  /** Whether any financial data exists */
  hasData: boolean
  /** Error state */
  error: Error | null
  /** Retry function for error recovery */
  retry: () => void
  /** Current projection days being used */
  projectionDays: ProjectionDays
}

/**
 * Result of cashflow calculation - either success with projection or error.
 */
type CalculationResult =
  | { success: true; projection: CashflowProjection }
  | { success: false; error: Error }

/**
 * Hook to compute and provide cashflow projection data.
 * Automatically updates when underlying database changes.
 * @param options - Optional configuration for projection
 */
export function useCashflowProjection(
  options?: UseCashflowProjectionOptions
): UseCashflowProjectionResult {
  const [retryCount, setRetryCount] = useState(0)
  const preferencesDays = usePreferencesStore((state) => state.projectionDays)
  const projectionDays = options?.projectionDays ?? preferencesDays

  // Fetch all data from database with realtime subscriptions
  const {
    accounts,
    projects,
    expenses,
    creditCards,
    isLoading,
    error: fetchError,
  } = useFinanceData()

  // Force re-render on retry by including retryCount in dependency
  // This is a no-op but ensures the hook re-evaluates
  const _retryTrigger = retryCount

  // Determine if any data exists
  const hasData = !isLoading && (
    accounts.length > 0 ||
    projects.length > 0 ||
    expenses.length > 0 ||
    creditCards.length > 0
  )

  // Calculate projection (memoized, pure computation)
  const calculationResult = useMemo((): CalculationResult | null => {
    // Include retryCount to force recalculation on retry
    void _retryTrigger
    
    if (isLoading) return null

    try {
      const projection = calculateCashflow({
        accounts,
        projects,
        expenses,
        creditCards,
        projectionDays,
      })
      return { success: true, projection }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Falha ao calcular projeção'),
      }
    }
  }, [isLoading, accounts, projects, expenses, creditCards, projectionDays, _retryTrigger])

  // Extract projection and error from result
  const projection = calculationResult?.success ? calculationResult.projection : null
  const calculationError = calculationResult && !calculationResult.success ? calculationResult.error : null
  const error = fetchError ? new Error(fetchError) : calculationError

  // Transform to chart data (memoized)
  const chartData = useMemo(() => {
    if (!projection) return []
    return transformToChartData(projection.days)
  }, [projection])

  // Get danger ranges (memoized)
  const dangerRanges = useMemo(() => {
    return getDangerRanges(chartData)
  }, [chartData])

  // Transform to summary stats (memoized)
  const summaryStats = useMemo(() => {
    if (!projection) return null
    return transformToSummaryStats(projection)
  }, [projection])

  // Retry function
  const retry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  return {
    projection,
    chartData,
    dangerRanges,
    summaryStats,
    isLoading,
    hasData,
    error,
    retry,
    projectionDays,
  }
}
