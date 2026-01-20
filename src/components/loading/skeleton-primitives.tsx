/**
 * Skeleton primitive components for building page-specific loading skeletons.
 * Provides reusable building blocks with consistent styling and shimmer animations.
 */

import { cn } from '@/lib/utils'
import type { SkeletonLineProps } from '@/types/loading'

/**
 * Skeleton text line for simulating text content.
 * Commonly used for labels, titles, and descriptions.
 */
export function SkeletonLine({ width = 'w-24', height = 'h-4', className }: SkeletonLineProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded bg-muted animate-pulse', width, height, className)}
    />
  )
}

/**
 * Skeleton summary card matching the dashboard summary panel cards.
 * Displays a label placeholder and a value placeholder.
 */
export function SkeletonSummaryCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        'animate-pulse',
        className
      )}
    >
      <SkeletonLine width="w-20" height="h-4" className="mb-2" />
      <SkeletonLine width="w-28" height="h-8" />
    </div>
  )
}

/**
 * Skeleton chart area with shimmer effect.
 * Matches the dashboard chart container dimensions.
 */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        'animate-pulse',
        className
      )}
    >
      {/* Chart title placeholder */}
      <SkeletonLine width="w-48" height="h-6" className="mb-4" />

      {/* Chart area placeholder with shimmer */}
      <div className="h-[300px] md:h-[400px] rounded-lg bg-muted relative overflow-hidden">
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
        />
      </div>

      {/* X-axis labels placeholder */}
      <div className="flex justify-between mt-4">
        {[...Array(7)].map((_, i) => (
          <SkeletonLine key={i} width="w-10" height="h-4" />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton list item for entity lists (accounts, expenses, etc.).
 * Matches the manage page list item structure.
 */
export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        'animate-pulse',
        'flex items-center justify-between',
        className
      )}
    >
      <div className="space-y-2">
        <SkeletonLine width="w-32" height="h-5" />
        <SkeletonLine width="w-20" height="h-4" />
      </div>
      <SkeletonLine width="w-24" height="h-8" />
    </div>
  )
}

/**
 * Skeleton tabs matching the manage page tab bar.
 */
export function SkeletonTabs({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse', className)}
    >
      <div className="w-full max-w-full overflow-x-auto">
        <div className="flex gap-2 p-1 rounded-lg bg-muted/50 w-max min-w-full">
          {[...Array(5)].map((_, i) => (
            <SkeletonLine key={i} width="w-20" height="h-9" className="rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton balance item for quick update modal.
 * Matches the balance list item structure.
 */
export function SkeletonBalanceItem({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-20 rounded-lg border border-border bg-card',
        'animate-pulse',
        className
      )}
    />
  )
}

