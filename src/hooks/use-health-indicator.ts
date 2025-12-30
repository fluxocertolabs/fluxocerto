/**
 * Hook to compute health indicator status from projection data and staleness
 */

import { useMemo } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { isStale } from '@/lib/staleness'
import { formatCurrency, formatDayMonth } from '@/lib/format'
import type { SummaryStats } from '@/components/cashflow/types'

export type HealthStatus = 'good' | 'caution' | 'warning' | 'danger'

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

const NEAR_DANGER_STARTING_RATIO = 0.05
const NEAR_DANGER_THRESHOLD_MIN_REAIS = 1_000
const NEAR_DANGER_THRESHOLD_MAX_REAIS = 20_000

/**
 * Compute a "near danger" threshold (in reais) to flag projections that get
 * close to zero without crossing it.
 *
 * Input and output are in reais.
 *
 * Designed to scale with the user's balance while staying within sane bounds.
 */
export function calculateNearDangerThreshold(startingBalanceReais: number): number {
  const scaled = Math.abs(startingBalanceReais) * NEAR_DANGER_STARTING_RATIO
  return Math.min(
    NEAR_DANGER_THRESHOLD_MAX_REAIS,
    Math.max(NEAR_DANGER_THRESHOLD_MIN_REAIS, scaled)
  )
}

/**
 * Calculate health status from danger day counts.
 * Exported for unit testing.
 */
export function calculateHealthStatus(
  optimisticDangerDays: number,
  pessimisticDangerDays: number,
  options?: {
    /** True when projection does not cross 0, but minimum balance is close to it */
    isNearDanger?: boolean
    /** True when any account/card data is stale (>30 days) */
    isStale?: boolean
  }
): HealthStatus {
  if (optimisticDangerDays > 0) return 'danger'
  if (pessimisticDangerDays > 0) return 'warning'
  if (options?.isNearDanger || options?.isStale) return 'caution'
  return 'good'
}

/**
 * Generate human-readable message for health status.
 * Exported for unit testing.
 */
export function getHealthMessage(
  status: HealthStatus,
  optimisticDangerDays: number,
  pessimisticDangerDays: number,
  options?: {
    /** Minimum balance in dollars (pessimistic scenario) */
    minBalance?: number
    /** Date when minimum balance occurs */
    minBalanceDate?: Date
    /** Count of stale entities */
    staleCount?: number
  }
): string {
  switch (status) {
    case 'danger':
      return `${optimisticDangerDays} ${optimisticDangerDays !== 1 ? 'dias de perigo' : 'dia de perigo'} mesmo no melhor cenário`
    case 'warning':
      return `${pessimisticDangerDays} ${pessimisticDangerDays !== 1 ? 'dias de perigo' : 'dia de perigo'} no pior cenário`
    case 'caution': {
      // Prefer the most actionable reason in the message (near danger), while the UI
      // can still show the stale badge CTA when applicable.
      if (typeof options?.minBalance === 'number' && options.minBalanceDate) {
        return `Saldo projetado próximo de zero no pior cenário (mínimo: ${formatCurrency(Math.round(options.minBalance * 100))} em ${formatDayMonth(options.minBalanceDate)})`
      }

      if (typeof options?.staleCount === 'number' && options.staleCount > 0) {
        return `${options.staleCount} ${options.staleCount !== 1 ? 'itens' : 'item'} com saldo desatualizado`
      }

      return 'Atenção necessária'
    }
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
    const staleCount = staleEntities.length

    const pessimisticMinBalance = summaryStats.pessimistic.minBalance
    const nearDangerThreshold = calculateNearDangerThreshold(summaryStats.startingBalance)
    const isNearDanger =
      pessimisticMinBalance >= 0 && pessimisticMinBalance <= nearDangerThreshold

    const status = calculateHealthStatus(optimisticDangerDays, pessimisticDangerDays, {
      isNearDanger,
      isStale: staleCount > 0,
    })
    const message = getHealthMessage(status, optimisticDangerDays, pessimisticDangerDays, {
      minBalance: isNearDanger ? pessimisticMinBalance : undefined,
      minBalanceDate: isNearDanger ? summaryStats.pessimistic.minBalanceDate : undefined,
      staleCount,
    })

    return {
      status,
      message,
      isStale: staleCount > 0,
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
