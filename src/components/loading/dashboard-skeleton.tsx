/**
 * Dashboard-specific skeleton component.
 * Matches the exact layout of the Dashboard page including:
 * - Health indicator bar
 * - Summary panel (4 cards grid)
 * - Cashflow chart with shimmer effect
 */

import { cn } from '@/lib/utils'
import { SkeletonSummaryCard, SkeletonChart, SkeletonLine } from './skeleton-primitives'
import type { PageSkeletonProps } from '@/types/loading'

/**
 * Skeleton for the health indicator bar at the top of the dashboard.
 */
function HealthIndicatorSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        'animate-pulse',
        'flex items-center gap-3'
      )}
    >
      {/* Status icon placeholder */}
      <div className="h-5 w-5 rounded-full bg-muted" />
      {/* Message placeholder */}
      <SkeletonLine width="w-48" height="h-5" />
    </div>
  )
}

/**
 * Dashboard skeleton matching the full dashboard layout.
 * Provides visual placeholders for all dashboard components.
 */
export function DashboardSkeleton({ className }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn('space-y-6', className)}
    >
      {/* Screen reader text */}
      <span className="sr-only">Carregando painel de fluxo de caixa...</span>

      {/* Health indicator skeleton */}
      <HealthIndicatorSkeleton />

      {/* Summary panel skeleton - 4 cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
      </div>

      {/* Chart skeleton with shimmer effect */}
      <SkeletonChart />
    </div>
  )
}

