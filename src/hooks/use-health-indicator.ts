/**
 * Hook to compute health indicator status from projection data and staleness
 */

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
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
 * Calculate health status from danger day counts
 */
function calculateHealthStatus(
  optimisticDangerDays: number,
  pessimisticDangerDays: number
): HealthStatus {
  if (optimisticDangerDays > 0) return 'danger'
  if (pessimisticDangerDays > 0) return 'warning'
  return 'good'
}

/**
 * Generate human-readable message for health status
 */
function getHealthMessage(
  status: HealthStatus,
  optimisticDangerDays: number,
  pessimisticDangerDays: number
): string {
  switch (status) {
    case 'danger':
      return `${optimisticDangerDays} danger day${optimisticDangerDays !== 1 ? 's' : ''} even in best-case scenario`
    case 'warning':
      return `${pessimisticDangerDays} danger day${pessimisticDangerDays !== 1 ? 's' : ''} in worst-case scenario`
    case 'good':
      return 'No issues detected'
  }
}

/**
 * Hook to compute health indicator data
 */
export function useHealthIndicator(
  summaryStats: SummaryStats | null
): UseHealthIndicatorResult {
  // Fetch accounts and credit cards for staleness check
  const accounts = useLiveQuery(() => db.accounts.toArray())
  const creditCards = useLiveQuery(() => db.creditCards.toArray())

  const isLoading = accounts === undefined || creditCards === undefined

  // Calculate stale entities
  const staleEntities = useMemo((): StaleEntity[] => {
    if (isLoading) return []

    const stale: StaleEntity[] = []

    if (accounts) {
      for (const account of accounts) {
        if (isStale(account.balanceUpdatedAt)) {
          stale.push({
            id: account.id,
            name: account.name,
            type: 'account',
          })
        }
      }
    }

    if (creditCards) {
      for (const card of creditCards) {
        if (isStale(card.balanceUpdatedAt)) {
          stale.push({
            id: card.id,
            name: card.name,
            type: 'card',
          })
        }
      }
    }

    return stale
  }, [accounts, creditCards, isLoading])

  // Calculate health status
  const result = useMemo((): Omit<UseHealthIndicatorResult, 'isLoading'> => {
    if (!summaryStats) {
      return {
        status: 'good',
        message: 'No data available',
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

