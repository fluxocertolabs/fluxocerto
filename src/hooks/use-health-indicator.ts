/**
 * Hook to compute health indicator status from projection data and staleness
 */

import { useMemo } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { isStale } from '@/lib/staleness'
import type { SummaryStats } from '@/components/cashflow/types'

export type HealthStatus = 'good' | 'warning' | 'danger'

export interface StaleEntity {
  id: string
  name: string
  type: 'account' | 'card'
}

export interface UseHealthIndicatorResult {
  /** Current health status */
  status: HealthStatus
  /** Human-readable status message */
  message: string
  /** Whether any entity has stale data (>30 days) */
  isStale: boolean
  /** List of entities with stale data */
  staleEntities: StaleEntity[]
  /** Danger day counts for display */
  dangerDays: {
    optimistic: number
    pessimistic: number
  }
  /** Whether data is still loading */
  isLoading: boolean
}

/**
 * Calculate health status from danger day counts.
 * Exported for unit testing.
 */
export function calculateHealthStatus(
  optimisticDangerDays: number,
  pessimisticDangerDays: number
): HealthStatus {
  if (optimisticDangerDays > 0) return 'danger'
  if (pessimisticDangerDays > 0) return 'warning'
  return 'good'
}

/**
 * Generate human-readable message for health status.
 * Exported for unit testing.
 */
export function getHealthMessage(
  status: HealthStatus,
  optimisticDangerDays: number,
  pessimisticDangerDays: number
): string {
  switch (status) {
    case 'danger':
      return `${optimisticDangerDays} ${optimisticDangerDays !== 1 ? 'dias de perigo' : 'dia de perigo'} mesmo no melhor cenário`
    case 'warning':
      return `${pessimisticDangerDays} ${pessimisticDangerDays !== 1 ? 'dias de perigo' : 'dia de perigo'} no pior cenário`
    case 'good':
      return 'Nenhum problema detectado'
  }
}

/**
 * Hook to compute health indicator data
 */
export function useHealthIndicator(
  summaryStats: SummaryStats | null
): UseHealthIndicatorResult {
  // Fetch accounts and credit cards for staleness check
  const { accounts, creditCards, isLoading } = useFinanceData()

  // Calculate stale entities
  const staleEntities = useMemo((): StaleEntity[] => {
    if (isLoading) return []

    const stale: StaleEntity[] = []

    for (const account of accounts) {
      if (isStale(account.balanceUpdatedAt)) {
        stale.push({
          id: account.id,
          name: account.name,
          type: 'account',
        })
      }
    }

    for (const card of creditCards) {
      if (isStale(card.balanceUpdatedAt)) {
        stale.push({
          id: card.id,
          name: card.name,
          type: 'card',
        })
      }
    }

    return stale
  }, [accounts, creditCards, isLoading])

  // Calculate health status
  const result = useMemo((): Omit<UseHealthIndicatorResult, 'isLoading'> => {
    if (!summaryStats) {
      return {
        status: 'good',
        message: 'Nenhum dado disponível',
        isStale: staleEntities.length > 0,
        staleEntities,
        dangerDays: { optimistic: 0, pessimistic: 0 },
      }
    }

    const optimisticDangerDays = summaryStats.optimistic.dangerDayCount
    const pessimisticDangerDays = summaryStats.pessimistic.dangerDayCount

    const status = calculateHealthStatus(optimisticDangerDays, pessimisticDangerDays)
    const message = getHealthMessage(status, optimisticDangerDays, pessimisticDangerDays)

    return {
      status,
      message,
      isStale: staleEntities.length > 0,
      staleEntities,
      dangerDays: {
        optimistic: optimisticDangerDays,
        pessimistic: pessimisticDangerDays,
      },
    }
  }, [summaryStats, staleEntities])

  return {
    ...result,
    isLoading,
  }
}
