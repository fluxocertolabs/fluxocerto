/**
 * Hook to transform frozen snapshot data for chart/summary display.
 * Handles date parsing from JSON serialization and schema version compatibility.
 */

import { useMemo } from 'react'
import {
  transformToChartData,
  getDangerRanges,
  transformToSummaryStats,
} from '@/hooks/use-cashflow-projection'
import { isSchemaVersionCompatible, CURRENT_SCHEMA_VERSION } from '@/lib/snapshots'
import type { ProjectionSnapshot } from '@/types/snapshot'
import type { ChartDataPoint, DangerRange, SummaryStats } from '@/components/cashflow/types'
import type { CashflowProjection, DailySnapshot } from '@/lib/cashflow/types'

interface UseSnapshotProjectionResult {
  chartData: ChartDataPoint[]
  dangerRanges: DangerRange[]
  summaryStats: SummaryStats | null
}

/**
 * Parse dates from JSON-serialized projection data.
 * JSON stores dates as ISO strings, need to convert back to Date objects.
 */
function parseDatesInProjection(projection: CashflowProjection): CashflowProjection {
  return {
    ...projection,
    startDate: new Date(projection.startDate),
    endDate: new Date(projection.endDate),
    days: projection.days.map((day) => ({
      ...day,
      date: new Date(day.date),
    })),
    optimistic: {
      ...projection.optimistic,
      dangerDays: projection.optimistic.dangerDays.map((d) => ({
        ...d,
        date: new Date(d.date),
      })),
    },
    pessimistic: {
      ...projection.pessimistic,
      dangerDays: projection.pessimistic.dangerDays.map((d) => ({
        ...d,
        date: new Date(d.date),
      })),
    },
  }
}

/**
 * Calculate investment total from snapshot inputs.
 */
function calculateInvestmentTotal(snapshot: ProjectionSnapshot): number {
  return snapshot.data.inputs.accounts
    .filter((a) => a.type === 'investment')
    .reduce((sum, a) => sum + a.balance, 0)
}

/**
 * Hook to transform frozen snapshot data for chart and summary display.
 * Reuses existing transformation functions from useCashflowProjection.
 */
export function useSnapshotProjection(
  snapshot: ProjectionSnapshot | null
): UseSnapshotProjectionResult {
  // Parse dates and transform data
  const projection = useMemo(() => {
    if (!snapshot) return null

    // Check schema version compatibility
    if (!isSchemaVersionCompatible(snapshot.schemaVersion)) {
      console.warn(
        `Snapshot schema version ${snapshot.schemaVersion} may not be fully compatible with current version ${CURRENT_SCHEMA_VERSION}`
      )
    }

    // Parse dates from JSON serialization
    return parseDatesInProjection(snapshot.data.projection)
  }, [snapshot])

  // Calculate investment total
  const investmentTotal = useMemo(() => {
    if (!snapshot) return 0
    return calculateInvestmentTotal(snapshot)
  }, [snapshot])

  // Transform to chart data
  const chartData = useMemo(() => {
    if (!projection) return []
    return transformToChartData(projection.days as DailySnapshot[], investmentTotal)
  }, [projection, investmentTotal])

  // Get danger ranges
  const dangerRanges = useMemo(() => {
    return getDangerRanges(chartData)
  }, [chartData])

  // Transform to summary stats
  const summaryStats = useMemo(() => {
    if (!projection) return null
    return transformToSummaryStats(projection as CashflowProjection)
  }, [projection])

  return {
    chartData,
    dangerRanges,
    summaryStats,
  }
}

