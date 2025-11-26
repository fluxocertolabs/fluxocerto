/**
 * View-layer types for Cashflow Dashboard components.
 * These types are used for chart rendering and UI display.
 */

import type { DailySnapshot } from '@/lib/cashflow/types'

/**
 * Data point for Recharts AreaChart.
 * Transforms DailySnapshot into chart-compatible format.
 */
export interface ChartDataPoint {
  /** Formatted date string for X-axis display (e.g., "Nov 26") */
  date: string
  /** Unix timestamp for sorting/comparison */
  timestamp: number
  /** Optimistic balance in dollars (for chart scale) */
  optimisticBalance: number
  /** Pessimistic balance in dollars (for chart scale) */
  pessimisticBalance: number
  /** Whether optimistic scenario is in danger */
  isOptimisticDanger: boolean
  /** Whether pessimistic scenario is in danger */
  isPessimisticDanger: boolean
  /** Reference to full snapshot for tooltip */
  snapshot: DailySnapshot
}

/**
 * Represents a continuous range of danger days for ReferenceArea rendering.
 */
export interface DangerRange {
  /** Start date string (matches ChartDataPoint.date) */
  start: string
  /** End date string (matches ChartDataPoint.date) */
  end: string
  /** Which scenario has danger in this range */
  scenario: 'optimistic' | 'pessimistic' | 'both'
}

/**
 * Summary statistics for the dashboard summary panel.
 * All monetary values are in dollars (converted from cents).
 */
export interface SummaryStats {
  /** Starting balance in dollars */
  startingBalance: number
  /** Optimistic scenario totals */
  optimistic: {
    totalIncome: number
    totalExpenses: number
    endBalance: number
    dangerDayCount: number
    /** Surplus (positive) or deficit (negative): endBalance - startingBalance */
    surplus: number
  }
  /** Pessimistic scenario totals */
  pessimistic: {
    totalIncome: number
    totalExpenses: number
    endBalance: number
    dangerDayCount: number
    /** Surplus (positive) or deficit (negative): endBalance - startingBalance */
    surplus: number
  }
}

