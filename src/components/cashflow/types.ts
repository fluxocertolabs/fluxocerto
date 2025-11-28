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
  /** Investment-inclusive balance in dollars (optimistic + investment total) */
  investmentInclusiveBalance: number
  /** Whether optimistic scenario is in danger */
  isOptimisticDanger: boolean
  /** Whether pessimistic scenario is in danger */
  isPessimisticDanger: boolean
  /** Reference to full snapshot for tooltip */
  snapshot: DailySnapshot
}

/**
 * Visibility state for chart elements.
 * Used for interactive legend toggle functionality.
 * Session-only state (not persisted).
 */
export interface LineVisibility {
  /** Optimistic scenario line + area */
  optimistic: boolean
  /** Pessimistic scenario line + area */
  pessimistic: boolean
  /** Investment-inclusive balance line */
  investmentInclusive: boolean
  /** Danger zone reference areas + zero line */
  dangerZone: boolean
}

/**
 * Default visibility state - all elements visible.
 */
export const DEFAULT_LINE_VISIBILITY: LineVisibility = {
  optimistic: true,
  pessimistic: true,
  investmentInclusive: true,
  dangerZone: true,
}

/**
 * Legend item configuration for rendering.
 */
export interface LegendItem {
  /** Unique key matching LineVisibility property */
  key: keyof LineVisibility
  /** Display label in Portuguese */
  label: string
  /** Color for legend indicator */
  color: string
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

